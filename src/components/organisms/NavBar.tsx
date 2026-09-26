import PokedexIcon from '@/src/components/atoms/icons/PokedexIcon';
import theme from '@/src/theme/theme';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabBarRenderer = NonNullable<ComponentProps<typeof Tabs>['tabBar']>;
type NavBarProps = Parameters<TabBarRenderer>[0];

const TAB_WIDTH =90;
const TAB_GAP = 15;
const RADIUS = 12;

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
      style={[
        styles.wrapper,
        { paddingBottom: insets.bottom + theme.spacing.space2 },
      ]}
    >
      <View style={styles.shadowWrapper}>
        <BlurView intensity={40} tint="light" style={styles.blur}>
          <View style={styles.tint} />
          <View style={styles.row}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const label = options.title ?? route.name;
              const isFocused = state.index === index;
              const contentColor = isFocused ? theme.colors.surface : theme.colors.text;
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
                  key={`${route.key}-${isFocused}`}
                  onPress={onPress}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isFocused }}
                  accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                  hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                  style={[styles.tab, isFocused && styles.tabActive]}
                >
                  {renderIcon ? renderIcon(contentColor, 16) : null}
                  <Text style={[styles.label, { color: contentColor }]} numberOfLines={1}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </BlurView>
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
  shadowWrapper: {
    borderRadius: RADIUS,
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  blur: {
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  tint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(246, 242, 233, 0.35)',
  },
  row: {
    flexDirection: 'row',
    gap: TAB_GAP,
  },
  tab: {
    width: TAB_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingVertical: 5,
    borderRadius: RADIUS,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
    tabActive: {
    backgroundColor: theme.colors.accent,
  },
  label: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm,
  },
});