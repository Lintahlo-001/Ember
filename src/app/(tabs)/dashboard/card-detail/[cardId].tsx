import Screen from '@/src/components/layout/Screen';
import ScreenHeader from '@/src/components/molecules/ScreenHeader';
import StatusView from '@/src/components/molecules/StatusView';
import CardDetailHeader from '@/src/components/organisms/CardDetailHeader';
import CardImageWithPeeks from '@/src/components/organisms/CardImageWithPeeks';
import PillActionRow from '@/src/components/organisms/PillActionRow';
import YourCollectionSection from '@/src/components/organisms/YourCollectionSection';
import { api, type CardDetail as CardDetailData } from '@/src/lib/api';
import { cardNumber } from '@/src/lib/format';
import { deleteEntry, fetchEntries, updateEntry, type OwnershipEntry } from '@/src/lib/ownership';
import theme from '@/src/theme/theme';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

// Busiest screen in the app. Swipe navigation + wishlist heart: Group 5.
// Price pill tap -> Pricing Detail modal: Group 9.
export default function CardDetail() {
  const { cardId } = useLocalSearchParams<{ cardId: string }>();
  const id = typeof cardId === 'string' ? cardId : '';

  const [card, setCard] = useState<CardDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [entries, setEntries] = useState<OwnershipEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .card(id)
      .then((c) => !cancelled && setCard(c))
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const loadEntries = useCallback(() => {
    if (!id) return () => {};
    let cancelled = false;
    fetchEntries(id)
      .then((e) => !cancelled && setEntries(e))
      .catch((err) => console.warn('Could not load entries:', err));
    return () => {
      cancelled = true;
    };
  }, [id]);

  useFocusEffect(loadEntries);

  const openAdd = () =>
    router.push({ pathname: '/modals/ownership-entry', params: { cardId: id, mode: 'add' } });
  const openEdit = (entry: OwnershipEntry) =>
    router.push({ pathname: '/modals/ownership-entry', params: { cardId: id, mode: 'edit', entryId: entry.id } });

  const changeQuantity = async (entry: OwnershipEntry, quantity: number) => {
    setEntries((list) => list.map((e) => (e.id === entry.id ? { ...e, quantity } : e)));
    try {
      await updateEntry(entry.id, { quantity });
    } catch (err) {
      Alert.alert('Could not update quantity', (err as Error).message);
      loadEntries();
    }
  };

  const requestDelete = (entry: OwnershipEntry) =>
    Alert.alert('Delete this entry?', 'It will be removed from your collection.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEntry(entry.id);
            setEntries((list) => list.filter((e) => e.id !== entry.id));
          } catch (err) {
            Alert.alert('Could not delete entry', (err as Error).message);
          }
        },
      },
    ]);

  return (
    <Screen>
      {!card ? <ScreenHeader title="" /> : null}
      <StatusView loading={loading} error={error} onRetry={() => setReloadKey((k) => k + 1)}>
        {card ? (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <CardDetailHeader
              cardName={card.name}
              cardNumber={cardNumber(card.local_id, card.card_count_official)}
              setName={card.set_name}
              setSymbolUri={card.set_symbol_url}
              rarity={card.rarity}
              rarityIconUri={card.rarity_icon_url}
            />
            <CardImageWithPeeks imageUri={card.image_url} name={card.name} />
            <PillActionRow
              dexIds={card.dex_ids ?? []}
              artistName={card.illustrator}
              price={card.price_market}
              currency={card.price_currency}
              onPokemonPress={(pokemonId) =>
                router.push({
                  pathname: '/(tabs)/pokedex/pokemon-detail/[pokemonId]',
                  params: { pokemonId: String(pokemonId) },
                })
              }
              onArtistPress={(artist) =>
                router.push({ pathname: '/(tabs)/dashboard/search-results', params: { artist } })
              }
            />
            <YourCollectionSection
              entries={entries}
              onAdd={openAdd}
              onEntryPress={openEdit}
              onQuantityChange={changeQuantity}
              onDeleteRequest={requestDelete}
            />
          </ScrollView>
        ) : null}
      </StatusView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.space2, paddingBottom: 140 },
});