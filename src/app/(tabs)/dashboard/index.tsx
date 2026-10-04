import Button from '@/src/components/atoms/Button';
import Icon from '@/src/components/atoms/Icon';
import Screen from '@/src/components/layout/Screen';
import NavCard from '@/src/components/molecules/NavCard';
import SearchBar from '@/src/components/molecules/SearchBar';
import SearchSuggestions from '@/src/components/molecules/SearchSuggestions';
import SetCard from '@/src/components/molecules/SetCard';
import StatusView from '@/src/components/molecules/StatusView';
import SeriesGroup, { SERIES_BODY_PADDING } from '@/src/components/organisms/SeriesGroup';
import { useAuth } from '@/src/context/AuthContext';
import { useAllOwned } from '@/src/hooks/useAllOwned';
import { useCollapsed } from '@/src/hooks/useCollapsed';
import { useFavoriteSets } from '@/src/hooks/useFavoriteSets';
import { usePinnedImages } from '@/src/hooks/usePinnedImages';
import { useScrollToTopOnTabPress } from '@/src/hooks/useScrollToTopOnTabPress';
import { useSearchSuggestions } from '@/src/hooks/useSearchSuggestions';
import { type SetBrief, type Suggestion } from '@/src/lib/api';
import { catalog } from '@/src/lib/catalog';
import { groupWithFavorites, ownedPerSet, type SerieGroup } from '@/src/lib/series';
import theme from '@/src/theme/theme';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

const GAP = theme.spacing.space1;

export default function Dashboard() {
  const { logout } = useAuth();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [setFilter, setSetFilter] = useState('');
  const [sets, setSets] = useState<SetBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<SerieGroup>>(null);
  useScrollToTopOnTabPress(listRef);

  const { owned, loaded: ownedLoaded } = useAllOwned();
  const favorites = useFavoriteSets();
  const { isCollapsed, toggle } = useCollapsed('dashboard');
  const ownedBySet = useMemo(() => ownedPerSet(owned, sets), [owned, sets]);
  usePinnedImages(owned, ownedLoaded && sets.length > 0);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    catalog
      .sets()
      .then(setSets)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const suggestions = useSearchSuggestions(query);

  useFocusEffect(useCallback(() => () => setQuery(''), []));

  const pickSuggestion = (s: Suggestion) => {
    router.push({
      pathname: '/(tabs)/dashboard/search-results',
      params: s.kind === 'artist' ? { artist: s.label } : { query: s.label },
    });
  };

  const submitSearch = () => {
    const q = query.trim();
    if (!q) return;
    router.push({ pathname: '/(tabs)/dashboard/search-results', params: { query: q } });
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/welcome');
  };

  const needle = setFilter.trim().toLowerCase();
  const groups = useMemo(
    () =>
      groupWithFavorites(needle ? sets.filter((s) => s.name.toLowerCase().includes(needle)) : sets, favorites),
    [sets, needle, favorites],
  );
  const itemWidth = (width - theme.spacing.space3 * 2 - SERIES_BODY_PADDING * 2 - GAP) / 2;

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={styles.title} accessibilityRole="header">
          Ember
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => router.push('/(tabs)/dashboard/settings')}
          hitSlop={12}
        >
          <Icon name="settings" size={28} color={theme.colors.text} />
        </Pressable>
      </View>

      <SearchBar value={query} onChangeText={setQuery} onSubmit={submitSearch} placeholder="Search a card" />
      <SearchSuggestions suggestions={suggestions} onPick={pickSuggestion} />

      <View style={styles.navCards}>
        <NavCard icon="cards" label="My Cards" onPress={() => router.push('/(tabs)/dashboard/my-cards')} />
        <NavCard
          icon="chart-areaspline"
          label="Statistics"
          onPress={() => router.push('/(tabs)/dashboard/statistics')}
        />
      </View>

      <Text style={styles.sectionTitle} accessibilityRole="header">
        Card Sets
      </Text>
      <SearchBar value={setFilter} onChangeText={setSetFilter} placeholder="Search by sets" variant="filled" />
    </View>
  );

  return (
    <Screen>
      <FlatList
        ref={listRef}
        data={groups}
        keyExtractor={(g) => g.name}
        initialNumToRender={3}
        windowSize={5}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <StatusView loading={loading} error={error} onRetry={load}>
              <Text style={styles.emptyText}>No sets match "{setFilter}".</Text>
            </StatusView>
          </View>
        }
        renderItem={({ item }) => (
          <SeriesGroup
            name={item.name}
            collapsed={needle ? false : isCollapsed(item.name)}
            onToggle={() => toggle(item.name)}
          >
            <View style={styles.grid}>
              {item.sets.map((s) => (
                <View key={s.id} style={{ width: itemWidth }}>
                  <SetCard
                    name={s.name}
                    logoUri={s.logo_url}
                    cardCount={s.card_count_total}
                    owned={ownedBySet.get(s.id) ?? 0}
                    onPress={() =>
                      router.push({ pathname: '/(tabs)/dashboard/set-detail/[setId]', params: { setId: s.id } })
                    }
                  />
                </View>
              ))}
            </View>
          </SeriesGroup>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            {/* Temporary, for testing. Real Log Out lives in Settings (Group 12). */}
            <Button label="Log out (testing)" variant="outline" onPress={handleLogout} />
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  header: { gap: theme.spacing.space2, marginBottom: theme.spacing.space2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: theme.fonts.header, fontSize: theme.fontSizes.mainHeader, color: theme.colors.text },
  navCards: { flexDirection: 'row', gap: theme.spacing.space2 },
  sectionTitle: { fontFamily: theme.fonts.header, fontSize: theme.fontSizes.xl, color: theme.colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  empty: { minHeight: 200 },
  emptyText: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.base, color: theme.colors.text, textAlign: 'center' },
  footer: { marginTop: theme.spacing.space3 },
});