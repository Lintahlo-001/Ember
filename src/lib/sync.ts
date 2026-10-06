import { getDb, getMeta, runTx, setMeta, type Tx } from '@/src/lib/db';
import type { OpRow } from '@/src/lib/outbox';
import { supabase } from '@/src/lib/supabase';
import { currentUser, getActiveUserId, getGeneration } from '@/src/lib/userScope';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

type ErrLike = { message?: string; code?: string };
type Failure = 'offline' | 'auth' | 'rejected';
type ServerEntry = {
  id: string; card_id: string; variant: string; condition: string;
  quantity: number; notes: string | null; updated_at: string;
};
type Exec = { error?: ErrLike | null; status?: number; row?: ServerEntry | null };

const COLS = 'id, card_id, variant, condition, quantity, notes, updated_at';
const FULL_PULL_EVERY_MS = 5 * 60_000;
const FAILED_KEEP_MS = 7 * 86_400_000;

const REMOTE = {
  wishlist: { table: 'wishlist_entries', col: 'card_id', local: 'wishlist' },
  favorite: { table: 'favorite_sets', col: 'set_id', local: 'favorite_sets' },
} as const;

/* ---------- error classification ---------- */

function classify(err: ErrLike, status?: number): Failure {
  const msg = err.message ?? '';
  if (status === 401 || err.code === 'PGRST301' || err.code === 'PGRST303' || /jwt|not authenticated/i.test(msg)) return 'auth';
  if (!err.code && /network|fetch|timeout|abort|connect|offline/i.test(msg)) return 'offline';
  if (status !== undefined && (status === 0 || status === 408 || status === 429 || status >= 500)) return 'offline';
  return 'rejected';
}

/* ---------- issue reporting ---------- */

let issueHandler: ((message: string) => void) | null = null;
export const setIssueHandler = (fn: ((message: string) => void) | null) => {
  issueHandler = fn;
};

/* ---------- counters ---------- */

async function count(status: string): Promise<number> {
  const uid = getActiveUserId();
  if (!uid) return 0;
  const db = await getDb();
  const r = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM outbox WHERE user_id = ? AND status = ?',
    [uid, status],
  );
  return r?.n ?? 0;
}
export const pendingCount = () => count('pending');
export const failedCount = () => count('failed');

/* ---------- local helpers (all take a Tx) ---------- */

const hasPending = async (tx: Tx, uid: string, entity: string) =>
  !!(await tx.getFirstAsync(
    "SELECT 1 AS x FROM outbox WHERE user_id = ? AND entity_key = ? AND status = 'pending' LIMIT 1",
    [uid, entity],
  ));

async function upsertServerRow(tx: Tx, uid: string, r: ServerEntry) {
  await tx.runAsync(
    'DELETE FROM ownership_entries WHERE user_id = ? AND id != ? AND card_id = ? AND variant = ? AND condition = ?',
    [uid, r.id, r.card_id, r.variant, r.condition],
  );
  await tx.runAsync(
    `INSERT INTO ownership_entries (id, user_id, card_id, variant, condition, quantity, notes, updated_at, sync_state)
     VALUES (?,?,?,?,?,?,?,?, 'synced')
     ON CONFLICT(id) DO UPDATE SET card_id = excluded.card_id, variant = excluded.variant,
       condition = excluded.condition, quantity = excluded.quantity, notes = excluded.notes,
       updated_at = excluded.updated_at, sync_state = 'synced'`,
    [r.id, uid, r.card_id, r.variant, r.condition, r.quantity, r.notes, r.updated_at],
  );
}

/* ---------- executing one op ---------- */

async function execute(op: OpRow): Promise<Exec> {
  const p = JSON.parse(op.payload);
  switch (op.kind) {
    case 'wishlist':
    case 'favorite': {
      const m = REMOTE[op.kind];
      if (p.want) {
        const row = op.kind === 'wishlist' ? { card_id: op.entity_key } : { set_id: op.entity_key };
        const { error, status } = await supabase.from(m.table).insert(row as never);
        if (error && error.code !== '23505') return { error, status };
      } else {
        const { error, status } = await supabase.from(m.table).delete().eq(m.col, op.entity_key);
        if (error) return { error, status };
      }
      return {};
    }
    case 'own_add': {
      const { data, error, status } = await supabase.rpc('add_ownership_entry', {
        p_card_id: p.cardId,
        p_variant: p.variant,
        p_condition: p.condition,
        p_quantity: p.quantity,
        p_notes: p.notes,
        p_op_id: op.op_id,
        p_entry_id: p.entryId,
      });
      if (error) return { error, status };
      const row = data as ServerEntry | null;
      return { row: row && row.id ? row : null }; 
    }
    case 'own_update': {
      const { error, status } = await supabase
        .from('ownership_entries')
        .update(p.patch)
        .eq('id', op.entity_key)
        .select('id');
      return error ? { error, status } : {};
    }
    case 'own_delete': {
      const { error, status } = await supabase.from('ownership_entries').delete().eq('id', op.entity_key);
      return error ? { error, status } : {};
    }
  }
}

