import LogoImage from '@/src/components/atoms/LogoImage';
import theme from '@/src/theme/theme';
import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  name: string;
  logoUri: string | null;
  cardCount: number;
  onPress: () => void;
};

// Owned/total progress joins this in Group 6 (needs per-set ownership counts).
export default function SetCard({ name, logoUri, cardCount, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${cardCount} cards`}
      onPress={onPress}
      style={styles.card}
    >
      <LogoImage uri={logoUri} label={`${name} logo`} style={styles.logo} iconSize={28} />
      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>
      <Text style={styles.count}>{cardCount} cards</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: 4,
    padding: theme.spacing.space1,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  logo: { width: '100%', height: 56 },
  name: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm, color: theme.colors.text },
  count: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, color: theme.colors.text },
});