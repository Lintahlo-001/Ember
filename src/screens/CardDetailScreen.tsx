import BlurredBackdrop from '@/src/components/atoms/BlurredBackdrop';
import Screen from '@/src/components/layout/Screen';
import ConfirmDialog from '@/src/components/molecules/ConfirmDialog';
import ScreenHeader from '@/src/components/molecules/ScreenHeader';
import StatusView from '@/src/components/molecules/StatusView';
import CardDetailHeader from '@/src/components/organisms/CardDetailHeader';
import CardImageWithPeeks from '@/src/components/organisms/CardImageWithPeeks';
import CardLightbox from '@/src/components/organisms/CardLightbox';
import PillActionRow from '@/src/components/organisms/PillActionRow';
import YourCollectionSection from '@/src/components/organisms/YourCollectionSection';
import { type CardDetail as CardDetailData } from '@/src/lib/api';
import { catalog } from '@/src/lib/catalog';
import { cardNumber } from '@/src/lib/format';
import { deleteEntry, fetchEntries, updateEntry, type OwnershipEntry } from '@/src/lib/ownership';
import { addToWishlist, isWishlisted, removeFromWishlist } from '@/src/lib/wishlist';
import theme from '@/src/theme/theme';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

export default function CardDetailScreen() {
  const { cardId } = useLocalSearchParams<{ cardId: string }>();
  const id = typeof cardId === 'string' ? cardId : '';

  const [card, setCard] = useState<CardDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [entries, setEntries] = useState<OwnershipEntry[]>([]);
  const [wishlisted, setWishlisted] = useState(false);
  const wishBusy = useRef(false);
  const [zoomed, setZoomed] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<OwnershipEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    catalog
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

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      let cancelled = false;
      isWishlisted(id)
        .then((w) => !cancelled && setWishlisted(w))
        .catch((err) => console.warn('Could not load wishlist state:', err));
      return () => {
        cancelled = true;
      };
    }, [id]),
  );

  const toggleWishlist = async () => {
    if (wishBusy.current) return;
    wishBusy.current = true;
    const next = !wishlisted;
    setWishlisted(next);
    try {
      await (next ? addToWishlist(id) : removeFromWishlist(id));
    } catch (err) {
      setWishlisted(!next);
      Alert.alert('Could not update wishlist', (err as Error).message);
    } finally {
      wishBusy.current = false;
    }
  };

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

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteEntry(pendingDelete.id);
      setEntries((list) => list.filter((e) => e.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      setPendingDelete(null);
      Alert.alert('Could not delete entry', (err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen noPadding>
      {!card ? (
        <View style={styles.pad}>
          <ScreenHeader title="" />
        </View>
      ) : null}
      <StatusView loading={loading} error={error} onRetry={() => setReloadKey((k) => k + 1)}>
        {card ? (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
              <BlurredBackdrop uri={card.image_url} />
              <CardDetailHeader
                cardName={card.name}
                cardNumber={cardNumber(card.local_id, card.card_count_official)}
                setName={card.set_name}
                setSymbolUri={card.set_symbol_url}
                rarity={card.rarity}
                rarityIconUri={card.rarity_icon_url}
              />
              <CardImageWithPeeks imageUri={card.image_url} name={card.name} onPress={() => setZoomed(true)} />
              <PillActionRow
                dexIds={card.dex_ids ?? []}
                artistName={card.illustrator}
                price={card.price_market}
                currency={card.price_currency}
                isWishlisted={wishlisted}
                onWishlistToggle={toggleWishlist}
                onPokemonPress={(pokemonId) =>
                  router.push({ pathname: '/(tabs)/pokedex/pokemon-detail/[pokemonId]', params: { pokemonId: String(pokemonId) } })
                }
                onArtistPress={(artist) =>
                  router.push({ pathname: '/(tabs)/dashboard/search-results', params: { artist } })
                }
              />
            </View>
            <YourCollectionSection
              entries={entries}
              onAdd={openAdd}
              onEntryPress={openEdit}
              onQuantityChange={changeQuantity}
              onDeleteRequest={setPendingDelete}
            />
          </ScrollView>
        ) : null}
      </StatusView>

      {card ? <CardLightbox visible={zoomed} uri={card.image_url} name={card.name} onClose={() => setZoomed(false)} /> : null}
      <ConfirmDialog
        visible={!!pendingDelete}
        title="Delete this entry?"
        message="It will be removed from your collection."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.space2, paddingHorizontal: theme.spacing.space3, paddingBottom: 140 },
  pad: { paddingHorizontal: theme.spacing.space3 },
  hero: {
    gap: theme.spacing.space2,
    marginHorizontal: -theme.spacing.space3,
    paddingHorizontal: theme.spacing.space3,
    paddingBottom: theme.spacing.space2,
  },
});