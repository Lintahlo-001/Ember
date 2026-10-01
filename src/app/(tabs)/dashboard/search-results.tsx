import Screen from '@/src/components/layout/Screen';
import Pill from '@/src/components/molecules/Pill';
import ScreenHeader from '@/src/components/molecules/ScreenHeader';
import SearchBar from '@/src/components/molecules/SearchBar';
import SortFilterBar from '@/src/components/molecules/SortFilterBar';
import StatusView from '@/src/components/molecules/StatusView';
import CardGrid from '@/src/components/organisms/CardGrid';
import { useCardListView } from '@/src/hooks/useCardListView';
import { useOwnedTotals } from '@/src/hooks/useOwnedTotals';
import { api, type CardListItem } from '@/src/lib/api';
import theme from '@/src/theme/theme';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function SearchResults() {
  const params = useLocalSearchParams<{ query?: string; artist?: string }>();
  const startQuery = typeof params.query === 'string' ? params.query : '';
  const startArtist = typeof params.artist === 'string' ? params.artist : '';

  const [input, setInput] = useState(startQuery);
  const [query, setQuery] = useState(startQuery);
  const [artist, setArtist] = useState(startArtist);
  const [cards, setCards] = useState<CardListItem[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!query && !artist) {
      setCards([]);
      setTruncated(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .search({ q: query, artist })
      .then((res) => {
        if (cancelled) return;
        setCards(res.results);
        setTruncated(res.truncated);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [query, artist, reloadKey]);

  const ids = useMemo(() => cards.map((c) => c.id), [cards]);
  const owned = useOwnedTotals(ids);
  const view = useCardListView(cards, owned);

  const header = (
    <View style={styles.header}>
      <SearchBar
        value={input}
        onChangeText={setInput}
        onSubmit={() => setQuery(input.trim())}
        placeholder="Search a card"
      />
      {artist ? (
        <View style={styles.chipRow}>
          <Pill
            icon="x"
            label={`Artist: ${artist}`}
            accessibilityLabel={`Artist filter ${artist}. Remove filter`}
            onPress={() => setArtist('')}
          />
        </View>
      ) : null}
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
      <Text style={styles.count} accessibilityRole="header">
        Results ({view.visible.length})
      </Text>
      {truncated ? (
        <Text style={styles.note}>Showing the first 200 matches. Narrow your search to see others.</Text>
      ) : null}
    </View>
  );

  return (
    <Screen>
      <ScreenHeader title="Search Results" />
      <StatusView loading={loading} error={error} onRetry={() => setReloadKey((k) => k + 1)}>
        <CardGrid
          cards={view.visible}
          owned={owned}
          columns={view.columns}
          header={header}
          emptyText={query || artist ? 'No cards match.' : 'Type a card name to search.'}
          onCardPress={(cardId) =>
            router.push({ pathname: '/(tabs)/dashboard/card-detail/[cardId]', params: { cardId } })
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
  header: { gap: theme.spacing.space2, marginBottom: theme.spacing.space2 },
  chipRow: { flexDirection: 'row' },
  count: { fontFamily: theme.fonts.header, fontSize: theme.fontSizes.xl, color: theme.colors.text },
  note: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, color: theme.colors.text },
});