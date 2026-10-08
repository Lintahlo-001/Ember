import CardImage from '@/src/components/atoms/CardImage';
import IconButton from '@/src/components/atoms/IconButton';
import CardNumberBadge from '@/src/components/molecules/CardNumberBadge';
import SegmentedTabs from '@/src/components/molecules/SegmentedTabs';
import StatusView from '@/src/components/molecules/StatusView';
import PriceGrid from '@/src/components/organisms/PriceGrid';
import { useCurrency } from '@/src/hooks/useCurrency';
import type { CardDetail, CardPricing, VariantPrice } from '@/src/lib/api';
import { catalog } from '@/src/lib/catalog';
import { cardNumber, formatReleaseDate } from '@/src/lib/format';
import theme from '@/src/theme/theme';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CARD_ID_RE = /^[A-Za-z0-9._-]{1,40}$/;
type SourceKey = 'tcgplayer' | 'cardmarket';
const TABS: { value: SourceKey; label: string }[] = [
  { value: 'tcgplayer', label: 'TCGplayer' },
  { value: 'cardmarket', label: 'Cardmarket' },
];

export default function PricingDetailModal() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ cardId?: string }>();
  const cardId = typeof params.cardId === 'string' ? params.cardId : '';
  const { code, ratesReady, format } = useCurrency();

  const [card, setCard] = useState<CardDetail | null>(null);
  const [pricing, setPricing] = useState<CardPricing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [picked, setPicked] = useState<SourceKey | null>(null);

  useEffect(() => {
    if (!CARD_ID_RE.test(cardId)) {
      setError('This link is not valid.');
      return;
    }
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const [c, p] = await Promise.all([
          catalog.card(cardId),
          catalog.pricing(cardId, (fresh) => !cancelled && setPricing(fresh)),
        ]);
        if (cancelled) return;
        setCard(c);
        setPricing(p);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cardId, reloadKey]);

  const active: SourceKey = picked ?? (pricing?.tcgplayer ? 'tcgplayer' : pricing?.cardmarket ? 'cardmarket' : 'tcgplayer');
  const source = pricing?.[active] ?? null;
  const label = TABS.find((t) => t.value === active)!.label;

  const rowsFor = (v: VariantPrice) =>
    (
      [
        ['Market', v.market],
        ['Low', v.low],
        ['Mid', v.mid],
        ['High', v.high],
      ] as const
    ).map(([name, value]) => ({
      label: name,
      text: value === null || !source ? '—' : format(value, source.unit),
    }));

  const note = !source
    ? null
    : ratesReady
      ? source.unit === code
        ? `Prices in ${code}.`
        : `Converted from ${source.unit} to ${code}.`
      : `Showing ${source.unit}. Exchange rates aren't available yet.`;

  const loading = !error && !(card && pricing);

  return (
    <View style={styles.root}>
      <Pressable
        style={styles.backdrop}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      <Animated.View
        entering={SlideInDown.duration(250)}
        style={[styles.sheet, { paddingBottom: insets.bottom + theme.spacing.space2 }]}
      >
        <View style={styles.grabber} accessible={false} importantForAccessibility="no-hide-descendants" />
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            Pricing Details
          </Text>
          <IconButton icon="x" label="Close" onPress={() => router.back()} />
        </View>

        <StatusView loading={loading} error={error} onRetry={() => setReloadKey((k) => k + 1)}>
          {card && pricing ? (
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.summary}>
                <View style={styles.thumb}>
                  <CardImage uri={card.image_url} name={card.name} />
                </View>
                <View style={styles.summaryText}>
                  <Text style={styles.cardName} numberOfLines={2}>
                    {card.name}
                  </Text>
                  <CardNumberBadge
                    number={cardNumber(card.local_id, card.card_count_official)}
                    rarity={card.rarity}
                    rarityIconUri={card.rarity_icon_url}
                  />
                </View>
              </View>

              <SegmentedTabs options={TABS} value={active} onChange={setPicked} />

              {source ? (
                <>
                  <Text style={styles.note}>
                    {note}
                    {source.updated ? ` Updated ${formatReleaseDate(source.updated)}.` : ''}
                  </Text>
                  {source.variants.map((v) => (
                    <PriceGrid key={v.key} title={v.label} rows={rowsFor(v)} />
                  ))}
                </>
              ) : (
                <Text style={styles.note}>No {label} pricing is available for this card yet.</Text>
              )}
            </ScrollView>
          ) : null}
        </StatusView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(32, 28, 28, 0.5)' },
  sheet: {
    height: '75%',
    gap: theme.spacing.space2,
    paddingHorizontal: theme.spacing.space3,
    paddingTop: theme.spacing.space1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: theme.colors.bg,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.text,
    opacity: 0.3,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: theme.fonts.header, fontSize: theme.fontSizes.xl, color: theme.colors.text },
  content: { gap: theme.spacing.space2, paddingBottom: theme.spacing.space4 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.space2 },
  thumb: { width: 84 },
  summaryText: { flex: 1, gap: 4 },
  cardName: { fontFamily: theme.fonts.header, fontSize: theme.fontSizes.base, color: theme.colors.text },
  note: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, color: theme.colors.text },
});