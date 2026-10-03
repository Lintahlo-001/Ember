import type { SetBrief } from '@/src/lib/api';

export const OTHER_SERIE = 'Other';
export const FAVORITES_GROUP = 'Favorites';
export type SerieGroup = { name: string; sets: SetBrief[] };
const NON_MAIN_SERIES = ['miscellaneous', 'pop', 'trainer kits', "mcdonald's collection"];
const norm = (name: string) => name.toLowerCase().replace(/[\u2018\u2019]/g, "'").trim();

function nonMainRank(name: string): number {
  if (name === OTHER_SERIE) return NON_MAIN_SERIES.length;
  return NON_MAIN_SERIES.indexOf(norm(name));
}

const firstRelease = (sets: SetBrief[]): string =>
  sets.reduce((min, s) => {
    const d = String(s.release_date ?? '');
    if (!d) return min;
    return !min || d < min ? d : min;
  }, '');

export function groupBySerie(sets: SetBrief[]): SerieGroup[] {
  const groups = new Map<string, SetBrief[]>();
  for (const s of sets) {
    const name = s.serie_name?.trim() || OTHER_SERIE;
    const list = groups.get(name);
    if (list) list.push(s);
    else groups.set(name, [s]);
  }
  return [...groups]
    .map(([name, list]) => ({ name, sets: list, first: firstRelease(list), rank: nonMainRank(name) }))
    .sort((a, b) => {
      const aMain = a.rank === -1;
      const bMain = b.rank === -1;
      if (aMain !== bMain) return aMain ? -1 : 1;
      if (!aMain) return a.rank - b.rank;
      if (!a.first && !b.first) return 0;
      if (!a.first) return 1;
      if (!b.first) return -1;
      return b.first < a.first ? -1 : b.first > a.first ? 1 : 0;
    })
    .map(({ name, sets: list }) => ({ name, sets: list }));
}

export function groupWithFavorites(sets: SetBrief[], favorites: ReadonlySet<string>): SerieGroup[] {
  const groups = groupBySerie(sets);
  const favs = sets.filter((s) => favorites.has(s.id));
  return favs.length ? [{ name: FAVORITES_GROUP, sets: favs }, ...groups] : groups;
}

export function setIdOfCard(cardId: string, known: ReadonlySet<string>): string | null {
  let id = cardId;
  for (let i = id.lastIndexOf('-'); i > 0; i = id.lastIndexOf('-')) {
    id = id.slice(0, i);
    if (known.has(id)) return id;
  }
  return null;
}

export function ownedPerSet(owned: Map<string, number>, sets: SetBrief[]): Map<string, number> {
  const known = new Set(sets.map((s) => s.id));
  const out = new Map<string, number>();
  for (const cardId of owned.keys()) {
    const setId = setIdOfCard(cardId, known);
    if (setId) out.set(setId, (out.get(setId) ?? 0) + 1);
  }
  return out;
}