import LogoImage from '@/src/components/atoms/LogoImage';
import theme from '@/src/theme/theme';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  number: string;
  rarity: string | null;
  rarityIconUri: string | null;
};

export default function CardNumberBadge({ number, rarity, rarityIconUri }: Props) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`Card ${number}${rarity ? `, ${rarity}` : ''}`}
    >
      {rarityIconUri ? (
        <LogoImage uri={rarityIconUri} label={rarity ?? 'Rarity'} style={styles.icon} iconSize={14} />
      ) : rarity ? (
        <Text style={styles.rarity} numberOfLines={1}>
          {rarity}
        </Text>
      ) : null}
      <Text style={styles.number}>{number}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.space1 },
  icon: { width: 18, height: 18 },
  rarity: {
    flexShrink: 1,
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text,
  },
  number: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.base, color: theme.colors.text },
});