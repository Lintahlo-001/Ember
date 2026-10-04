import Icon from '@/src/components/atoms/Icon';
import theme from '@/src/theme/theme';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export default function CardPlaceholder({
  style,
}: {
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[styles.box, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="No image available"
    >
      <View style={styles.icon}>
        <Icon name="image" size={28} color={theme.colors.text} />
      </View>
      <Text style={styles.text} numberOfLines={1} adjustsFontSizeToFit>
        No image
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    aspectRatio: 63 / 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  icon: { opacity: 0.45 },
  text: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text,
  },
});
