import Icon from '@/src/components/atoms/Icon';
import theme from '@/src/theme/theme';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

type Props = {
  icon?: ComponentProps<typeof Icon>['name'];
  renderIcon?: (color: string, size: number) => ReactNode;
  label: string;
  onPress?: () => void;
  active?: boolean;
  disabled?: boolean;
  size?: number;
};

export default function IconButton({
  icon,
  renderIcon,
  label,
  onPress,
  active,
  disabled,
  size = 40,
}: Props) {
  const slop = Math.max(0, (theme.a11y.touchTargetMin - size) / 2);
  const iconColor = active ? theme.colors.surface : theme.colors.text;
  const iconSize = Math.round(size * 0.5);

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
      {renderIcon ? (
        renderIcon(iconColor, iconSize)
      ) : icon ? (
        <Icon name={icon} size={iconSize} color={iconColor} />
      ) : null}
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
  active: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  disabled: {
    opacity: 0.5,
  },
});
