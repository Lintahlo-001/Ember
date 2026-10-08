import Button from '@/src/components/atoms/Button';
import ProgressBar from '@/src/components/atoms/ProgressBar';
import Screen from '@/src/components/layout/Screen';
import OptionSheet, { OptionRow, OptionSectionLabel } from '@/src/components/molecules/OptionSheet';
import Pill from '@/src/components/molecules/Pill';
import PokemonGridCell from '@/src/components/molecules/PokemonGridCell';
import RegionToggle from '@/src/components/molecules/RegionToggle';
import SearchBar from '@/src/components/molecules/SearchBar';
import StatusView from '@/src/components/molecules/StatusView';
import RegionSelectSheet from '@/src/components/organisms/RegionSelectSheet';
import { useOwnedDex, usePokedexData } from '@/src/hooks/usePokedexData';
import { useScrollToTopOnTabPress } from '@/src/hooks/useScrollToTopOnTabPress';
import type { Species } from '@/src/lib/api';
import type { SortDir } from '@/src/lib/cardList';
import { DEX_SORT_LABELS, filterAndSort, inRegion, type DexSortKey } from '@/src/lib/pokedex';
import theme from '@/src/theme/theme';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

const GAP = theme.spacing.space1;
const SORT_KEYS = Object.keys(DEX_SORT_LABELS) as DexSortKey[];

export default function Pokedex() {
  const { width } = useWindowDimensions();
  const { data, error, reload } = usePokedexData();
  const ownedDex = useOwnedDex();

  const [search, setSearch] = useState('');
  const [regionId, setRegionId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'region' | 'sort' | null>(null);
  const [sortKey, setSortKey] = useState<DexSortKey>('number');
  const [dir, setDir] = useState<SortDir>('asc');
  const [pendingKey, setPendingKey] = useState<DexSortKey>('number');
  const [pendingDir, setPendingDir] = useState<SortDir>('asc');

  const listRef = useRef<FlatList<Species>>(null);
  useScrollToTopOnTabPress(listRef);

  const region = data?.regions.find((r) => r.id === regionId) ?? null;
  const scope = useMemo(() => inRegion(data?.species ?? [], region), [data, region]);
  const visible = useMemo(() => filterAndSort(scope, search, sortKey, dir), [scope, search, sortKey, dir]);

  const owned = useMemo(() => scope.filter((s) => ownedDex.has(s.dex_id)).length, [scope, ownedDex]);
  const total = scope.length;
  const progress = total > 0 ? owned / total : 0;
  const pct = Math.round(progress * 100);

  const columns = width >= theme.breakpoints.expanded ? 4 : 3;
  const itemWidth = (width - theme.spacing.space3 * 2 - GAP * (columns - 1)) / columns;

  const openPokemon = useCallback(
    (dexId: number) =>
      router.push({ pathname: '/(tabs)/pokedex/pokemon-detail/[pokemonId]', params: { pokemonId: String(dexId) } }),
    [],
  );

  const openSort = () => {
    setPendingKey(sortKey);
    setPendingDir(dir);
    setSheet('sort');
  };
  const applySort = () => {
    setSortKey(pendingKey);
    setDir(pendingDir);
    setSheet(null);
  };

  const header = (
    <View style={styles.header}>
      <RegionToggle
        regionName={region?.name ?? null}
        onNational={() => setRegionId(null)}
        onChangeRegion={() => setSheet('region')}
      />
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search Pokémon" />
      <View style={styles.progress}>
        <View style={styles.stats}>
          <Text style={styles.small}>
            {owned}/{total} owned
          </Text>
          <Text style={styles.small}>{pct}% complete</Text>
        </View>
        <ProgressBar value={progress} label={`${region?.name ?? 'National'} Pokédex progress`} />
      </View>
    </View>
  );

  return (
    <Screen>
      <View style={styles.titleRow}>
        <Text style={styles.title} accessibilityRole="header">
          Pokédex
        </Text>
        <Pill
          icon={dir === 'asc' ? 'arrow-up' : 'arrow-down'}
          label={`Sort: ${DEX_SORT_LABELS[sortKey]}`}
          accessibilityLabel={`Sort by ${DEX_SORT_LABELS[sortKey]}, ${dir === 'asc' ? 'ascending' : 'descending'}. Change sort`}
          onPress={openSort}
        />
      </View>

      <StatusView loading={!data && !error} error={error} onRetry={reload}>
        <FlatList
          ref={listRef}
          key={columns}
          data={visible}
          extraData={ownedDex}
          numColumns={columns}
          keyExtractor={(s) => String(s.dex_id)}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {search ? `No Pokémon match "${search}".` : 'No Pokémon to show yet.'}
            </Text>
          }
          columnWrapperStyle={{ gap: GAP, marginBottom: GAP }}
          initialNumToRender={12}
          maxToRenderPerBatch={9}
          windowSize={7}
          removeClippedSubviews
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <PokemonGridCell
              dexId={item.dex_id}
              name={item.name}
              imageUri={item.image_url}
              owned={ownedDex.has(item.dex_id)}
              width={itemWidth}
              onPress={openPokemon}
            />
          )}
        />
      </StatusView>

      <RegionSelectSheet
        visible={sheet === 'region'}
        regions={data?.regions ?? []}
        selectedId={regionId}
        onSelect={(id) => {
          setRegionId(id);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />

      <OptionSheet
        visible={sheet === 'sort'}
        title="Sort by"
        onClose={() => setSheet(null)}
        footer={<Button label="Done" variant="cta" onPress={applySort} />}
      >
        {SORT_KEYS.map((k) => (
          <OptionRow key={k} label={DEX_SORT_LABELS[k]} selected={k === pendingKey} onPress={() => setPendingKey(k)} />
        ))}
        <OptionSectionLabel>Order</OptionSectionLabel>
        <OptionRow label="Ascending" selected={pendingDir === 'asc'} onPress={() => setPendingDir('asc')} />
        <OptionRow label="Descending" selected={pendingDir === 'desc'} onPress={() => setPendingDir('desc')} />
      </OptionSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.space1,
    marginBottom: theme.spacing.space2,
  },
  title: { fontFamily: theme.fonts.header, fontSize: theme.fontSizes.mainHeader, color: theme.colors.text },
  header: { gap: theme.spacing.space2, marginBottom: theme.spacing.space2 },
  progress: { gap: theme.spacing.space1 },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  small: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, color: theme.colors.text },
  content: { paddingBottom: 120 },
  empty: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: theme.spacing.space4,
  },
});