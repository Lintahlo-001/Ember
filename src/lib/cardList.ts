import type { CardListItem } from '@/src/lib/api';

export const DIM_UNOWNED_CARDS = false;
// TODO (Settings group): read this from a saved user preference. 
// // Until then every card renders undimmed, owned or not.

export type SortKey = 'number' | 'name' | 'price' | 'illustrator';
export type SortDir = 'asc' | 'desc';
export type OwnershipFilter = 'all' | 'owned' | 'notOwned';
export type CardFilter = { ownership: OwnershipFilter; rarities: string[] };
export const NO_FILTER: CardFilter = { ownership: 'all', rarities: [] };

export const SORT_LABELS: Record<SortKey, string> = {
  number: 'Number',
  name: 'Name',
  price: 'Price',
  illustrator: 'Illustrator',
};
export const OWNERSHIP_LABELS: Record<OwnershipFilter, string> = {
  all: 'All',
  owned: 'Owned',
  notOwned: 'Not Owned',
};

export function filterLabel(f: CardFilter): string {
  const parts: string[] = [];
  if (f.ownership !== 'all') parts.push(OWNERSHIP_LABELS[f.ownership]);
  if (f.rarities.length === 1) parts.push(f.rarities[0]);
  else if (f.rarities.length > 1) parts.push(`${f.rarities.length} rarities`);
  return parts.length ? parts.join(' · ') : 'All';
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const cmp = (a: string, b: string) => collator.compare(a, b);
const tieBreak = (a: CardListItem, b: CardListItem) => cmp(a.name, b.name) || cmp(a.id, b.id);

const RARITY_ORDER = [
  'none', 'common', 'uncommon', 'rare', 'holo rare', 'rare holo',
  'rare holo ex', 'rare holo gx', 'rare holo v', 'rare holo vmax', 'rare holo vstar',
  'double rare', 'ultra rare', 'mega attack rare', 'illustration rare', 'shiny rare', 'shiny ultra rare',
  'ace spec rare', 'special illustration rare', 'secret rare', 'hyper rare', 'mega hyper rare',
];
const RANK = new Map(RARITY_ORDER.map((r, i) => [r, i]));
const rarityRank = (r: string) => RANK.get(r.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
export const sortRarities = (list: string[]) =>
  [...list].sort((a, b) => rarityRank(a) - rarityRank(b) || cmp(a, b));

export function applyView(
  cards: CardListItem[],
  owned: Map<string, number>,
  sortKey: SortKey,
  dir: SortDir,
  filter: CardFilter,
): CardListItem[] {
  const wanted = filter.rarities.length ? new Set(filter.rarities.map((r) => r.toLowerCase())) : null;
  const filtered = cards.filter((c) => {
    if (filter.ownership === 'owned' && !owned.has(c.id)) return false;
    if (filter.ownership === 'notOwned' && owned.has(c.id)) return false;
    if (wanted && !(c.rarity && wanted.has(c.rarity.toLowerCase()))) return false;
    return true;
  });
  const sign = dir === 'asc' ? 1 : -1;

  return filtered.sort((a, b) => {
    if (sortKey === 'price' || sortKey === 'illustrator') {
      const av = sortKey === 'price' ? a.price_market : a.illustrator;
      const bv = sortKey === 'price' ? b.price_market : b.illustrator;
      if (av == null && bv == null) return tieBreak(a, b);
      if (av == null) return 1;
      if (bv == null) return -1;
      const r = typeof av === 'number' ? av - (bv as number) : cmp(av, bv as string);
      return r !== 0 ? r * sign : tieBreak(a, b);
    }
    const r = sortKey === 'name' ? cmp(a.name, b.name) : cmp(a.set_id, b.set_id) || cmp(a.local_id, b.local_id);
    return r !== 0 ? r * sign : tieBreak(a, b);
  });
}

export function totalValue(
  cards: CardListItem[],
  owned: Map<string, number>,
): { total: number; currency: string } {
  const sums = new Map<string, number>();
  for (const c of cards) {
    const qty = owned.get(c.id);
    if (!qty || c.price_market == null) continue;
    const cur = c.price_currency ?? 'USD';
    sums.set(cur, (sums.get(cur) ?? 0) + c.price_market * qty);
  }
  let best = { total: 0, currency: 'USD' };
  for (const [currency, total] of sums) if (total > best.total) best = { total, currency };
  return best;
}