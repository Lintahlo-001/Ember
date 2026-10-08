import Icon from '@/src/components/atoms/Icon';
import IconButton from '@/src/components/atoms/IconButton';
import type { Region } from '@/src/lib/api';
import theme from '@/src/theme/theme';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  regions: Region[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
};

export default function RegionSelectSheet({ visible, regions, selectedId, onSelect, onClose }: Props) {
  const rows = [
    { id: null as string | null, name: 'National', icon: 'globe' as const },
    ...regions.map((r) => ({ id: r.id as string | null, name: r.name, icon: 'map-pin' as const })),
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close region list"
        />
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              Select Region
            </Text>
            <IconButton icon="x" label="Close" onPress={onClose} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {rows.map((r) => {
              const selected = r.id === selectedId;
              return (
                <Pressable
                  key={r.id ?? 'national'}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => onSelect(r.id)}
                  style={[styles.row, selected && styles.rowSelected]}
                >
                  <View accessible={false} importantForAccessibility="no-hide-descendants">
                    <Icon name={r.icon} size={18} color={theme.colors.text} />
                  </View>
                  <Text style={[styles.rowText, selected && styles.rowTextSelected]}>{r.name}</Text>
                  {selected ? <Icon name="check-circle" size={20} color={theme.colors.accent} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.space3,
    backgroundColor: 'rgba(32, 28, 28, 0.5)',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    maxHeight: '80%',
    gap: theme.spacing.space1,
    padding: theme.spacing.space2,
    borderRadius: 16,
    backgroundColor: theme.colors.bg,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: theme.fonts.header, fontSize: theme.fontSizes.xl, color: theme.colors.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.space2,
    minHeight: theme.a11y.touchTargetMin,
    marginBottom: 6,
    paddingHorizontal: theme.spacing.space2,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  rowSelected: { borderWidth: 1.5, borderColor: theme.colors.accent },
  rowText: { flex: 1, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.base, color: theme.colors.text },
  rowTextSelected: { fontFamily: theme.fonts.bodyMedium },
});