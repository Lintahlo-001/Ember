import Button from '@/src/components/atoms/Button';
import Icon from '@/src/components/atoms/Icon';
import FormField from '@/src/components/molecules/FormField';
import theme from '@/src/theme/theme';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  phrase: string;
  confirmLabel: string;
  icon?: ComponentProps<typeof Icon>['name'];
  onConfirm: () => void;
  onCancel: () => void;
};

export default function TypeToConfirmDialog({
  visible, title, message, phrase, confirmLabel, icon = 'trash-2', onConfirm, onCancel,
}: Props) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (!visible) setText('');
  }, [visible]);

  const matches = text.trim() === phrase;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />
        <View style={styles.card} accessibilityViewIsModal accessibilityRole="alert">
          <View style={styles.iconCircle} accessible={false} importantForAccessibility="no-hide-descendants">
            <Icon name={icon} size={24} color={theme.colors.surface} />
          </View>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.message}>{message}</Text>

          <FormField
            label={`Type "${phrase}" to confirm`}
            value={text}
            onChangeText={(t) => setText(t.toLowerCase())}
            placeholder={phrase}
            autoCapitalize="none"
            autoCorrect={false}
            />

          <View style={styles.buttons}>
            <View style={styles.slot}>
              <Button label="Cancel" variant="outline" onPress={onCancel} />
            </View>
            <View style={styles.slot}>
              <Button label={confirmLabel} variant="cta" onPress={onConfirm} disabled={!matches} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    maxWidth: 360,
    alignItems: 'center',
    gap: theme.spacing.space2,
    padding: theme.spacing.space3,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
  },
  title: { fontFamily: theme.fonts.header, fontSize: theme.fontSizes.xl, color: theme.colors.text, textAlign: 'center' },
  message: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.base, color: theme.colors.text, textAlign: 'center' },
  buttons: { width: '100%', flexDirection: 'row', gap: theme.spacing.space1 },
  slot: { flex: 1 },
});