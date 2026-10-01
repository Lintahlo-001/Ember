import Icon from '@/src/components/atoms/Icon';
import theme from '@/src/theme/theme';
import {
    StyleSheet,
    View,
    type ImageStyle,
    type StyleProp,
} from 'react-native';

export default function CardPlaceholder({
  style,
}: {
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <View
      style={[styles.box, style]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.icon}>
        <Icon name="image" size={28} color={theme.colors.text} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    aspectRatio: 63 / 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  icon: {
    opacity: 0.45,
  },
});