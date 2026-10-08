import Icon from '@/src/components/atoms/Icon';
import theme from '@/src/theme/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  regionName: string | null; // null = National
  onNational: () => void;
  onChangeRegion: () => void;
};

export default function RegionToggle({ regionName, onNational, onChangeRegion }: Props) {
  const nationalActive = regionName === null;

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: nationalActive }}
        accessibilityLabel={nationalActive ? 'National, selected' : 'National'}
        onPress={onNational}
        style={[styles.half, nationalActive && styles.active]}
      >
        {nationalActive ? <Icon name="check" size={16} color={theme.colors.surface} /> : null}
        <Text style={[styles.label, nationalActive && styles.activeLabel]}>National</Text>
      </Pressable>

      <View style={styles.divider} accessible={false} importantForAccessibility="no-hide-descendants" />

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: !nationalActive }}
        accessibilityLabel={regionName ? `${regionName} region, selected. Change region` : 'Change region'}
        onPress={onChangeRegion}
        style={[styles.half, !nationalActive && styles.active]}
      >
        <Text style={[styles.label, !nationalActive && styles.activeLabel]} numberOfLines={1}>
          {regionName ?? 'Change Region'}
        </Text>
        <Icon name="chevron-down" size={16} color={nationalActive ? theme.colors.text : theme.colors.surface} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    minHeight: theme.a11y.touchTargetMin,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  half: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.space1,
    minHeight: theme.a11y.touchTargetMin,
    paddingHorizontal: theme.spacing.space1,
  },
  divider: { width: 1.5, backgroundColor: theme.colors.text },
  active: { backgroundColor: theme.colors.accent },
  label: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.base, color: theme.colors.text },
  activeLabel: { color: theme.colors.surface },
});