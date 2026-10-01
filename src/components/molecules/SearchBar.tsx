import Icon from '@/src/components/atoms/Icon';
import theme from '@/src/theme/theme';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  placeholder: string;
  accessibilityLabel?: string;
  variant?: 'outlined' | 'filled';
};

export default function SearchBar({
  value,
  onChangeText,
  onSubmit,
  placeholder,
  accessibilityLabel,
  variant = 'outlined',
}: Props) {
  return (
    <View style={[styles.wrapper, variant === 'filled' && styles.filled]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor="#777"
        accessibilityLabel={accessibilityLabel ?? placeholder}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search"
        onPress={onSubmit}
        disabled={!onSubmit}
        hitSlop={8}
      >
        <Icon name="search" size={20} color={theme.colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.space1,
    minHeight: theme.a11y.touchTargetMin,
    paddingHorizontal: theme.spacing.space2,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  filled: { backgroundColor: '#E2DCCB' },
  input: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    paddingVertical: theme.spacing.space1,
  },
});