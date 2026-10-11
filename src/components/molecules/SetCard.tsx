import LogoImage from '@/src/components/atoms/LogoImage';
import ProgressBar from '@/src/components/atoms/ProgressBar';
import theme from '@/src/theme/theme';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  id: string;
  name: string;
  logoUri: string | null;
  cardCount: number;
  owned: number;
  onPress: (id: string) => void;
};

function SetCard({ id, name, logoUri, cardCount, owned, onPress }: Props) {
  const progress = cardCount > 0 ? Math.min(1, owned / cardCount) : 0;
  const pct = Math.round(progress * 100);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${owned} of ${cardCount} owned, ${pct} percent complete`}
      onPress={() => onPress(id)}
      style={styles.card}
    >
      <LogoImage uri={logoUri} label={`${name} logo`} style={styles.logo} iconSize={28} />
      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>
      <ProgressBar value={progress} label={`${name} collection progress`} />
      <View style={styles.stats}>
        <Text style={styles.small}>
          {owned}/{cardCount}
        </Text>
        <Text style={styles.small}>{pct}%</Text>
      </View>
    </Pressable>
  );
}

export default memo(SetCard);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: theme.spacing.space1,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    marginHorizontal: 0.5,
  },
  logo: { width: '100%', height: 56 },
  name: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm, color: theme.colors.text },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  small: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, color: theme.colors.text },
});