import PokemonImage from '@/src/components/atoms/PokemonImage';
import ProgressBar from '@/src/components/atoms/ProgressBar';
import { formatDexNumber } from '@/src/lib/pokedex';
import theme from '@/src/theme/theme';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  dexId: number;
  name: string;
  imageUri: string;
  description: string | null;
  owned: number;
  total: number;
};

export default function PokemonSummaryCard({ dexId, name, imageUri, description, owned, total }: Props) {
  const progress = total > 0 ? owned / total : 0;
  const pct = Math.round(progress * 100);

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <PokemonImage uri={imageUri} name={name} style={styles.image} iconSize={28} cacheOnView />
        <View style={styles.textCol}>
          <Text style={styles.name} accessibilityRole="header">
            {name} <Text style={styles.number}>{formatDexNumber(dexId)}</Text>
          </Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
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
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.space1 },
  image: { width: 96, height: 96 },
  textCol: { flex: 1, gap: 4 },
  name: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.base, color: theme.colors.text },
  number: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm },
  description: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, color: theme.colors.text },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  small: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, color: theme.colors.text },
});