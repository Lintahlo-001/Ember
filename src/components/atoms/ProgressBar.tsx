import theme from '@/src/theme/theme';
import { StyleSheet, View } from 'react-native';

type Props = { value: number; label: string };
export default function ProgressBar({ value, label }: Props) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
      <View style={[styles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: theme.colors.accent },
});