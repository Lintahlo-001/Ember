import Icon from '@/src/components/atoms/Icon';
import theme from '@/src/theme/theme';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Pressable, TextInput as RNTextInput, StyleSheet, View } from 'react-native';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: boolean;
  leftIcon?: ComponentProps<typeof Icon>['name'];
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  textContentType?: ComponentProps<typeof RNTextInput>['textContentType'];
};

export default function TextInput({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  error,
  leftIcon,
  keyboardType = 'default',
  autoCapitalize = 'none',
  textContentType,
}: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const isPasswordField = !!secureTextEntry;

  return (
    <View style={[styles.wrapper, error && styles.wrapperError]}>
      {leftIcon ? <Icon name={leftIcon} size={18} color={theme.colors.text} /> : null}
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999"
        secureTextEntry={isPasswordField && !isVisible}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        textContentType={textContentType}
        style={styles.input}
      />
      {isPasswordField ? (
        <Pressable
          onPress={() => setIsVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={isVisible ? 'Hide password' : 'Show password'}
          hitSlop={8}
        >
          <Icon name={isVisible ? 'eye-off' : 'eye'} size={18} color={theme.colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.space1,
    minHeight: theme.a11y.touchTargetMin,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: theme.spacing.space2,
    backgroundColor: theme.colors.surface,
  },
  wrapperError: { borderColor: '#C0392B' },
  input: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    paddingVertical: theme.spacing.space1,
  },
});