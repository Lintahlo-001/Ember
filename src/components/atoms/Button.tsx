import theme from '@/src/theme/theme';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  label: string;
  variant?: 'cta' | 'outline';
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export default function Button({ label, variant = 'cta', onPress, disabled, loading }: Props) {
  const isOutline = variant === 'outline';
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.base, isOutline ? styles.outline : styles.cta, isDisabled && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? theme.colors.primary : theme.colors.surface} />
      ) : (
        <Text style={[styles.label, isOutline ? styles.outlineLabel : styles.ctaLabel]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.a11y.touchTargetMin,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.space1,
    paddingHorizontal: theme.spacing.space3,
    width: '100%',
  },
  cta: { backgroundColor: theme.colors.accent },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.primary },
  disabled: { opacity: 0.5 },
  label: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.base },
  ctaLabel: { color: theme.colors.surface },
  outlineLabel: { color: theme.colors.text },
});