import IconButton from '@/src/components/atoms/IconButton';
import CardNumberBadge from '@/src/components/molecules/CardNumberBadge';
import StatusView from '@/src/components/molecules/StatusView';
import EntryModalForm from '@/src/components/organisms/EntryModalForm';
import { api, type CardDetail } from '@/src/lib/api';
import { cardNumber } from '@/src/lib/format';
import { addEntry, deleteEntry, fetchEntry, updateEntry, type EntryValues } from '@/src/lib/ownership';
import theme from '@/src/theme/theme';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

const CARD_ID_RE = /^[A-Za-z0-9._-]{1,40}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function OwnershipEntryModal() {
  const params = useLocalSearchParams<{ cardId?: string; mode?: string; entryId?: string }>();
  const cardId = typeof params.cardId === 'string' ? params.cardId : '';
  const entryId = typeof params.entryId === 'string' ? params.entryId : '';
  const mode = params.mode === 'edit' ? 'edit' : 'add';

  const [card, setCard] = useState<CardDetail | null>(null);
  const [initial, setInitial] = useState<EntryValues | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!CARD_ID_RE.test(cardId) || (mode === 'edit' && !UUID_RE.test(entryId))) {
      setLoadError('This link is not valid.');
      return;
    }
    let cancelled = false;
    setLoadError(null);
    (async () => {
      try {
        const c = await api.card(cardId);
        const entry = mode === 'edit' ? await fetchEntry(entryId) : null;
        if (cancelled) return;
        setCard(c);
        setInitial(
          entry
            ? { quantity: entry.quantity, condition: entry.condition, variant: entry.variant, notes: entry.notes }
            : { quantity: 1, condition: 'Near Mint', variant: c.variant_options[0] ?? 'normal', notes: '' },
        );
      } catch (err) {
        if (!cancelled) setLoadError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cardId, entryId, mode, reloadKey]);

  const save = async (values: EntryValues) => {
    setSaving(true);
    setSaveError(null);
    try {
      if (mode === 'add') await addEntry(cardId, values);
      else await updateEntry(entryId, values);
      router.back();
    } catch (err) {
      setSaveError((err as Error).message);
      setSaving(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert('Delete this entry?', 'It will be removed from your collection.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await deleteEntry(entryId);
            router.back();
          } catch (err) {
            setSaveError((err as Error).message);
            setSaving(false);
          }
        },
      },
    ]);

  const loading = !initial && !loadError;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>
            {card?.name ?? (mode === 'edit' ? 'Edit entry' : 'Add to collection')}
          </Text>
          {card ? (
            <CardNumberBadge
              number={cardNumber(card.local_id, card.card_count_official)}
              rarity={card.rarity}
              rarityIconUri={card.rarity_icon_url}
            />
          ) : null}
        </View>
        <IconButton icon="x" label="Close" onPress={() => router.back()} />
      </View>

      <StatusView loading={loading} error={loadError} onRetry={() => setReloadKey((k) => k + 1)}>
        {card && initial ? (
          <EntryModalForm
            mode={mode}
            initialValues={initial}
            variantOptions={card.variant_options}
            submitting={saving}
            error={saveError}
            onSave={save}
            onDelete={mode === 'edit' ? confirmDelete : undefined}
          />
        ) : null}
      </StatusView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: theme.spacing.space2,
    padding: theme.spacing.space3,
    backgroundColor: theme.colors.bg,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.space1 },
  titleBlock: { flex: 1, gap: 4 },
  title: { fontFamily: theme.fonts.header, fontSize: theme.fontSizes.xl, color: theme.colors.text },
});