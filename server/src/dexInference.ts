// Infers dex ids for Pokémon cards TCGdex gave no dexId for.
import { pool } from './db';

const TTL_MS = 60 * 60 * 1000;
const MAX_WORDS = 3;

let byKey = new Map<string, number>();
let loadedAt = 0;
let loading: Promise<void> | null = null;

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/♀/g, ' f ')
    .replace(/♂/g, ' m ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function load(): Promise<void> {
  const { rows } = await pool.query<{ dex_id: number; name: string; slug: string }>(
    'SELECT dex_id, name, slug FROM catalog.pokemon_species ORDER BY dex_id',
  );
  const map = new Map<string, number>();
  for (const r of rows) {
    for (const k of [normalize(r.name), normalize(r.slug)]) {
      if (k && !map.has(k)) map.set(k, r.dex_id);
    }
  }
  byKey = map;
  loadedAt = Date.now();
}

async function ensureSpecies(): Promise<boolean> {
  if (loadedAt > 0 && Date.now() - loadedAt < TTL_MS) return byKey.size > 0;
  loading ??= load().finally(() => {
    loading = null;
  });
  try {
    await loading;
  } catch (err) {
    console.error('Dex inference: could not load species:', (err as Error).message);
  }
  return byKey.size > 0;
}

function inferPart(part: string): number | null {
  const tokens = normalize(part).split(' ').filter(Boolean);
  for (let n = Math.min(MAX_WORDS, tokens.length); n >= 1; n--) {
    for (let i = 0; i + n <= tokens.length; i++) {
      const hit = byKey.get(tokens.slice(i, i + n).join(' '));
      if (hit !== undefined) return hit;
    }
  }
  return null;
}

export function inferDexIds(name: string): number[] {
  const ids = new Set<number>();
  for (const part of name.split(/\s+&\s+/)) {
    const id = inferPart(part);
    if (id !== null) ids.add(id);
  }
  return [...ids];
}

const isPokemon = (category: string | undefined) =>
  !!category && category.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === 'pokemon';

export async function resolveDexIds(
  given: number[],
  name: string | undefined,
  category: string | undefined,
): Promise<{ ids: number[]; inferred: boolean }> {
  if (given.length > 0) return { ids: given, inferred: false };
  if (!name || !isPokemon(category)) return { ids: [], inferred: false };
  if (!(await ensureSpecies())) return { ids: [], inferred: false };
  const ids = inferDexIds(name);
  return { ids, inferred: ids.length > 0 };
}

export { ensureSpecies };
