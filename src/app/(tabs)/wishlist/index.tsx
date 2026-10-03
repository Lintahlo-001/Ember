import Screen from '@/src/components/layout/Screen';
import SortFilterBar from '@/src/components/molecules/SortFilterBar';
import StatusView from '@/src/components/molecules/StatusView';
import CardGrid from '@/src/components/organisms/CardGrid';
import { useCardListView } from '@/src/hooks/useCardListView';
import { useOwnedTotals } from '@/src/hooks/useOwnedTotals';
import { useScrollToTopOnTabPress } from '@/src/hooks/useScrollToTopOnTabPress';
import { type CardListItem } from '@/src/lib/api';
import { catalog } from '@/src/lib/catalog';
import { fetchWishlistIds } from '@/src/lib/wishlist';
import theme from '@/src/theme/theme';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

export default function Wishlist() {
  const [cards, setCards] = useState<CardListItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const listRef = useRef<FlatList<CardListItem>>(null);
  useScrollToTopOnTabPress(listRef);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setError(null);
      (async () => {
        try {
          const ids = await fetchWishlistIds();
          const list = ids.length ? await catalog.cardsByIds(ids) : [];
          if (!cancelled) {
            setCards(list);
            setLoaded(true);
          }
        } catch (e) {
          if (!cancelled) setError((e as Error).message);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [reloadKey]),
  );

  const ids = useMemo(() => cards.map((c) => c.id), [cards]);
  const owned = useOwnedTotals(ids);
  const view = useCardListView(cards, owned);
  const count = cards.length;

  const header = (
    <View style={styles.header}>
      <SortFilterBar
        sortKey={view.sortKey}
        dir={view.dir}
        onSortKeyChange={view.setSortKey}
        onDirChange={view.setDir}
        filter={view.filter}
        onFilterChange={view.setFilter}
        rarities={view.rarities}
        columns={view.columns}
        onColumnsCycle={view.cycleColumns}
      />
    </View>
  );

  return (
    <Screen>
      <View style={styles.titleBlock}>
        <Text style={styles.title} accessibilityRole="header">
          Wishlist
        </Text>
        {loaded ? (
          <Text style={styles.subtitle}>
            Wishlist · {count} {count === 1 ? 'card' : 'cards'}
          </Text>
        ) : null}
      </View>
      <StatusView loading={!loaded && !error} error={error} onRetry={() => setReloadKey((k) => k + 1)}>
        <CardGrid listRef={listRef}
          cards={view.visible}
          owned={owned}
          columns={view.columns}
          header={header}
          emptyText={count === 0 ? 'Nothing here yet. Tap the heart on a card to add it.' : 'No cards match this filter.'}
          onCardPress={(cardId) =>
            router.push({ pathname: '/(tabs)/wishlist/card-detail/[cardId]', params: { cardId } })
          }
          onAddPress={(cardId) =>
            router.push({ pathname: '/modals/ownership-entry', params: { cardId, mode: 'add' } })
          }
        />
      </StatusView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleBlock: { marginBottom: theme.spacing.space2 },
  title: { fontFamily: theme.fonts.header, fontSize: theme.fontSizes.mainHeader, color: theme.colors.text },
  subtitle: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, color: theme.colors.text },
  header: { marginBottom: theme.spacing.space2 },
});