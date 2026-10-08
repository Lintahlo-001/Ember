import theme from '@/src/theme/theme';
import { StyleSheet, Text, View } from 'react-native';

type Props = { label: string; price: string; showDivider?: boolean };

export default function PriceRow({ label, price, showDivider }: Props) {
  return (
    <View
      style={[styles.row, showDivider && styles.divider]}
      accessible
      accessibilityLabel={`${label}: ${price}`}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.price}>{price}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.space1,
    minHeight: 44,
    paddingVertical: theme.spacing.space1,
    paddingHorizontal: theme.spacing.space2,
  },
  divider: { borderTopWidth: 1.5, borderTopColor: theme.colors.text },
  label: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.base, color: theme.colors.text },
  price: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.base, color: theme.colors.text },
});