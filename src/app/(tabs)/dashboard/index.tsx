import Button from '@/src/components/atoms/Button';
import Icon from '@/src/components/atoms/Icon';
import Screen from '@/src/components/layout/Screen';
import SearchBar from '@/src/components/molecules/SearchBar';
import SearchSuggestions from '@/src/components/molecules/SearchSuggestions';
import SetCard from '@/src/components/molecules/SetCard';
import StatusView from '@/src/components/molecules/StatusView';
import { useAuth } from '@/src/context/AuthContext';
import { useSearchSuggestions } from '@/src/hooks/useSearchSuggestions';
import { api, type SetBrief, type Suggestion } from '@/src/lib/api';
import theme from '@/src/theme/theme';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

const GAP = theme.spacing.space1;

// Group 6 will group these by `serie` with collapsible headers, favorites and
// owned/total progress. For now: a flat list, newest first, filtered in place.
export default function Dashboard() {
  const { logout } = useAuth();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [setFilter, setSetFilter] = useState('');
  const [sets, setSets] = useState<SetBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .sets()
      .then(setSets)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

    const suggestions = useSearchSuggestions(query);

  useFocusEffect(
    useCallback(() => () => setQuery(''), []),
  );

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
  const visible = needle ? sets.filter((s) => s.name.toLowerCase().includes(needle)) : sets;
  const itemWidth = (width - theme.spacing.space3 * 2 - GAP) / 2;

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

      <SearchBar
        value={query}
        onChangeText={setQuery}
        onSubmit={submitSearch}
        placeholder="Search a card"
      />
      
      <SearchSuggestions suggestions={suggestions} onPick={pickSuggestion} />

      <View style={styles.navCards}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="My Cards"
          onPress={() => router.push('/(tabs)/dashboard/my-cards')}
          style={styles.navCard}
        >
          <Icon name="layers" size={32} color={theme.colors.text} />
          <Text style={styles.navLabel}>My Cards</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Statistics"
          onPress={() => router.push('/(tabs)/dashboard/statistics')}
          style={styles.navCard}
        >
          <Icon name="bar-chart-2" size={32} color={theme.colors.text} />
          <Text style={styles.navLabel}>Statistics</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle} accessibilityRole="header">
        Card Sets
      </Text>
      <SearchBar
        value={setFilter}
        onChangeText={setSetFilter}
        placeholder="Search by sets"
        variant="filled"
      />
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={visible}
        numColumns={2}
        keyExtractor={(s) => s.id}
        ListHeaderComponent={header}
        columnWrapperStyle={{ gap: GAP, marginBottom: GAP }}
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
          <View style={{ width: itemWidth }}>
            <SetCard
              name={item.name}
              logoUri={item.logo_url}
              cardCount={item.card_count_total}
              onPress={() =>
                router.push({ pathname: '/(tabs)/dashboard/set-detail/[setId]', params: { setId: item.id } })
              }
            />
          </View>
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
  navCard: {
    flex: 1,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.space1,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  navLabel: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.base, color: theme.colors.text },
  sectionTitle: { fontFamily: theme.fonts.header, fontSize: theme.fontSizes.xl, color: theme.colors.text },
  empty: { minHeight: 200 },
  emptyText: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.base, color: theme.colors.text, textAlign: 'center' },
  footer: { marginTop: theme.spacing.space3 },
});