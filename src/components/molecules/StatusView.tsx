import Button from '@/src/components/atoms/Button';
import theme from '@/src/theme/theme';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

type Props = {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  children: ReactNode;
};

export default function StatusView({ loading, error, onRetry, children }: Props) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!loading) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading) {
    return (
      <View style={styles.center} accessibilityLiveRegion="polite">
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={styles.text}>Loading…</Text>
        {slow ? (
          <Text style={styles.hint}>The server is waking up. This can take up to a minute.</Text>
        ) : null}
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center} accessibilityLiveRegion="polite">
        <Text style={styles.text}>{error}</Text>
        <View style={styles.retry}>
          <Button label="Try again" variant="cta" onPress={onRetry} />
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.space1,
    padding: theme.spacing.space3,
  },
  text: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.base, color: theme.colors.text, textAlign: 'center' },
  hint: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, color: theme.colors.text, textAlign: 'center' },
  retry: { width: 200, marginTop: theme.spacing.space1 },
});