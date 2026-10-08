import Screen from '@/src/components/layout/Screen';
import ScreenHeader from '@/src/components/molecules/ScreenHeader';
import SortFilterBar from '@/src/components/molecules/SortFilterBar';
import StatusView from '@/src/components/molecules/StatusView';
import CardGrid from '@/src/components/organisms/CardGrid';
import PokemonSummaryCard from '@/src/components/organisms/PokemonSummaryCard';
import { useCardListView } from '@/src/hooks/useCardListView';
import { useOwnedTotals } from '@/src/hooks/useOwnedTotals';
import type { CardListItem, Species } from '@/src/lib/api';
import { catalog } from '@/src/lib/catalog';
import { cardDetailHref, useTabStack } from '@/src/lib/routes';
import theme from '@/src/theme/theme';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

export default function PokemonDetailScreen() {
  const stack = useTabStack();
  const navigation = useNavigation();
  const { pokemonId, from } = useLocalSearchParams<{ pokemonId: string; from?: string }>();
  const origin = from === 'dashboard' || from === 'wishlist' ? from : null;
  const raw = typeof pokemonId === 'string' ? pokemonId : '';
  const valid = /^\d{1,4}$/.test(raw) && Number(raw) >= 1;
  const dexId = valid ? Number(raw) : 0;

  const [species, setSpecies] = useState<Species | null>(null);
  const [cards, setCards] = useState<CardListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!valid) {
      setError('This link is not valid.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const s = await catalog.speciesById(dexId);
        if (!s) throw new Error('Pokémon not found.');
        const list = await catalog.pokemonCards(dexId, (fresh) => !cancelled && setCards(fresh));
        if (cancelled) return;
        setSpecies(s);
        setCards(list);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dexId, valid, reloadKey]);

  const ids = useMemo(() => cards.map((c) => c.id), [cards]);
  const owned = useOwnedTotals(ids);
  const view = useCardListView(cards, owned);
  const ownedUnique = useMemo(() => cards.filter((c) => owned.has(c.id)).length, [cards, owned]);

  const header = species ? (
    <View style={styles.header}>
      <PokemonSummaryCard
        dexId={species.dex_id}
        name={species.name}
        imageUri={species.image_url}
        description={species.description}
        owned={ownedUnique}
        total={cards.length}
      />
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
  ) : undefined;

    const goBack = useCallback(() => {
    if (!origin) {
      router.back();
      return;
    }
    (navigation as any).popToTop();
    navigation.getParent()?.navigate(origin as never);
  }, [origin, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!origin) return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goBack();
        return true;
      });
      return () => sub.remove();
    }, [origin, goBack]),
  );

  return (
    <Screen>
      <ScreenHeader title={species?.name ?? ''} onBack={goBack} />
      <StatusView loading={loading} error={error} onRetry={() => setReloadKey((k) => k + 1)}>
        {species ? (
          <CardGrid
            cards={view.visible}
            owned={owned}
            columns={view.columns}
            header={header}
            emptyText={
              cards.length === 0
                ? 'No cards have been printed for this Pokémon yet.'
                : 'No cards match this filter.'
            }
            onCardPress={(cardId) => router.push(cardDetailHref(stack, cardId))}
            onAddPress={(cardId) =>
              router.push({ pathname: '/modals/ownership-entry', params: { cardId, mode: 'add' } })
            }
          />
        ) : null}
      </StatusView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: theme.spacing.space2, marginBottom: theme.spacing.space2 },
});