import Icon from '@/src/components/atoms/Icon';
import theme from '@/src/theme/theme';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

type Props = {
  style?: ViewStyle;
  iconSize?: number;
  showLabel?: boolean;
};

export default function LogoPlaceholder({ style, iconSize = 20, showLabel = true }: Props) {
  return (
    <View
      style={[styles.box, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="No image available"
    >
      <View style={styles.icon}>
        <Icon name="image" size={iconSize} color={theme.colors.text} />
      </View>
      {showLabel ? (
        <Text style={styles.text} numberOfLines={1} adjustsFontSizeToFit>
          No image
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
  },
  icon: { opacity: 0.4 },
  text: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm, color: theme.colors.text },
});