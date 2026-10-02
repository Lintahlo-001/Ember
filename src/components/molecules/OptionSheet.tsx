import Icon from '@/src/components/atoms/Icon';
import theme from '@/src/theme/theme';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export default function OptionSheet({ visible, title, onClose, children, footer }: SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + theme.spacing.space2 }]}
          accessibilityViewIsModal
        >
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function OptionSectionLabel({ children }: { children: string }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function OptionRow({
  label,
  selected,
  onPress,
  multi,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  multi?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={multi ? { checked: selected } : { selected }}
      onPress={onPress}
      style={styles.row}
    >
      <Text style={[styles.rowText, selected && styles.rowSelected]}>{label}</Text>
      {multi ? (
        <Icon
          name={selected ? 'check-square' : 'square'}
          size={20}
          color={selected ? theme.colors.accent : theme.colors.text}
        />
      ) : selected ? (
        <Icon name="check" size={18} color={theme.colors.accent} />
      ) : (
        <View style={styles.checkSpace} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(32, 28, 28, 0.5)' },
  sheet: {
    maxHeight: '75%',
    paddingHorizontal: theme.spacing.space3,
    paddingTop: theme.spacing.space2,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: theme.colors.bg,
  },
  scroll: { flexShrink: 1 },
  footer: { paddingTop: theme.spacing.space2 },
  title: {
    fontFamily: theme.fonts.header,
    fontSize: theme.fontSizes.xl,
    color: theme.colors.text,
    marginBottom: theme.spacing.space1,
  },
  section: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text,
    marginTop: theme.spacing.space2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: theme.a11y.touchTargetMin,
  },
  rowText: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.base, color: theme.colors.text },
  rowSelected: { fontFamily: theme.fonts.bodyMedium },
  checkSpace: { width: 18 },
});