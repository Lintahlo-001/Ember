// One-off, safe to re-run: `npm run seed:species`
// Fills catalog.pokemon_species from PokeAPI (~1,025 requests, concurrency 5).
// Name = English entry in `names`; description = LAST English flavor text
// (PokeAPI lists entries oldest to newest). Species with no English text get NULL.
import { pool } from '../db';

const API = 'https://pokeapi.co/api/v2';
const CONCURRENCY = 5;
const BATCH = 100;
const MAX_ID = 9999;

type SpeciesJson = {
  id: number;
  name: string;
  names: { name: string; language: { name: string } }[];
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
};

type Row = { id: number; name: string; slug: string; description: string | null };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(url: string, tries = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      if (i >= tries) throw err;
      await sleep(500 * 2 ** i);
    }
  }
}

const clean = (s: string) =>
  s
    .replace(/\u00ad/g, '')
    .replace(/[\f\n\r]+/g, ' ')
    .replace(/POKéMON/g, 'Pokémon')
    .replace(/\s+/g, ' ')
    .trim();

const titleFromSlug = (slug: string) =>
  slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

function toRow(s: SpeciesJson): Row | null {
  if (!Number.isInteger(s.id) || s.id < 1 || s.id > MAX_ID) return null;
  if (typeof s.name !== 'string' || !/^[a-z0-9-]{1,60}$/.test(s.name)) return null;

  const en = s.names?.find((n) => n.language.name === 'en')?.name;
  const name = (en ? clean(en) : titleFromSlug(s.name)).slice(0, 100);

  const entries = (s.flavor_text_entries ?? []).filter((e) => e.language.name === 'en');
  const last = entries[entries.length - 1]?.flavor_text;
  const description = last ? clean(last).slice(0, 1000) || null : null;

  return { id: s.id, name, slug: s.name, description };
}

async function upsert(rows: Row[]) {
  await pool.query(
    `INSERT INTO catalog.pokemon_species (dex_id, name, slug, description, synced_at)
     SELECT u.dex_id, u.name, u.slug, u.description, now()
     FROM unnest($1::int[], $2::text[], $3::text[], $4::text[]) AS u(dex_id, name, slug, description)
     ON CONFLICT (dex_id) DO UPDATE SET
       name = EXCLUDED.name, slug = EXCLUDED.slug,
       description = EXCLUDED.description, synced_at = now()`,
    [rows.map((r) => r.id), rows.map((r) => r.name), rows.map((r) => r.slug), rows.map((r) => r.description)],
  );
}

async function main() {
  const list = await getJson<{ results: { name: string; url: string }[] }>(`${API}/pokemon-species?limit=2000`);
  const ids = list.results
    .map((r) => Number(/\/pokemon-species\/(\d+)\/?$/.exec(r.url)?.[1]))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= MAX_ID)
    .sort((a, b) => a - b);
  console.log(`${ids.length} species to fetch`);

  let done = 0, failed = 0, skipped = 0, noText = 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch: Row[] = [];
    const part = ids.slice(i, i + BATCH);
    for (let j = 0; j < part.length; j += CONCURRENCY) {
      const results = await Promise.allSettled(
        part.slice(j, j + CONCURRENCY).map((id) => getJson<SpeciesJson>(`${API}/pokemon-species/${id}`)),
      );
      results.forEach((r, k) => {
        if (r.status === 'rejected') {
          failed++;
          console.error(`species ${part[j + k]} failed:`, (r.reason as Error).message);
          return;
        }
        const row = toRow(r.value);
        if (!row) { skipped++; return; }
        if (!row.description) noText++;
        batch.push(row);
      });
    }
    if (batch.length) await upsert(batch);
    done += batch.length;
    console.log(`species: ${done} saved, ${failed} failed, ${skipped} skipped`);
  }
  console.log(`Done. ${noText} species have no English description.`);
  if (failed) process.exitCode = 1;
}

main()
  .catch((err) => { console.error('Seed failed:', err); process.exitCode = 1; })
  .finally(() => pool.end());