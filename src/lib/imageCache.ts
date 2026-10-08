import { getDb, getMeta, runTx, setMeta, withRetry } from '@/src/lib/db';
import { Directory, File, Paths } from 'expo-file-system';
import { AppState } from 'react-native';

export type ImageKind = 'card' | 'logo' | 'symbol' | 'rarity' | 'pokemon' | 'misc';

const UNPINNED_CAP_BYTES = 300 * 1024 * 1024;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_CONCURRENT = 4;
const EVICT_EVERY = 20;
const SWEEP_META = 'image_orphan_sweep_at';
const MISS_TTL_MS = 7 * 86_400_000;

const dir = new Directory(Paths.document, 'images');

type Entry = { uri: string; kind: ImageKind; fileName: string };
const index = new Map<string, Entry>();
const touched = new Set<string>();
const inflight = new Map<string, Promise<void>>();
const missed = new Set<string>();
let baseUri = '';
let initPromise: Promise<void> | null = null;
let unpinnedDownloads = 0;

/* ---------- helpers ---------- */

const chunk = <T,>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};
const ph = (n: number) => Array(n).fill('?').join(',');

function hash(str: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
const extOf = (url: string) => /\.(webp|png|jpe?g)(?=$|\?)/i.exec(url)?.[1]?.toLowerCase() ?? 'img';
const fileNameFor = (url: string, kind: ImageKind) => `${kind}-${hash(url)}.${extOf(url)}`;

function ensureDir() {
  if (!dir.exists) dir.create();
}

let active = 0;
const waiting: (() => void)[] = [];
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((r) => waiting.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

/* ---------- startup ---------- */

async function load(): Promise<void> {
  ensureDir();
  baseUri = new File(dir, 'x').uri.slice(0, -1);
  const db = await getDb();
  const rows = await db.getAllAsync<{ url: string; kind: ImageKind; file_name: string }>(
    'SELECT url, kind, file_name FROM image_files',
  );
  for (const r of rows) index.set(r.url, { uri: baseUri + r.file_name, kind: r.kind, fileName: r.file_name });
  
  await db.runAsync('DELETE FROM image_misses WHERE checked_at < ?', [
    new Date(Date.now() - MISS_TTL_MS).toISOString(),
  ]);
  for (const m of await db.getAllAsync<{ url: string }>('SELECT url FROM image_misses')) missed.add(m.url);

  AppState.addEventListener('change', (s) => {
    if (s !== 'active') flushTouches().catch(() => {});
  });
  setTimeout(() => sweepOrphans().catch(() => {}), 20_000);
}

function init(): Promise<void> {
  initPromise ??= load().catch((err) => {
    initPromise = null;
    throw err;
  });
  return initPromise;
}


async function sweepOrphans(): Promise<void> {
  const last = await getMeta(SWEEP_META);
  if (last && Date.now() - Date.parse(last) < 7 * 86_400_000) return;
  if (inflight.size > 0) return;
  const entries = dir.list();
  const known = new Set([...index.values()].map((e) => e.fileName));
  for (const e of entries) {
    if (e instanceof File && !known.has(e.name)) {
      try { e.delete(); } catch {}
    }
  }
  await setMeta(SWEEP_META, new Date().toISOString());
}

/* ---------- reads ---------- */

function localUri(url: string): string | null {
  const e = index.get(url);
  if (!e) return null;
  touched.add(url);
  return e.uri;
}

async function flushTouches(): Promise<void> {
  if (touched.size === 0) return;
  const urls = [...touched];
  touched.clear();
  const db = await getDb();
  const now = new Date().toISOString();
  await runTx(async (tx) => {
    for (const part of chunk(urls, 500)) {
      await tx.runAsync(`UPDATE image_files SET last_used = ? WHERE url IN (${ph(part.length)})`, [now, ...part]);
    }
  });
}

/* ---------- writes ---------- */

async function removeEntry(url: string, fileName: string): Promise<void> {
  index.delete(url);
  touched.delete(url);
  const db = await getDb();
  await db.runAsync('DELETE FROM image_files WHERE url = ?', [url]);
  try {
    const f = new File(dir, fileName);
    if (f.exists) f.delete();
  } catch {}
}

async function recordMiss(url: string): Promise<void> {
  missed.add(url);
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO image_misses (url, status, checked_at) VALUES (?, 404, ?)
     ON CONFLICT(url) DO UPDATE SET checked_at = excluded.checked_at`,
    [url, new Date().toISOString()],
  );
}

const isMissing = (url: string) => missed.has(url);

async function download(url: string, kind: ImageKind, pin: boolean): Promise<void> {
  ensureDir();
  const fileName = fileNameFor(url, kind);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (res.status === 404) {
      await recordMiss(url);
      throw new Error('HTTP 404');
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!(res.headers.get('content-type') ?? '').startsWith('image/')) throw new Error('Not an image');
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_FILE_BYTES) throw new Error('Bad image size');

    const file = new File(dir, fileName);
    try {
      if (file.exists) file.delete();
      await file.write(bytes);
      const db = await getDb();
      await withRetry(() =>
        db.runAsync(
          `INSERT INTO image_files (url, kind, file_name, bytes, pinned, last_used)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(url) DO UPDATE SET
            kind = excluded.kind,
            file_name = excluded.file_name,
            bytes = excluded.bytes,
            pinned = excluded.pinned,
            last_used = excluded.last_used`,
          [url, kind, fileName, bytes.byteLength, pin ? 1 : 0, new Date().toISOString()],
        ),
      );
    } catch (err) {
      try { if (file.exists) file.delete(); } catch {}
      throw err;
    }
    index.set(url, { uri: baseUri + fileName, kind, fileName });

    if (!pin && ++unpinnedDownloads % EVICT_EVERY === 0) evictIfNeeded().catch(() => {});
  } finally {
    clearTimeout(timer);
  }
}

function ensure(url: string, kind: ImageKind, pin = false): Promise<void> {
  if (!url.startsWith('https://')) return Promise.reject(new Error('Only https images are cached'));
  if (index.has(url)) return Promise.resolve();
  if (missed.has(url)) return Promise.reject(new Error('HTTP 404 (known missing)'));
  const running = inflight.get(url);
  if (running) return running;
  const p = slot(() => download(url, kind, pin)).finally(() => inflight.delete(url));
  inflight.set(url, p);
  return p;
}

function cacheOnView(url: string, kind: ImageKind): void {
  ensure(url, kind, false).catch(() => {});
}

async function invalidate(url: string): Promise<void> {
  const e = index.get(url);
  if (e) await removeEntry(url, e.fileName);
}

async function evictIfNeeded(): Promise<void> {
  await flushTouches();
  const db = await getDb();
  const sum = () =>
    db.getFirstAsync<{ total: number }>('SELECT COALESCE(SUM(bytes),0) AS total FROM image_files WHERE pinned = 0');
  let total = (await sum())?.total ?? 0;
  if (total <= UNPINNED_CAP_BYTES) return;

  const target = UNPINNED_CAP_BYTES * 0.9;
  while (total > target) {
    const victims = await db.getAllAsync<{ url: string; file_name: string; bytes: number }>(
      'SELECT url, file_name, bytes FROM image_files WHERE pinned = 0 ORDER BY last_used ASC LIMIT 200',
    );
    if (victims.length === 0) break;
    for (const v of victims) {
      if (total <= target) break;
      await removeEntry(v.url, v.file_name);
      total -= v.bytes;
    }
  }
}

/* ---------- pinned set: owned + wishlisted cards, every set logo/symbol, rarity icons ---------- */

type SyncResult = {
  wanted: number;
  downloaded: number;
  failed: number;
  skipped: number;
  reasons: Record<string, { count: number; sample: string }>;
};

async function runSync(cardIds: string[], ownedIds: string[] = []): Promise<SyncResult> {
  await init();
  const db = await getDb();
  const wanted = new Map<string, ImageKind>();

  for (const s of await db.getAllAsync<{ logo_url: string | null; symbol_url: string | null }>(
    'SELECT logo_url, symbol_url FROM sets',
  )) {
    if (s.logo_url) wanted.set(s.logo_url, 'logo');
    if (s.symbol_url) wanted.set(s.symbol_url, 'symbol');
  }
  for (const r of await db.getAllAsync<{ icon_url: string }>('SELECT icon_url FROM rarities')) {
    wanted.set(r.icon_url, 'rarity');
  }
  for (const part of chunk([...new Set(cardIds)], 500)) {
    const rows = await db.getAllAsync<{ image_url: string | null }>(
      `SELECT image_url FROM cards WHERE id IN (${ph(part.length)})`,
      part,
    );
    for (const r of rows) if (r.image_url) wanted.set(r.image_url, 'card');
  }

  for (const part of chunk([...new Set(ownedIds)], 500)) {
    const rows = await db.getAllAsync<{ image_url: string }>(
      `SELECT DISTINCT s.image_url FROM species s JOIN card_dex d ON d.dex_id = s.dex_id
       WHERE d.card_id IN (${ph(part.length)})`,
      part,
    );
    for (const r of rows) wanted.set(r.image_url, 'pokemon');
  }

  const urls = [...wanted.keys()];
  await runTx(async (tx) => {
    await tx.runAsync('UPDATE image_files SET pinned = 0 WHERE pinned = 1');
    for (const part of chunk(urls, 500)) {
      await tx.runAsync(`UPDATE image_files SET pinned = 1 WHERE url IN (${ph(part.length)})`, part);
    }
  });

  const stale = await db.getAllAsync<{ url: string; file_name: string }>(
    "SELECT url, file_name FROM image_files WHERE pinned = 0 AND kind IN ('logo','symbol','rarity')",
  );
  for (const s of stale) await removeEntry(s.url, s.file_name);

  let downloaded = 0, failed = 0;
  const reasons: SyncResult['reasons'] = {};
  const todo = urls.filter((u) => !index.has(u) && !missed.has(u));
  const skipped = urls.filter((u) => !index.has(u) && missed.has(u)).length;
  await Promise.all(
    todo.map((u) =>
      ensure(u, wanted.get(u)!, true).then(
        () => void downloaded++,
        (err) => {
          failed++;
          const r = (reasons[(err as Error).message || 'unknown'] ??= { count: 0, sample: u });
          r.count++;
        },
      ),
    ),
  );
  await evictIfNeeded();
  return { wanted: urls.length, downloaded, failed, skipped, reasons };
}

let chain: Promise<unknown> = Promise.resolve();
function syncPinned(cardIds: string[], ownedIds: string[] = []): Promise<SyncResult> {
  const next = chain.then(() => runSync(cardIds, ownedIds));
  chain = next.catch(() => {});
  return next;
}

/* ---------- for Settings (step 5) ---------- */

async function stats() {
  const db = await getDb();
  return db.getFirstAsync<{ files: number; bytes: number; pinned_bytes: number }>(
    `SELECT COUNT(*) AS files, COALESCE(SUM(bytes),0) AS bytes,
            COALESCE(SUM(CASE WHEN pinned = 1 THEN bytes ELSE 0 END),0) AS pinned_bytes
     FROM image_files`,
  );
}

async function clear(): Promise<void> {
  await init();
  index.clear();
  touched.clear();
  missed.clear();
  const db = await getDb();
  await db.runAsync('DELETE FROM image_files');
  await db.runAsync('DELETE FROM image_misses');
  try {
    for (const e of dir.list()) {
      try { e.delete(); } catch {}
    }
  } catch {}
}

export const imageCache = { init, localUri, isMissing, cacheOnView, ensure, invalidate, syncPinned, stats, clear };