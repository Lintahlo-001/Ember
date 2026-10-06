import { getDb, runTx } from '@/src/lib/db';
import { insertOp, type OpRow } from '@/src/lib/outbox';
import { ensureInitialPull, kickFlush } from '@/src/lib/sync';
import { currentUser } from '@/src/lib/userScope';
import { uuid } from '@/src/lib/uuid';

export const CONDITIONS = [
  'Near Mint',
  'Lightly Played',
  'Moderately Played',
  'Heavily Played',
  'Damaged',
] as const;
export type Condition = (typeof CONDITIONS)[number];

export type EntryValues = {
  quantity: number;
  condition: Condition;
  variant: string;
  notes: string;
};

export type OwnershipEntry = EntryValues & { id: string; card_id: string };

const MAX_QTY = 9999;
const CARD_ID_RE = /^[A-Za-z0-9._-]{1,40}$/;
const VARIANT_RE = /^[A-Za-z0-9_-]{1,40}$/;
const DUP_MSG = 'You already have an entry with that variant and condition.';
const BAD_MSG = 'One of the values is not allowed.';

type Row = {
  id: string; card_id: string; variant: string; condition: string;
  quantity: number; notes: string | null; updated_at: string; sync_state: string;
};

type Bind = string | number | null;

function check(v: Partial<EntryValues>) {
  if (v.quantity !== undefined && !(Number.isInteger(v.quantity) && v.quantity >= 1 && v.quantity <= MAX_QTY)) throw new Error(BAD_MSG);
  if (v.condition !== undefined && !(CONDITIONS as readonly string[]).includes(v.condition)) throw new Error(BAD_MSG);
  if (v.variant !== undefined && !VARIANT_RE.test(v.variant)) throw new Error(BAD_MSG);
  if (v.notes !== undefined && v.notes.trim().length > 500) throw new Error(BAD_MSG);
}
const noteOrNull = (n: string | undefined) => (n === undefined ? undefined : n.trim() === '' ? null : n.trim());

const toEntry = (r: Row): OwnershipEntry => ({
  id: r.id,
  card_id: r.card_id,
  variant: r.variant,
  condition: r.condition as Condition,
  quantity: r.quantity,
  notes: r.notes ?? '',
});

/* ---------- reads (local) ---------- */

export async function fetchOwnedTotals(cardIds: string[]): Promise<Map<string, number>> {
  const uid = await currentUser();
  await ensureInitialPull();
  const db = await getDb();
  const totals = new Map<string, number>();
  for (let i = 0; i < cardIds.length; i += 400) {
    const part = cardIds.slice(i, i + 400);
    const rows = await db.getAllAsync<{ card_id: string; q: number }>(
      `SELECT card_id, SUM(quantity) AS q FROM ownership_entries
       WHERE user_id = ? AND card_id IN (${part.map(() => '?').join(',')}) GROUP BY card_id`,
      [uid, ...part],
    );
    for (const r of rows) totals.set(r.card_id, r.q);
  }
  return totals;
}

export async function fetchAllOwned(): Promise<Map<string, number>> {
  const uid = await currentUser();
  await ensureInitialPull();
  const db = await getDb();
  const rows = await db.getAllAsync<{ card_id: string; q: number }>(
    'SELECT card_id, SUM(quantity) AS q FROM ownership_entries WHERE user_id = ? GROUP BY card_id',
    [uid],
  );
  return new Map(rows.map((r) => [r.card_id, r.q]));
}

export async function fetchEntries(cardId: string): Promise<OwnershipEntry[]> {
  const uid = await currentUser();
  await ensureInitialPull();
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM ownership_entries WHERE user_id = ? AND card_id = ? ORDER BY rowid',
    [uid, cardId],
  );
  return rows.map(toEntry);
}

export async function fetchEntry(entryId: string): Promise<OwnershipEntry> {
  const uid = await currentUser();
  const db = await getDb();
  const row = await db.getFirstAsync<Row>('SELECT * FROM ownership_entries WHERE id = ? AND user_id = ?', [entryId, uid]);
  if (!row) throw new Error('This entry no longer exists.');
  return toEntry(row);
}

/* ---------- writes (local first, then outbox) ---------- */

