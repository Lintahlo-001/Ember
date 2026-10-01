import Icon from '@/src/components/atoms/Icon';
import LogoImage from '@/src/components/atoms/LogoImage';
import CardNumberBadge from '@/src/components/molecules/CardNumberBadge';
import theme from '@/src/theme/theme';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  cardName: string;
  cardNumber: string;
  setName: string | null;
  setSymbolUri: string | null;
  rarity: string | null;
  rarityIconUri: string | null;
};

export default function CardDetailHeader({
  cardName,
  cardNumber,
  setName,
  setSymbolUri,
  rarity,
  rarityIconUri,
}: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={12}
        style={styles.back}
      >
        <Icon name="chevron-left" size={28} color={theme.colors.text} />
      </Pressable>

      <View style={styles.titleBlock}>
        <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>
          {cardName}
        </Text>
        <View style={styles.setRow}>
          <LogoImage uri={setSymbolUri} label="Set symbol" style={styles.symbol} iconSize={12} />
          <Text style={styles.setName} numberOfLines={1}>
            {setName ?? 'Unknown set'}
          </Text>
        </View>
      </View>

      <View style={styles.badge}>
        <CardNumberBadge number={cardNumber} rarity={rarity} rarityIconUri={rarityIconUri} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.space1 },
  back: { minHeight: theme.a11y.touchTargetMin, justifyContent: 'center' },
  titleBlock: { flex: 1, gap: 2, paddingTop: 6 },
  title: { fontFamily: theme.fonts.header, fontSize: theme.fontSizes.xl, color: theme.colors.text },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  symbol: { width: 20, height: 20 },
  setName: { flex: 1, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, color: theme.colors.text },
  badge: { maxWidth: '36%', paddingTop: 14 },
});