import Button from '@/src/components/atoms/Button';
import Dropdown from '@/src/components/atoms/Dropdown';
import FormField from '@/src/components/molecules/FormField';
import QuantityStepper from '@/src/components/molecules/QuantityStepper';
import { variantLabel } from '@/src/lib/format';
import { CONDITIONS, type Condition, type EntryValues } from '@/src/lib/ownership';
import theme from '@/src/theme/theme';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = {
  mode: 'add' | 'edit';
  initialValues: EntryValues;
  variantOptions: string[];
  submitting: boolean;
  error: string | null;
  onSave: (values: EntryValues) => void;
  onDelete?: () => void;
};

export default function EntryModalForm({
  mode,
  initialValues,
  variantOptions,
  submitting,
  error,
  onSave,
  onDelete,
}: Props) {
  const [values, setValues] = useState<EntryValues>(initialValues);
  const set = <K extends keyof EntryValues>(key: K, v: EntryValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const variants = variantOptions.includes(values.variant) ? variantOptions : [values.variant, ...variantOptions];

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <View style={styles.quantity}>
        <Text style={styles.label}>Quantity</Text>
        <QuantityStepper value={values.quantity} onChange={(n) => set('quantity', n)} />
      </View>

      <View style={styles.dropdowns}>
        <Dropdown
          label="Condition"
          value={values.condition}
          options={CONDITIONS.map((c) => ({ value: c, label: c }))}
          onChange={(v) => set('condition', v as Condition)}
        />
        <Dropdown
          label="Variant"
          value={values.variant}
          options={variants.map((v) => ({ value: v, label: variantLabel(v) }))}
          onChange={(v) => set('variant', v)}
        />
      </View>

      <FormField
        label="Notes (optional)"
        value={values.notes}
        onChangeText={(t) => set('notes', t)}
        placeholder="Where you got it, grading details…"
        multiline
        maxLength={500}
        autoCapitalize="sentences"
      />

      {mode === 'add' ? (
        <Text style={styles.hint}>
          Adding the same variant and condition again combines the quantities.
        </Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label={mode === 'add' ? 'Add' : 'Save'}
        variant="cta"
        onPress={() => onSave(values)}
        loading={submitting}
      />
      {mode === 'edit' && onDelete ? (
        <Button label="Delete entry" variant="outline" onPress={onDelete} disabled={submitting} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form: { gap: theme.spacing.space2, paddingBottom: theme.spacing.space4 },
  quantity: { gap: 6, alignItems: 'flex-start' },
  label: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm, color: theme.colors.text },
  dropdowns: { flexDirection: 'row', gap: theme.spacing.space1 },
  hint: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, color: theme.colors.text },
  error: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, color: '#C0392B', textAlign: 'center' },
});