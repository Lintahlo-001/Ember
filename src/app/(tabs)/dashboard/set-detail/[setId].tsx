import IconButton from '@/src/components/atoms/IconButton';
import StarIcon from '@/src/components/atoms/icons/StarIcon';
import Screen from '@/src/components/layout/Screen';
import ScreenHeader from '@/src/components/molecules/ScreenHeader';
import SortFilterBar from '@/src/components/molecules/SortFilterBar';
import StatusView from '@/src/components/molecules/StatusView';
import CardGrid from '@/src/components/organisms/CardGrid';
import SetDetailHeader from '@/src/components/organisms/SetDetailHeader';
import { useCardListView } from '@/src/hooks/useCardListView';
import { useCurrency } from '@/src/hooks/useCurrency';
import { useOwnedTotals } from '@/src/hooks/useOwnedTotals';
import { type SetDetail as SetDetailData } from '@/src/lib/api';
import { totalValue } from '@/src/lib/cardList';
import { catalog } from '@/src/lib/catalog';
import { addFavoriteSet, isFavoriteSet, removeFavoriteSet } from '@/src/lib/favorites';
import theme from '@/src/theme/theme';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

export default function SetDetail() {
  const { setId } = useLocalSearchParams<{ setId: string }>();
  const id = typeof setId === 'string' ? setId : '';

  const [set, setSet] = useState<SetDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const favBusy = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      let cancelled = false;
      isFavoriteSet(id)
        .then((f) => !cancelled && setFavorite(f))
        .catch((err) => console.warn('Could not load favorite state:', err));
      return () => {
        cancelled = true;
      };
    }, [id]),
  );

  const toggleFavorite = async () => {
    if (favBusy.current) return;
    favBusy.current = true;
    const next = !favorite;
    setFavorite(next);
    try {
      await (next ? addFavoriteSet(id) : removeFavoriteSet(id));
    } catch (err) {
      setFavorite(!next);
      Alert.alert('Could not update favorites', (err as Error).message);
    } finally {
      favBusy.current = false;
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    catalog
      .set(id)
      .then((s) => !cancelled && setSet(s))
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const cards = useMemo(() => set?.cards ?? [], [set]);
  const ids = useMemo(() => cards.map((c) => c.id), [cards]);
  const owned = useOwnedTotals(ids);
  const view = useCardListView(cards, owned);

  const ownedUnique = cards.filter((c) => owned.has(c.id)).length;
  const { code, convert } = useCurrency();
  const value = totalValue(cards, owned, { code, convert });

  const header = set ? (
    <View style={styles.header}>
      <SetDetailHeader
        name={set.name}
        logoUri={set.logo_url}
        releaseDate={set.release_date}
        totalValue={value.total}
        currency={value.currency}
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
        trailing={
          <IconButton
            label={favorite ? 'Remove set from favorites' : 'Add set to favorites'}
            active={favorite}
            onPress={toggleFavorite}
            renderIcon={(color, size) => <StarIcon filled={favorite} color={color} size={size} />}
          />
        }
      />
      <Text style={styles.listTitle} accessibilityRole="header">
        Card List
      </Text>
    </View>
  ) : undefined;

  return (
    <Screen>
      <ScreenHeader title="Set Details" />
      <StatusView loading={loading} error={error} onRetry={() => setReloadKey((k) => k + 1)}>
        {set ? (
          <CardGrid
            cards={view.visible}
            owned={owned}
            columns={view.columns}
            header={header}
            emptyText="No cards match this filter."
            onCardPress={(cardId) =>
              router.push({ pathname: '/(tabs)/dashboard/card-detail/[cardId]', params: { cardId } })
            }
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
  listTitle: { fontFamily: theme.fonts.header, fontSize: theme.fontSizes.xl, color: theme.colors.text },
});