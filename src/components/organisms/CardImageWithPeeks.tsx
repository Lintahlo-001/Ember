import CardImage from '@/src/components/atoms/CardImage';
import theme from '@/src/theme/theme';
import { StyleSheet, View } from 'react-native';

type Props = {
  imageUri: string | null;
  name: string;
  prevImageUri?: string | null;
  nextImageUri?: string | null;
};

const PEEK_WIDTH = 28;

// Main image centered; dimmed neighbours peek in from each side. With no list
// context (Group 5 adds it) both peeks are simply empty gutters.
export default function CardImageWithPeeks({ imageUri, name, prevImageUri, nextImageUri }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.peek} accessible={false} importantForAccessibility="no-hide-descendants">
        {prevImageUri ? <CardImage uri={prevImageUri} name="Previous card" style={styles.peekImage} /> : null}
      </View>
      <View style={styles.main}>
        <CardImage uri={imageUri} name={name} />
      </View>
      <View style={styles.peek} accessible={false} importantForAccessibility="no-hide-descendants">
        {nextImageUri ? <CardImage uri={nextImageUri} name="Next card" style={styles.peekImage} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.space1 },
  main: { flex: 1, maxWidth: 280 },
  peek: { width: PEEK_WIDTH, height: '100%', overflow: 'hidden', justifyContent: 'center' },
  peekImage: { opacity: 0.4 },
});