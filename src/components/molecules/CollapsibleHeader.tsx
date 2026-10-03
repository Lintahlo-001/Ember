import Icon from '@/src/components/atoms/Icon';
import theme from '@/src/theme/theme';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  tone: 'series' | 'set';
  leading?: ReactNode;
  meta?: string;
};

export default function CollapsibleHeader({ title, collapsed, onToggle, tone, leading, meta }: Props) {
  const color = tone === 'series' ? theme.colors.surface : theme.colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}${meta ? `, ${meta}` : ''}`}
      accessibilityState={{ expanded: !collapsed }}
      onPress={onToggle}
      style={[styles.row, tone === 'series' ? styles.series : styles.set]}
    >
      {leading}
      <Text style={[styles.title, tone === 'series' ? styles.seriesTitle : null, { color }]} numberOfLines={1}>
        {title}
      </Text>
      {meta ? <Text style={[styles.meta, { color }]}>{meta}</Text> : null}
      <Icon name={collapsed ? 'chevron-right' : 'chevron-down'} size={22} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.space1,
    minHeight: theme.a11y.touchTargetMin,
  },
  series: { paddingHorizontal: theme.spacing.space2, borderRadius: 12, backgroundColor: theme.colors.accent },
  set: { paddingHorizontal: 2 },
  title: { flex: 1, fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.base },
  seriesTitle: { fontFamily: theme.fonts.header, fontSize: theme.fontSizes.base },
  meta: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm },
});