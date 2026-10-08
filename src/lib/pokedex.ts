import type { Region, Species } from '@/src/lib/api';
import type { SortDir } from '@/src/lib/cardList';
import { getDb } from '@/src/lib/db';
import { ensureInitialPull } from '@/src/lib/sync';
import { currentUser } from '@/src/lib/userScope';

export const DIM_UNOWNED_POKEMON = false;
// TODO (Settings group): read this from a saved user preference.
// Until then every Pokémon renders undimmed, owned or not.

export type DexSortKey = 'number' | 'name';
export const DEX_SORT_LABELS: Record<DexSortKey, string> = { number: 'Number', name: 'Name' };

export const formatDexNumber = (n: number) => `#${String(n).padStart(4, '0')}`;

export async function fetchOwnedDex(): Promise<Map<number, number>> {
  const uid = await currentUser();
  await ensureInitialPull();
  const db = await getDb();
  const rows = await db.getAllAsync<{ dex_id: number; n: number }>(
    `SELECT d.dex_id AS dex_id, COUNT(DISTINCT o.card_id) AS n
     FROM card_dex d JOIN ownership_entries o ON o.card_id = d.card_id
     WHERE o.user_id = ?
     GROUP BY d.dex_id`,
    [uid],
  );
  return new Map(rows.map((r) => [r.dex_id, r.n]));
}

export const inRegion = (list: Species[], region: Region | null): Species[] =>
  region ? list.filter((s) => s.dex_id >= region.dex_start && s.dex_id <= region.dex_end) : list;

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const collator = new Intl.Collator(undefined, { sensitivity: 'base' });

export function filterAndSort(list: Species[], needle: string, key: DexSortKey, dir: SortDir): Species[] {
  const q = fold(needle.trim()).replace(/^#/, '');
  const numeric = /^\d+$/.test(q);
  const filtered = !q
    ? list
    : list.filter((s) =>
        numeric ? String(s.dex_id).padStart(4, '0').includes(q) : fold(s.name).includes(q),
      );
  const sign = dir === 'asc' ? 1 : -1;
  return [...filtered].sort((a, b) =>
    key === 'name' ? collator.compare(a.name, b.name) * sign : (a.dex_id - b.dex_id) * sign,
  );
}