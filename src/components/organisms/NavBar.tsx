import PokedexIcon from '@/src/components/atoms/icons/PokedexIcon';
import theme from '@/src/theme/theme';
import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ICONS: Record<string, (color: string, size: number) => React.ReactNode> = {
  wishlist: (color, size) => <Feather name="heart" size={size} color={color} />,
  dashboard: (color, size) => <Feather name="home" size={size} color={color} />,
  pokedex: (color, size) => <PokedexIcon size={size} color={color} />,
};

export default function NavBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, theme.spacing.space2) }]}
    >
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const isFocused = state.index === index;
          const color = isFocused ? theme.colors.primary : theme.colors.text;
          const renderIcon = ICONS[route.name];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              hitSlop={8}
              style={styles.tab}
            >
              {renderIcon ? renderIcon(color, 22) : null}
              <Text style={[styles.label, { color }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    width: '90%',
    maxWidth: 420,
    backgroundColor: 'rgba(246, 242, 233, 0.85)', // theme.colors.surface @ 85% alpha
    borderRadius: 999,
    paddingVertical: theme.spacing.space1,
    paddingHorizontal: theme.spacing.space1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  tab: {
    flex: 1,
    minHeight: theme.a11y.touchTargetMin,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 999,
  },
  label: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm,
  },
});