import theme from '@/src/theme/theme';
import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
};

export function ActionDialog({ visible, title, message, confirmLabel, cancelLabel, icon = 'info', destructive, onConfirm, onCancel }: Props) {
  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onCancel ?? onConfirm}>
      <View style={s.backdrop}>
        <View style={s.card} accessibilityViewIsModal>
          <Feather name={icon} size={32} color={destructive ? theme.colors.accent : theme.colors.primary} />
          <Text style={s.title}>{title}</Text>
          {!!message && <Text style={s.message}>{message}</Text>}
          <Pressable onPress={onConfirm} accessibilityRole="button" style={[s.btn, { backgroundColor: theme.colors.accent }]}>
            <Text style={s.btnText}>{confirmLabel}</Text>
          </Pressable>
          {!!cancelLabel && (
            <Pressable onPress={onCancel} accessibilityRole="button" style={[s.btn, s.ghost]}>
              <Text style={[s.btnText, { color: theme.colors.text }]}>{cancelLabel}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(32,28,28,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 24, alignItems: 'center', gap: 12 },
  title: { fontFamily: 'Anton-Regular', fontSize: 22, color: theme.colors.text, textAlign: 'center' },
  message: { fontFamily: 'WorkSans-Regular', fontSize: 15, lineHeight: 22, color: theme.colors.text, textAlign: 'center' },
  btn: { minHeight: 48, alignSelf: 'stretch', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  ghost: { backgroundColor: 'transparent' },
  btnText: { fontFamily: 'WorkSans-Medium', fontSize: 16, color: '#fff' },
});