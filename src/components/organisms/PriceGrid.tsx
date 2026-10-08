import PriceRow from '@/src/components/molecules/PriceRow';
import theme from '@/src/theme/theme';
import { StyleSheet, Text, View } from 'react-native';

type Props = { title: string; rows: { label: string; text: string }[] };

export default function PriceGrid({ title, rows }: Props) {
  return (
    <View style={styles.box}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {rows.map((r) => (
        <PriceRow key={r.label} label={r.label} price={r.text} showDivider />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  head: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.space2,
    backgroundColor: theme.colors.accent,
  },
  title: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.base, color: theme.colors.surface },
});