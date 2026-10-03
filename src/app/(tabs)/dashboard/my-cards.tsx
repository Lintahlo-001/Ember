import LogoImage from '@/src/components/atoms/LogoImage';
import Screen from '@/src/components/layout/Screen';
import CardThumbnail from '@/src/components/molecules/CardThumbnail';
import CollapsibleHeader from '@/src/components/molecules/CollapsibleHeader';
import ScreenHeader from '@/src/components/molecules/ScreenHeader';
import SearchBar from '@/src/components/molecules/SearchBar';
import SortFilterBar from '@/src/components/molecules/SortFilterBar';
import StatBox from '@/src/components/molecules/StatBox';
import StatusView from '@/src/components/molecules/StatusView';
import { useAllOwned } from '@/src/hooks/useAllOwned';
import { useCardListView } from '@/src/hooks/useCardListView';
import { useCollapsed } from '@/src/hooks/useCollapsed';
import { api, type CardListItem, type SetBrief } from '@/src/lib/api';
import { totalValue } from '@/src/lib/cardList';
import { formatPrice } from '@/src/lib/format';
import { groupBySerie } from '@/src/lib/series';
import theme from '@/src/theme/theme';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

type Row =
  | { type: 'serie'; key: string; name: string }
  | { type: 'set'; key: string; set: SetBrief }
  | { type: 'cards'; key: string; cards: CardListItem[] };

const GAP = theme.spacing.space1;

export default function MyCards() {
  const { width } = useWindowDimensions();
  const { owned, loaded, error: ownedError, reload } = useAllOwned();
  const { collapsed, isCollapsed, toggle } = useCollapsed('mycards');

  const [sets, setSets] = useState<SetBrief[]>([]);
  const [cards, setCards] = useState<CardListItem[]>([]);
  const [setsLoaded, setSetsLoaded] = useState(false);
  const [cardsLoaded, setCardsLoaded] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .sets()
      .then((s) => !cancelled && (setSets(s), setSetsLoaded(true)))
      .catch((e: Error) => !cancelled && setDataError(e.message));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const idsKey = useMemo(() => [...owned.keys()].sort().join(','), [owned]);
  useEffect(() => {
    if (!loaded) return;
    if (!idsKey) {
      setCards([]);
      setCardsLoaded(true);
      return;
    }
    let cancelled = false;
    api
      .cardsByIds(idsKey.split(','))
      .then((list) => !cancelled && (setCards(list), setCardsLoaded(true)))
      .catch((e: Error) => !cancelled && setDataError(e.message));
    return () => {
      cancelled = true;
    };
  }, [idsKey, loaded, reloadKey]);

  const needle = search.trim().toLowerCase();
  const searched = useMemo(
    () =>
      needle
        ? cards.filter((c) => c.name.toLowerCase().includes(needle) || (c.illustrator ?? '').toLowerCase().includes(needle))
        : cards,
    [cards, needle],
  );
  const view = useCardListView(searched, owned);

  const totalCards = useMemo(() => [...owned.values()].reduce((a, b) => a + b, 0), [owned]);
  const value = useMemo(() => totalValue(cards, owned), [cards, owned]);

  const itemWidth = (width - theme.spacing.space3 * 2 - GAP * (view.columns - 1)) / view.columns;

  const rows = useMemo(() => {
    const bySet = new Map<string, CardListItem[]>();
    for (const c of view.visible) {
      const list = bySet.get(c.set_id);
      if (list) list.push(c);
      else bySet.set(c.set_id, [c]);
    }
    const out: Row[] = [];
    for (const g of groupBySerie(sets)) {
      const inSerie = g.sets.filter((s) => bySet.has(s.id));
      if (inSerie.length === 0) continue;
      out.push({ type: 'serie', key: `serie:${g.name}`, name: g.name });
      if (!needle && isCollapsed(`serie:${g.name}`)) continue;
      for (const s of inSerie) {
        const setCards = bySet.get(s.id)!;
        out.push({ type: 'set', key: `set:${s.id}`, set: s });
        if (!needle && isCollapsed(`set:${s.id}`)) continue;
        for (let i = 0; i < setCards.length; i += view.columns) {
          out.push({ type: 'cards', key: `cards:${s.id}:${i}`, cards: setCards.slice(i, i + view.columns) });
        }
      }
    }
    return out;
  }, [view.visible, view.columns, sets, needle, collapsed]);

  const goCard = (cardId: string) =>
    router.push({ pathname: '/(tabs)/dashboard/card-detail/[cardId]', params: { cardId } });

  const header = (
    <View style={styles.header}>
      <View style={styles.stats}>
        <StatBox label="Total Cards" value={String(totalCards)} />
        <StatBox label="Estimated Value" value={formatPrice(value.total, value.currency)} />
      </View>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search a card" />
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

  const error = ownedError ?? dataError;
  const ready = loaded && cardsLoaded && setsLoaded;
  const retry = () => {
    setDataError(null);
    setReloadKey((k) => k + 1);
    reload();
  };

  return (
    <Screen>
      <ScreenHeader title="My Cards" />
      <StatusView loading={!ready && !error} error={error} onRetry={retry}>
        <FlatList
          data={rows}
          keyExtractor={(r) => r.key}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {owned.size === 0 ? "You don't own any cards yet. Tap + on a card to add it." : 'No cards match.'}
            </Text>
          }
          initialNumToRender={8}
          windowSize={7}
          removeClippedSubviews
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            if (item.type === 'serie') {
              return (
                <View style={styles.serieRow}>
                  <CollapsibleHeader
                    tone="series"
                    title={item.name}
                    collapsed={isCollapsed(item.key)}
                    onToggle={() => toggle(item.key)}
                  />
                </View>
              );
            }
            if (item.type === 'set') {
              return (
                <CollapsibleHeader
                  tone="set"
                  title={item.set.name}
                  collapsed={isCollapsed(item.key)}
                  onToggle={() => toggle(item.key)}
                  leading={<LogoImage uri={item.set.symbol_url} label="Set symbol" style={styles.symbol} iconSize={14} />}
                />
              );
            }
            return (
              <View style={styles.cardRow}>
                {item.cards.map((c) => (
                  <CardThumbnail
                    key={c.id}
                    id={c.id}
                    name={c.name}
                    imageUri={c.image_url}
                    ownedCount={owned.get(c.id) ?? 0}
                    width={itemWidth}
                    onPress={goCard}
                    showBadge={false}
                  />
                ))}
              </View>
            );
          }}
        />
      </StatusView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  header: { gap: theme.spacing.space2, marginBottom: theme.spacing.space2, marginTop: theme.spacing.space2 },
  stats: { flexDirection: 'row', gap: theme.spacing.space2 },
  serieRow: { marginTop: theme.spacing.space1 },
  symbol: { width: 28, height: 28 },
  cardRow: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
  empty: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: theme.spacing.space4,
  },
});