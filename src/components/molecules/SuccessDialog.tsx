import Button from '@/src/components/atoms/Button';
import Icon from '@/src/components/atoms/Icon';
import theme from '@/src/theme/theme';
import { Modal, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  buttonLabel: string;
  onConfirm: () => void;
};

export default function SuccessDialog({ visible, title, message, buttonLabel, onConfirm }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onConfirm}
    >
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal accessibilityRole="alert">
          <View
            style={styles.iconCircle}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            <Icon name="check" size={28} color={theme.colors.surface} />
          </View>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.message}>{message}</Text>
          <Button label={buttonLabel} variant="cta" onPress={onConfirm} />
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
    maxWidth: 360,
    alignItems: 'center',
    gap: theme.spacing.space2,
    padding: theme.spacing.space3,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
  },
  title: {
    fontFamily: theme.fonts.header,
    fontSize: theme.fontSizes.xl,
    color: theme.colors.text,
    textAlign: 'center',
  },
  message: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    textAlign: 'center',
  },
});