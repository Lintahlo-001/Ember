import Icon from '@/src/components/atoms/Icon';
import theme from '@/src/theme/theme';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

const MIN = 1;
const MAX = 9999;

type Props = {
  value: number;
  onChange: (n: number) => void;
  deleteAtMin?: boolean;
  onDeleteRequest?: () => void;
  label?: string;
};

const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n));

export default function QuantityStepper({
  value,
  onChange,
  deleteAtMin,
  onDeleteRequest,
  label = 'Quantity',
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const n = parseInt(draft, 10);
    setDraft(null);
    if (Number.isFinite(n) && clamp(n) !== value) onChange(clamp(n));
  };

  const showDelete = !!deleteAtMin && value <= MIN;

  return (
    <View style={styles.row}>
      {showDelete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete entry"
          onPress={onDeleteRequest}
          hitSlop={4}
          style={[styles.button, styles.delete]}
        >
          <Icon name="trash-2" size={18} color={theme.colors.accent} />
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Decrease quantity"
          accessibilityState={{ disabled: value <= MIN }}
          disabled={value <= MIN}
          onPress={() => onChange(clamp(value - 1))}
          hitSlop={4}
          style={[styles.button, value <= MIN && styles.disabled]}
        >
          <Icon name="minus" size={18} color={theme.colors.text} />
        </Pressable>
      )}

      <TextInput
        value={draft ?? String(value)}
        onChangeText={(t) => setDraft(t.replace(/[^0-9]/g, '').slice(0, 4))}
        onBlur={commit}
        onSubmitEditing={commit}
        keyboardType="number-pad"
        selectTextOnFocus
        maxLength={4}
        accessibilityLabel={label}
        style={styles.input}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        accessibilityState={{ disabled: value >= MAX }}
        disabled={value >= MAX}
        onPress={() => onChange(clamp(value + 1))}
        hitSlop={4}
        style={[styles.button, value >= MAX && styles.disabled]}
      >
        <Icon name="plus" size={18} color={theme.colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.space1 },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  delete: { borderColor: theme.colors.accent },
  disabled: { opacity: 0.4 },
  input: {
    minWidth: 56,
    height: 40,
    textAlign: 'center',
    paddingVertical: 0,
    paddingHorizontal: theme.spacing.space1,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    fontFamily: theme.fonts.bodyMedium,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
  },
});