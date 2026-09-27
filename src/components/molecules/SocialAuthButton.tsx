import GoogleLogo from '@/src/components/atoms/icons/GoogleLogo';
import theme from '@/src/theme/theme';
import { Pressable, StyleSheet, Text } from 'react-native';

type Props = { provider: 'google'; onPress: () => void; disabled?: boolean };
const LABELS = { google: 'Continue with Google' };

export default function SocialAuthButton({ provider, onPress, disabled }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, disabled && styles.disabled]}
    >
      <GoogleLogo size={18} />
      <Text style={styles.label}>{LABELS[provider]}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.space1,
    minHeight: theme.a11y.touchTargetMin,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    width: '100%',
    backgroundColor: theme.colors.surface,
  },
  disabled: { opacity: 0.5 },
  label: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.base, color: theme.colors.text },
});