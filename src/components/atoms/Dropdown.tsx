import Icon from '@/src/components/atoms/Icon';
import theme from '@/src/theme/theme';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Option = { value: string; label: string };
type Props = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
};

export default function Dropdown({ label, value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? 'none selected'}`}
        onPress={() => setOpen(true)}
        style={styles.field}
      >
        <Text style={styles.value} numberOfLines={1}>
          {current?.label ?? 'Select'}
        </Text>
        <Icon name="chevron-down" size={18} color={theme.colors.text} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setOpen(false)}>
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityLabel="Close options"
          accessibilityRole="button"
        >
          <View style={styles.list} accessibilityViewIsModal>
            <Text style={styles.listTitle}>{label}</Text>
            <ScrollView>
              {options.map((o) => {
                const selected = o.value === value;
                return (
                  <Pressable
                    key={o.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    style={styles.option}
                  >
                    <Text style={[styles.optionText, selected && styles.optionSelected]}>{o.label}</Text>
                    {selected ? <Icon name="check" size={18} color={theme.colors.accent} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6, flex: 1 },
  label: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm, color: theme.colors.text },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.space1,
    minHeight: theme.a11y.touchTargetMin,
    paddingHorizontal: theme.spacing.space2,
    borderWidth: 1,
    borderColor: theme.colors.text,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  value: { flex: 1, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.base, color: theme.colors.text },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.space3,
    backgroundColor: 'rgba(32, 28, 28, 0.5)',
  },
  list: {
    maxHeight: '70%',
    padding: theme.spacing.space2,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  listTitle: {
    fontFamily: theme.fonts.header,
    fontSize: theme.fontSizes.xl,
    color: theme.colors.text,
    marginBottom: theme.spacing.space1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: theme.a11y.touchTargetMin,
  },
  optionText: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.base, color: theme.colors.text },
  optionSelected: { fontFamily: theme.fonts.bodyMedium },
});