async function claim(seq: number): Promise<OpRow | null> {
  let out: OpRow | null = null;
  await runTx(async (tx) => {
    const r = await tx.runAsync("UPDATE outbox SET attempts = attempts + 1 WHERE seq = ? AND status = 'pending'", [seq]);
    if (r.changes === 0) return; 
    out = await tx.getFirstAsync<OpRow>('SELECT * FROM outbox WHERE seq = ?', [seq]);
  });
  return out as OpRow | null;
}

async function ack(op: OpRow, exec: Exec, gen: number): Promise<void> {
  await runTx(async (tx) => {
    if (gen !== getGeneration()) return;
    const uid = op.user_id;

    if (op.kind === 'wishlist' || op.kind === 'favorite') {
      const want = JSON.parse(op.payload).want as boolean;
      const del = await tx.runAsync('DELETE FROM outbox WHERE seq = ? AND payload = ?', [op.seq, op.payload]);
      if (del.changes > 0 && want) {
        await tx.runAsync(`UPDATE ${REMOTE[op.kind].local} SET sync_state = 'synced' WHERE user_id = ? AND key = ?`, [uid, op.entity_key]);
      }
      return;
    }
    if (op.kind === 'own_delete') {
      await tx.runAsync('DELETE FROM outbox WHERE seq = ?', [op.seq]);
      return;
    }
    if (op.kind === 'own_update') {
      const del = await tx.runAsync('DELETE FROM outbox WHERE seq = ? AND payload = ?', [op.seq, op.payload]);
      if (del.changes > 0 && !(await hasPending(tx, uid, op.entity_key))) {
        await tx.runAsync("UPDATE ownership_entries SET sync_state = 'synced' WHERE id = ? AND user_id = ?", [op.entity_key, uid]);
      }
      return;
    }

    // own_add
    await tx.runAsync('DELETE FROM outbox WHERE seq = ?', [op.seq]);
    const p = JSON.parse(op.payload);
    const row = exec.row;
    if (!row) {
      if (!(await hasPending(tx, uid, p.entryId))) {
        await tx.runAsync('DELETE FROM ownership_entries WHERE id = ? AND user_id = ?', [p.entryId, uid]);
      }
      return;
    }
    if (row.id !== p.entryId) {
      await tx.runAsync(
        "UPDATE outbox SET entity_key = ? WHERE user_id = ? AND entity_key = ? AND kind IN ('own_update','own_delete')",
        [row.id, uid, p.entryId],
      );
      await tx.runAsync('DELETE FROM ownership_entries WHERE id = ? AND user_id = ?', [row.id, uid]);
      await tx.runAsync('UPDATE ownership_entries SET id = ? WHERE id = ? AND user_id = ?', [row.id, p.entryId, uid]);
    }
    if (!(await hasPending(tx, uid, row.id))) await upsertServerRow(tx, uid, row);
  });
}

async function failOp(op: OpRow, error: ErrLike, gen: number): Promise<void> {
  let cardId: string | null = null;
  try { cardId = JSON.parse(op.payload).cardId ?? null; } catch {}
  const isOwn = op.kind.startsWith('own_');

  await runTx(async (tx) => {
    if (gen !== getGeneration()) return;
    await tx.runAsync("UPDATE outbox SET status = 'failed', last_error = ? WHERE seq = ?", [
      (error.message ?? 'Rejected').slice(0, 300),
      op.seq,
    ]);
    if (!isOwn) return;
    await tx.runAsync(
      "UPDATE outbox SET status = 'blocked' WHERE user_id = ? AND entity_key = ? AND status = 'pending' AND seq > ? AND kind IN ('own_add','own_update','own_delete')",
      [op.user_id, op.entity_key, op.seq],
    );
    if (op.kind === 'own_add') await tx.runAsync('DELETE FROM ownership_entries WHERE id = ? AND user_id = ?', [op.entity_key, op.user_id]);
    if (op.kind === 'own_update') await tx.runAsync("UPDATE ownership_entries SET sync_state = 'synced' WHERE id = ? AND user_id = ?", [op.entity_key, op.user_id]);
  });

  if (isOwn && cardId) await reconcileCard(op.user_id, gen, cardId).catch(() => {});
  issueHandler?.(
    error.code === '23505'
      ? 'A change was undone: another copy with the same variant and condition already exists.'
      : `A change couldn't be saved and was undone. (${error.message ?? 'rejected'})`,
  );
}

