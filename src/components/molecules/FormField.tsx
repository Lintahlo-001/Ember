import TextInput from '@/src/components/atoms/TextInput';
import theme from '@/src/theme/theme';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = Omit<ComponentProps<typeof TextInput>, 'error'> & {
  label: string;
  error?: string;
};

export default function FormField({ label, error, ...inputProps }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...inputProps} error={!!error} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6, width: '100%' },
  label: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm, color: theme.colors.text },
  error: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, color: '#C0392B' },
});