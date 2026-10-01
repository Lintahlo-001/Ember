import type { CardListItem } from '@/src/lib/api';

// TODO (Settings group): read this from a saved user preference.
// Until then every card renders undimmed, owned or not.
export const DIM_UNOWNED_CARDS = false;

export type SortKey = 'number' | 'name' | 'price' | 'illustrator';
export type SortDir = 'asc' | 'desc';
export type CardFilter =
  | { kind: 'all' }
  | { kind: 'owned' }
  | { kind: 'notOwned' }
  | { kind: 'rarity'; rarity: string };

export const SORT_LABELS: Record<SortKey, string> = {
  number: 'Number',
  name: 'Name',
  price: 'Price',
  illustrator: 'Illustrator',
};

export function filterLabel(f: CardFilter): string {
  switch (f.kind) {
    case 'owned':
      return 'Owned';
    case 'notOwned':
      return 'Not Owned';
    case 'rarity':
      return f.rarity;
    default:
      return 'All';
  }
}

const cmp = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const tieBreak = (a: CardListItem, b: CardListItem) => cmp(a.name, b.name) || cmp(a.id, b.id);

export function applyView(
  cards: CardListItem[],
  owned: Map<string, number>,
  sortKey: SortKey,
  dir: SortDir,
  filter: CardFilter,
): CardListItem[] {
  const filtered = cards.filter((c) => {
    if (filter.kind === 'owned') return owned.has(c.id);
    if (filter.kind === 'notOwned') return !owned.has(c.id);
    if (filter.kind === 'rarity') return c.rarity === filter.rarity;
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