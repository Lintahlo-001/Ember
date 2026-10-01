import Icon from '@/src/components/atoms/Icon';
import theme from '@/src/theme/theme';
import { StyleSheet, View, type ViewStyle } from 'react-native';

// Stand-in for set logos, set symbols and rarity icons.
export default function LogoPlaceholder({
  style,
  iconSize = 20,
}: {
  style?: ViewStyle;
  iconSize?: number;
}) {
  return (
    <View
      style={[styles.box, style]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.icon}>
        <Icon name="image" size={iconSize} color={theme.colors.text} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
  },
  icon: { opacity: 0.4 },
});