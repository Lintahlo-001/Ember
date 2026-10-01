import { pool } from './db';

type Entry = { label: string; lower: string };

let names: Entry[] = [];
let artists: Entry[] = [];
let loadedAt = 0;
let loading: Promise<void> | null = null;
const TTL_MS = 60 * 60 * 1000;

const toEntries = (rows: { label: string }[]): Entry[] =>
  rows
    .map((r) => ({ label: r.label, lower: r.label.toLowerCase() }))
    .sort((a, b) => a.label.length - b.label.length || a.label.localeCompare(b.label));

async function load(): Promise<void> {
  const [n, a] = await Promise.all([
    pool.query('SELECT DISTINCT name AS label FROM catalog.cards'),
    pool.query('SELECT DISTINCT illustrator AS label FROM catalog.cards WHERE illustrator IS NOT NULL'),
  ]);
  names = toEntries(n.rows);
  artists = toEntries(a.rows);
  loadedAt = Date.now();
}

export async function ensureLoaded(): Promise<void> {
  const stale = Date.now() - loadedAt > TTL_MS;
  if (loadedAt > 0 && !stale) return;
  loading ??= load().finally(() => {
    loading = null;
  });
  if (loadedAt === 0) await loading;
}

function pick(list: Entry[], q: string, limit: number): string[] {
  const starts: string[] = [];
  const contains: string[] = [];
  for (const e of list) {
    const i = e.lower.indexOf(q);
    if (i === 0) starts.push(e.label);
    else if (i > 0 && contains.length < limit) contains.push(e.label);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

export function suggest(q: string): { label: string; kind: 'card' | 'artist' }[] {
  const needle = q.toLowerCase();
  return [
    ...pick(names, needle, 6).map((label) => ({ label, kind: 'card' as const })),
    ...pick(artists, needle, 3).map((label) => ({ label, kind: 'artist' as const })),
  ];
}