export async function addEntry(cardId: string, v: EntryValues): Promise<void> {
  if (!CARD_ID_RE.test(cardId)) throw new Error(BAD_MSG);
  check(v);
  const uid = await currentUser();
  await ensureInitialPull();
  const notes = noteOrNull(v.notes) ?? null;

  await runTx(async (tx) => {
    const ts = new Date().toISOString();
    const existing = await tx.getFirstAsync<Row>(
      'SELECT * FROM ownership_entries WHERE user_id = ? AND card_id = ? AND variant = ? AND condition = ?',
      [uid, cardId, v.variant, v.condition],
    );
    if (existing) {
      await tx.runAsync(
        "UPDATE ownership_entries SET quantity = ?, notes = ?, updated_at = ?, sync_state = 'pending' WHERE id = ?",
        [Math.min(existing.quantity + v.quantity, MAX_QTY), notes ?? existing.notes, ts, existing.id],
      );
      await insertOp(tx, uid, 'own_add', existing.id, {
        entryId: existing.id, cardId, variant: v.variant, condition: v.condition,
        quantity: v.quantity, notes, fresh: false,
      });
    } else {
      const id = uuid();
      await tx.runAsync(
        `INSERT INTO ownership_entries (id, user_id, card_id, variant, condition, quantity, notes, updated_at, sync_state)
         VALUES (?,?,?,?,?,?,?,?, 'pending')`,
        [id, uid, cardId, v.variant, v.condition, v.quantity, notes, ts],
      );
      await insertOp(tx, uid, 'own_add', id, {
        entryId: id, cardId, variant: v.variant, condition: v.condition,
        quantity: v.quantity, notes, fresh: true,
      });
    }
  });
  kickFlush();
}

export async function updateEntry(entryId: string, patch: Partial<EntryValues>): Promise<void> {
  check(patch);
  const uid = await currentUser();

  const clean: Record<string, Bind> = {};
  if (patch.quantity !== undefined) clean.quantity = patch.quantity;
  if (patch.condition !== undefined) clean.condition = patch.condition;
  if (patch.variant !== undefined) clean.variant = patch.variant;
  if (patch.notes !== undefined) clean.notes = noteOrNull(patch.notes) ?? null;
  const cols = Object.keys(clean);
  if (cols.length === 0) return;

  await runTx(async (tx) => {
    const row = await tx.getFirstAsync<Row>('SELECT * FROM ownership_entries WHERE id = ? AND user_id = ?', [entryId, uid]);
    if (!row) throw new Error('This entry no longer exists.');

    const variant = (clean.variant as string | undefined) ?? row.variant;
    const condition = (clean.condition as string | undefined) ?? row.condition;
    if (variant !== row.variant || condition !== row.condition) {
      const dup = await tx.getFirstAsync(
        'SELECT id FROM ownership_entries WHERE user_id = ? AND card_id = ? AND variant = ? AND condition = ? AND id != ?',
        [uid, row.card_id, variant, condition, entryId],
      );
      if (dup) throw new Error(DUP_MSG);
    }

    await tx.runAsync(
      `UPDATE ownership_entries SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = ?, sync_state = 'pending' WHERE id = ?`,
      [...cols.map((c) => clean[c]), new Date().toISOString(), entryId],
    );

    const add = await tx.getFirstAsync<OpRow>(
      "SELECT * FROM outbox WHERE user_id = ? AND kind = 'own_add' AND entity_key = ? AND status = 'pending' AND attempts = 0",
      [uid, entryId],
    );
    const addPayload = add ? JSON.parse(add.payload) : null;
    if (add && addPayload.fresh) {
      await tx.runAsync('UPDATE outbox SET payload = ? WHERE seq = ?', [JSON.stringify({ ...addPayload, ...clean }), add.seq]);
      return;
    }

    const upd = await tx.getFirstAsync<OpRow>(
      "SELECT * FROM outbox WHERE user_id = ? AND kind = 'own_update' AND entity_key = ? AND status = 'pending'",
      [uid, entryId],
    );
    if (upd) {
      const old = JSON.parse(upd.payload);
      await tx.runAsync('UPDATE outbox SET payload = ? WHERE seq = ?', [
        JSON.stringify({ cardId: old.cardId, patch: { ...old.patch, ...clean } }),
        upd.seq,
      ]);
    } else {
      await insertOp(tx, uid, 'own_update', entryId, { cardId: row.card_id, patch: clean });
    }
  });
  kickFlush();
}

export async function deleteEntry(entryId: string): Promise<void> {
  const uid = await currentUser();

  await runTx(async (tx) => {
    const row = await tx.getFirstAsync<Row>('SELECT * FROM ownership_entries WHERE id = ? AND user_id = ?', [entryId, uid]);
    if (!row) return; 
    await tx.runAsync('DELETE FROM ownership_entries WHERE id = ?', [entryId]);

    await tx.runAsync("DELETE FROM outbox WHERE user_id = ? AND kind = 'own_update' AND entity_key = ? AND status = 'pending'", [uid, entryId]);
    const add = await tx.getFirstAsync<OpRow>(
      "SELECT * FROM outbox WHERE user_id = ? AND kind = 'own_add' AND entity_key = ? AND status = 'pending' AND attempts = 0",
      [uid, entryId],
    );
    if (add) {
      await tx.runAsync('DELETE FROM outbox WHERE seq = ?', [add.seq]);
      if (JSON.parse(add.payload).fresh) return; 
    }
    const del = await tx.getFirstAsync(
      "SELECT 1 AS x FROM outbox WHERE user_id = ? AND kind = 'own_delete' AND entity_key = ? AND status = 'pending'",
      [uid, entryId],
    );
    if (!del) await insertOp(tx, uid, 'own_delete', entryId, { cardId: row.card_id });
  });
  kickFlush();
}