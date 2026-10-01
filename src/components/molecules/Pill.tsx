import Icon from '@/src/components/atoms/Icon';
import theme from '@/src/theme/theme';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

type Props = {
  label: string;
  icon?: ComponentProps<typeof Icon>['name'];
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

export default function Pill({ label, icon, onPress, accessibilityLabel, style }: Props) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      disabled={!onPress}
      hitSlop={{ top: 6, bottom: 6 }}
      style={[styles.pill, style]}
    >
      {icon ? <Icon name={icon} size={16} color={theme.colors.text} /> : null}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.space1,
    minHeight: 36,
    paddingHorizontal: theme.spacing.space2,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
  },
  label: { flexShrink: 1, fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm, color: theme.colors.text },
});