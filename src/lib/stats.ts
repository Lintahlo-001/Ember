import type { CardListItem, SetBrief } from '@/src/lib/api';
import { sortRarities } from '@/src/lib/cardList';

export const UNKNOWN_RARITY = 'Unknown';

export type Progress = { owned: number; total: number };

export const progressOf = ({ owned, total }: Progress): number =>
  total > 0 ? Math.min(1, owned / total) : 0;

export const percentOf = (p: Progress): number => Math.round(progressOf(p) * 100);

export const formatCount = (n: number): string => n.toLocaleString('en-US');

export const progressCaption = (p: Progress): string =>
  `${formatCount(p.owned)}/${formatCount(p.total)} • ${percentOf(p)}% complete`;

export const totalUniqueCards = (sets: SetBrief[]): number =>
  sets.reduce((sum, s) => sum + (s.card_count_total ?? 0), 0);

export type RankedCard = {
  card: CardListItem;
  setName: string;
  value: number;
};


export function topValuable(
  cards: CardListItem[],
  sets: SetBrief[],
  convert: (value: number, from?: string | null) => number | null,
  limit = 5,
): RankedCard[] {
  const names = new Map(sets.map((s) => [s.id, s.name]));
  const ranked: RankedCard[] = [];
  for (const card of cards) {
    if (card.price_market == null) continue;
    const value = convert(card.price_market, card.price_currency) ?? card.price_market;
    ranked.push({ card, setName: names.get(card.set_id) ?? card.set_id, value });
  }
  return ranked
    .sort((a, b) => b.value - a.value || (a.card.name < b.card.name ? -1 : 1))
    .slice(0, limit);
}

export type RarityRow = { rarity: string; owned: number; total: number };

export function rarityBreakdown(cards: CardListItem[], owned: ReadonlyMap<string, number>): RarityRow[] {
  const byRarity = new Map<string, Progress>();
  for (const c of cards) {
    const key = c.rarity?.trim() || UNKNOWN_RARITY;
    const row = byRarity.get(key) ?? { owned: 0, total: 0 };
    row.total += 1;
    if (owned.has(c.id)) row.owned += 1;
    byRarity.set(key, row);
  }
  return sortRarities([...byRarity.keys()]).map((rarity) => ({ rarity, ...byRarity.get(rarity)! }));
}