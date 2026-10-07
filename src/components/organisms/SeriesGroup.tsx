import CollapsibleHeader from '@/src/components/molecules/CollapsibleHeader';
import theme from '@/src/theme/theme';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  name: string;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export default function SeriesGroup({ name, collapsed, onToggle, children }: Props) {
  return (
    <View style={styles.box}>
      <CollapsibleHeader tone="series" title={name} collapsed={collapsed} onToggle={onToggle} />
      {collapsed ? null : <View style={styles.body}>{children}</View>}
    </View>
  );
}

export const SERIES_BODY_PADDING = theme.spacing.space1;

const styles = StyleSheet.create({
  box: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.accent,
    marginBottom: theme.spacing.space3,
  },
  body: { paddingHorizontal: SERIES_BODY_PADDING, paddingBottom: theme.spacing.space2 },
});