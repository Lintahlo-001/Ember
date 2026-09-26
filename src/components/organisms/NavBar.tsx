import PokedexIcon from '@/src/components/atoms/icons/PokedexIcon';
import theme from '@/src/theme/theme';
import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabBarRenderer = NonNullable<ComponentProps<typeof Tabs>['tabBar']>;
type NavBarProps = Parameters<TabBarRenderer>[0];

const ICONS: Record<string, (color: string, size: number) => React.ReactNode> = {
  wishlist: (color, size) => <Feather name="heart" size={size} color={color} />,
  dashboard: (color, size) => <Feather name="home" size={size} color={color} />,
  pokedex: (color, size) => <PokedexIcon size={size} color={color} />,
};

export default function NavBar({ state, descriptors, navigation }: NavBarProps) {
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
          const iconColor = isFocused ? theme.colors.surface : theme.colors.text;
          const labelColor = isFocused ? theme.colors.accent : theme.colors.text;
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
              <View style={[styles.iconChip, isFocused && styles.iconChipActive]}>
                {renderIcon ? renderIcon(iconColor, 22) : null}
              </View>
              <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
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
    backgroundColor: 'rgba(246, 242, 233, 0.55)',
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
  iconChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  iconChipActive: {
    backgroundColor: theme.colors.accent,
  },
  label: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm,
  },
});