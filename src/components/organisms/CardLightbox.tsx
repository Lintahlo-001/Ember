import CardImage from '@/src/components/atoms/CardImage';
import IconButton from '@/src/components/atoms/IconButton';
import theme from '@/src/theme/theme';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  uri: string | null;
  name: string;
  onClose: () => void;
};

const CARD_RATIO = 63 / 88;
const VERTICAL_CHROME = 120;

export default function CardLightbox({ visible, uri, name, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const maxByHeight = (height - insets.top - insets.bottom - VERTICAL_CHROME) * CARD_RATIO;
  const cardWidth = Math.min(width - theme.spacing.space3 * 2, maxByHeight);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root} accessibilityViewIsModal>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close larger card view"
        />
        <View style={{ width: cardWidth }} pointerEvents="none">
          <CardImage uri={uri} name={name} />
        </View>
        <View style={[styles.close, { top: insets.top + theme.spacing.space1 }]}>
          <IconButton icon="x" label="Close" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32, 28, 28, 0.88)',
  },
  close: { position: 'absolute', right: theme.spacing.space3 },
});