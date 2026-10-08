import LogoImage from '@/src/components/atoms/LogoImage';
import ProgressBar from '@/src/components/atoms/ProgressBar';
import { useCurrency } from '@/src/hooks/useCurrency';
import { formatReleaseDate } from '@/src/lib/format';
import theme from '@/src/theme/theme';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  name: string;
  logoUri: string | null;
  releaseDate: string | null;
  totalValue: number;
  currency: string;
  owned: number;
  total: number;
};

export default function SetDetailHeader({
  name,
  logoUri,
  releaseDate,
  totalValue,
  currency,
  owned,
  total,
}: Props) {
  const progress = total > 0 ? owned / total : 0;
  const pct = Math.round(progress * 100);
  const { format } = useCurrency();

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <LogoImage uri={logoUri} label={`${name} logo`} style={styles.logo} iconSize={32} />
        <View style={styles.titleBlock}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          <Text style={styles.small}>{formatReleaseDate(releaseDate)}</Text>
        </View>
        <View style={styles.valueBlock}>
          <Text style={styles.small}>Estimated value</Text>
          <Text style={styles.value}>{format(totalValue, currency)}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <Text style={styles.small}>
          {owned}/{total} owned
        </Text>
        <Text style={styles.small}>{pct}% complete</Text>
      </View>
      <ProgressBar value={progress} label={`${name} collection progress`} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.space1,
    padding: theme.spacing.space2,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.space1 },
  logo: { width: 90, height: 66 },
  titleBlock: { flex: 1 },
  name: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.base, color: theme.colors.text },
  valueBlock: { alignItems: 'flex-end' },
  value: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.base, color: theme.colors.text },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  small: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, color: theme.colors.text },
});