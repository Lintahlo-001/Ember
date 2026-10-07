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
};

export default function SettingsRow({ icon, label, subtext, onPress, busy, showDivider }: Props) {
  const body = (
    <>
      <View accessible={false} importantForAccessibility="no-hide-descendants">
        <Icon name={icon} size={22} color={theme.colors.text} />
      </View>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
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
          <Icon name="chevron-right" size={22} color={theme.colors.text} />
        </View>
      ) : null}
    </>
  );

  const style = [styles.row, showDivider && styles.divider];

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
  text: { flex: 1 },
  label: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.base, color: theme.colors.text },
  subtext: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, color: theme.colors.text },
});