/* ---------- pull ---------- */

async function fetchAll(page: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>) {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function applyOwnership(uid: string, gen: number, rows: ServerEntry[], scope: { full?: boolean; cardId?: string }) {
  await runTx(async (tx) => {
    if (gen !== getGeneration()) return;
    const busy = new Set(
      (await tx.getAllAsync<{ entity_key: string }>("SELECT entity_key FROM outbox WHERE user_id = ? AND status = 'pending'", [uid])).map((r) => r.entity_key),
    );
    for (const r of rows) {
      if (busy.has(r.id)) continue;
      const clash = await tx.getAllAsync<{ id: string; sync_state: string }>(
        'SELECT id, sync_state FROM ownership_entries WHERE user_id = ? AND (id = ? OR (card_id = ? AND variant = ? AND condition = ?))',
        [uid, r.id, r.card_id, r.variant, r.condition],
      );
      if (clash.some((c) => c.sync_state === 'pending')) continue;
      await upsertServerRow(tx, uid, r);
    }
    if (scope.full || scope.cardId) {
      const keep = new Set(rows.map((r) => r.id));
      const local = scope.cardId
        ? await tx.getAllAsync<{ id: string }>("SELECT id FROM ownership_entries WHERE user_id = ? AND card_id = ? AND sync_state = 'synced'", [uid, scope.cardId])
        : await tx.getAllAsync<{ id: string }>("SELECT id FROM ownership_entries WHERE user_id = ? AND sync_state = 'synced'", [uid]);
      for (const l of local) {
        if (!keep.has(l.id) && !busy.has(l.id)) await tx.runAsync('DELETE FROM ownership_entries WHERE id = ?', [l.id]);
      }
    }
  });
}

async function applyKeys(uid: string, gen: number, kind: 'wishlist' | 'favorite', keys: string[]) {
  const local = REMOTE[kind].local;
  await runTx(async (tx) => {
    if (gen !== getGeneration()) return;
    const busy = new Set(
      (await tx.getAllAsync<{ entity_key: string }>("SELECT entity_key FROM outbox WHERE user_id = ? AND kind = ? AND status = 'pending'", [uid, kind])).map((r) => r.entity_key),
    );
    for (const k of keys) {
      if (busy.has(k)) continue;
      await tx.runAsync(
        `INSERT INTO ${local} (user_id, key, sync_state) VALUES (?,?, 'synced')
         ON CONFLICT(user_id, key) DO UPDATE SET sync_state = 'synced'`,
        [uid, k],
      );
    }
    const have = new Set(keys);
    const rows = await tx.getAllAsync<{ key: string }>(`SELECT key FROM ${local} WHERE user_id = ? AND sync_state = 'synced'`, [uid]);
    for (const r of rows) {
      if (!have.has(r.key) && !busy.has(r.key)) await tx.runAsync(`DELETE FROM ${local} WHERE user_id = ? AND key = ?`, [uid, r.key]);
    }
  });
}

async function reconcileCard(uid: string, gen: number, cardId: string) {
  const rows = (await fetchAll((a, b) =>
    supabase.from('ownership_entries').select(COLS).eq('card_id', cardId).order('id').range(a, b),
  )) as ServerEntry[];
  await applyOwnership(uid, gen, rows, { cardId });
}

async function pull(uid: string, gen: number, full: boolean) {
  const sinceKey = `own_pull_since:${uid}`;
  const doFull = full || !(await getMeta(`pulled:${uid}`));
  const since = doFull ? null : await getMeta(sinceKey);

  const [wish, fav, own] = await Promise.all([
    fetchAll((a, b) => supabase.from('wishlist_entries').select('card_id').order('card_id').range(a, b)),
    fetchAll((a, b) => supabase.from('favorite_sets').select('set_id').order('set_id').range(a, b)),
    fetchAll((a, b) => {
      let q = supabase.from('ownership_entries').select(COLS).order('id').range(a, b);
      if (since) q = q.gte('updated_at', since);
      return q;
    }),
  ]);
  if (gen !== getGeneration()) return;

  await applyOwnership(uid, gen, own as ServerEntry[], { full: doFull });
  await applyKeys(uid, gen, 'wishlist', wish.map((r) => r.card_id));
  await applyKeys(uid, gen, 'favorite', fav.map((r) => r.set_id));

  if (own.length > 0) {
    const max = (own as ServerEntry[]).reduce((m, r) => (r.updated_at > m ? r.updated_at : m), since ?? '');
    await setMeta(sinceKey, max);
  }
  if (doFull) await setMeta(`pulled:${uid}`, new Date().toISOString());
}

/* ---------- flush ---------- */

async function flushOnce(full: boolean): Promise<void> {
  const uid = getActiveUserId();
  if (!uid) return;
  const gen = getGeneration();

  const { data } = await supabase.auth.getSession();
  if (!data.session || data.session.user.id !== uid) return;

  const db = await getDb();
  let touched = 0;
  for (let guard = 0; guard < 2000; guard++) {
    if (gen !== getGeneration()) return;
    const next = await db.getFirstAsync<OpRow>(
      "SELECT * FROM outbox WHERE user_id = ? AND status = 'pending' ORDER BY seq LIMIT 1",
      [uid],
    );
    if (!next) break;

    const op = await claim(next.seq);
    if (!op) continue;

    let exec: Exec;
    try {
      exec = await execute(op);
    } catch {
      return; 
    }
    if (exec.error) {
      if (classify(exec.error, exec.status) !== 'rejected') return;
      await failOp(op, exec.error, gen);
    } else {
      await ack(op, exec, gen);
    }
    touched++;
  }

  if (touched > 0 || full) {
    try {
      await pull(uid, gen, full);
    } catch (err) {
      if (classify(err as ErrLike) === 'rejected') console.warn('Pull failed:', (err as Error).message);
    }
  }
}

let running: Promise<void> | null = null;
let rerun = false;
let wantFull = false;
let fullInFlight = false;
let lastFull = 0;

export function flush(opts?: { full?: boolean }): Promise<void> {
  if (running) {
    if (opts?.full && !fullInFlight) wantFull = true;
    rerun = true;
    return running;
  }
  running = (async () => {
    try {
      if (opts?.full) wantFull = true;
      do {
        rerun = false;
        const full = wantFull;
        wantFull = false;
        fullInFlight = full;
        if (full) lastFull = Date.now();
        await flushOnce(full);
      } while (rerun);
    } finally {
      running = null;
      fullInFlight = false;
    }
  })();
  return running;
}

export function kickFlush(): void {
  flush().catch((err) => console.warn('Flush failed:', (err as Error).message));
}

export function requestSync(): void {
  flush({ full: Date.now() - lastFull > FULL_PULL_EVERY_MS }).catch((err) =>
    console.warn('Sync failed:', (err as Error).message),
  );
}

let pulledMemo: { uid: string; gen: number } | null = null;

export async function ensureInitialPull(): Promise<void> {
  const uid = await currentUser();
  const gen = getGeneration();
  if (pulledMemo?.uid === uid && pulledMemo.gen === gen) return;
  if (!(await getMeta(`pulled:${uid}`))) {
    await flush({ full: true }).catch(() => {});
    if (!(await getMeta(`pulled:${uid}`))) throw new Error('Could not reach the server. Check your connection.');
  }
  pulledMemo = { uid, gen };
}

let started = false;
export function startSync(): void {
  if (started) return;
  started = true;
  getDb()
    .then((db) =>
      db.runAsync("DELETE FROM outbox WHERE status IN ('failed','blocked') AND created_at < ?", [
        new Date(Date.now() - FAILED_KEEP_MS).toISOString(),
      ]),
    )
    .catch(() => {});

  NetInfo.addEventListener((s) => {
    if (s.isConnected && s.isInternetReachable !== false) kickFlush();
  });
  AppState.addEventListener('change', (s) => {
    if (s === 'active') requestSync();
  });
}