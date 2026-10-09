import theme from '@/src/theme/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  rank: number;
  name: string;
  subtitle: string;
  price: string;
  onPress?: () => void;
};

export default function RankedCardRow({ rank, name, subtitle, price, onPress }: Props) {
  return (
    <Pressable
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`Number ${rank}, ${name}, ${subtitle}, ${price}`}
      onPress={onPress}
    >
      <Text style={styles.rank}>{rank}.</Text>
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Text style={styles.price} numberOfLines={1}>
        {price}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.space1,
    minHeight: theme.a11y.touchTargetMin,
    paddingHorizontal: theme.spacing.space2,
    paddingVertical: theme.spacing.space1,
  },
  rank: { width: 24, fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.base, color: theme.colors.text },
  text: { flex: 1 },
  name: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.base, color: theme.colors.text },
  sub: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, color: theme.colors.text },
  price: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.base, color: theme.colors.text },
});