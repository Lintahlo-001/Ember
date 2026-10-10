import Icon from '@/src/components/atoms/Icon';
import theme from '@/src/theme/theme';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  icon: ComponentProps<typeof Icon>['name'];
  label: string;
  subtext?: string;
  onPress?: () => void;
  busy?: boolean;
  showDivider?: boolean;
  badge?: boolean;
  destructive?: boolean;
};

export default function SettingsRow({
  icon, label, subtext, onPress, busy, showDivider, badge, destructive,
}: Props) {
  const tone = destructive ? theme.colors.accent : theme.colors.text;

  const body = (
    <>
      <View style={styles.iconWrap} accessible={false} importantForAccessibility="no-hide-descendants">
        <Icon name={icon} size={22} color={tone} />
        {badge ? <View style={styles.dot} /> : null}
      </View>
      <View style={styles.text}>
        <Text style={[styles.label, { color: tone }]}>{label}</Text>
        {subtext ? (
          <Text style={styles.subtext} accessibilityLiveRegion={busy ? 'polite' : 'none'}>
            {subtext}
          </Text>
        ) : null}
      </View>
      {busy ? (
        <ActivityIndicator color={theme.colors.accent} />
      ) : onPress ? (
        <View accessible={false} importantForAccessibility="no-hide-descendants">
          <Icon name="chevron-right" size={22} color={tone} />
        </View>
      ) : null}
    </>
  );

  const style = [
    styles.row,
    showDivider && styles.divider,
    showDivider && destructive && styles.dividerDanger,
  ];

  if (!onPress) {
    return (
      <View style={style} accessible accessibilityLabel={subtext ? `${label}. ${subtext}` : label}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtext ? `${label}. ${subtext}` : label}
      accessibilityState={{ busy: !!busy, disabled: !!busy }}
      onPress={onPress}
      disabled={busy}
      style={style}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.space2,
    minHeight: 56,
    paddingVertical: theme.spacing.space1,
    paddingHorizontal: theme.spacing.space2,
  },
  divider: { borderTopWidth: 1.5, borderTopColor: theme.colors.text },
  dividerDanger: { borderTopColor: theme.colors.accent },
  iconWrap: { position: 'relative' },
  dot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    backgroundColor: theme.colors.accent,
  },
  text: { flex: 1 },
  label: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.base },
  subtext: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, color: theme.colors.text },
});