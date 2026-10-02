import type { CardListItem } from '@/src/lib/api';
import { applyView, NO_FILTER, sortRarities, type CardFilter, type SortDir, type SortKey } from '@/src/lib/cardList';
import theme from '@/src/theme/theme';
import { useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';

export function useCardListView(cards: CardListItem[], owned: Map<string, number>) {
  const { width } = useWindowDimensions();
  const [sortKey, setSortKey] = useState<SortKey>('number');
  const [dir, setDir] = useState<SortDir>('asc');
  const [filter, setFilter] = useState<CardFilter>(NO_FILTER);
  const [override, setOverride] = useState<number | null>(null);

  const columns = override ?? (width >= theme.breakpoints.expanded ? 4 : 3);
  const cycleColumns = () => setOverride(columns === 3 ? 4 : columns === 4 ? 5 : 3);

  const visible = useMemo(
    () => applyView(cards, owned, sortKey, dir, filter),
    [cards, owned, sortKey, dir, filter],
  );
  const rarities = useMemo(
    () => sortRarities(Array.from(new Set(cards.map((c) => c.rarity).filter((r): r is string => !!r)))),
    [cards],
  );

  return { visible, rarities, sortKey, dir, filter, columns, setSortKey, setDir, setFilter, cycleColumns };
}