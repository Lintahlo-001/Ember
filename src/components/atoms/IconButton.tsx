import Icon from '@/src/components/atoms/Icon';
import theme from '@/src/theme/theme';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

type Props = {
  icon: ComponentProps<typeof Icon>['name'];
  label: string;
  onPress?: () => void;
  active?: boolean;
  disabled?: boolean;
  size?: number;
};

export default function IconButton({ icon, label, onPress, active, disabled, size = 40 }: Props) {
  const slop = Math.max(0, (theme.a11y.touchTargetMin - size) / 2);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={slop}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        active && styles.active,
        disabled && styles.disabled,
      ]}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} color={active ? theme.colors.surface : theme.colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  active: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  disabled: { opacity: 0.5 },
});