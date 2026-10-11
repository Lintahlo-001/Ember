import PokedexIcon from '@/src/components/atoms/icons/PokedexIcon';
import theme from '@/src/theme/theme';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { useEffect, type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabBarRenderer = NonNullable<ComponentProps<typeof Tabs>['tabBar']>;
type NavBarProps = Parameters<TabBarRenderer>[0];

const TAB_WIDTH = 90;
const TAB_GAP = 15;
const BORDER = 1.5;
const RADIUS = 12;
const INNER_RADIUS = RADIUS - BORDER;
const SLIDE_MS = 250;
const EASING = Easing.out(Easing.cubic);

const TAB_ORDER = ['wishlist', 'dashboard', 'pokedex'];
const rank = (name: string) => {
  const i = TAB_ORDER.indexOf(name);
  return i === -1 ? TAB_ORDER.length : i;
};

const ICONS: Record<string, (color: string, size: number) => ReactNode> = {
  wishlist: (color, size) => <Feather name="heart" size={size} color={color} />,
  dashboard: (color, size) => <Feather name="home" size={size} color={color} />,
  pokedex: (color, size) => <PokedexIcon size={size} color={color} />,
};

function TabContent({
  focused,
  label,
  renderIcon,
}: {
  focused: boolean;
  label: string;
  renderIcon?: (color: string, size: number) => ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const p = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    const target = focused ? 1 : 0;
    p.value = reduceMotion ? target : withTiming(target, { duration: SLIDE_MS, easing: EASING });
  }, [focused, reduceMotion, p]);

  const darkStyle = useAnimatedStyle(() => ({ opacity: 1 - p.value }));
  const lightStyle = useAnimatedStyle(() => ({ opacity: p.value }));

  const layer = (color: string) => (
    <>
      {renderIcon ? renderIcon(color, 16) : null}
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </>
  );

  return (
    <>
      <Animated.View style={[styles.content, darkStyle]}>{layer(theme.colors.text)}</Animated.View>
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.content, lightStyle]}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {layer(theme.colors.surface)}
      </Animated.View>
    </>
  );
}

export default function NavBar({ state, descriptors, navigation }: NavBarProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  const ordered = state.routes
    .map((route, index) => ({ route, index }))
    .sort((a, b) => rank(a.route.name) - rank(b.route.name));

  const activeSlot = Math.max(0, ordered.findIndex((o) => o.index === state.index));
  const slotX = useSharedValue(activeSlot * (TAB_WIDTH + TAB_GAP));

  useEffect(() => {
    const target = activeSlot * (TAB_WIDTH + TAB_GAP);
    slotX.value = reduceMotion ? target : withTiming(target, { duration: SLIDE_MS, easing: EASING });
  }, [activeSlot, reduceMotion, slotX]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slotX.value }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: insets.bottom + theme.spacing.space2 }]}
    >
      <View style={styles.shadowWrapper}>
        <BlurView intensity={40} tint="light" style={styles.blur}>
          <View style={styles.tint} />
          <View style={styles.row}>
            <Animated.View
              style={[styles.pill, pillStyle]}
              pointerEvents="none"
              accessible={false}
              importantForAccessibility="no-hide-descendants"
            />
            {ordered.map(({ route, index }) => {
              const { options } = descriptors[route.key];
              const label = options.title ?? route.name;
              const isFocused = state.index === index;

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
                  hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                  style={styles.tab}
                >
                  <TabContent focused={isFocused} label={label} renderIcon={ICONS[route.name]} />
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
    borderWidth: BORDER,
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  blur: {
    borderRadius: INNER_RADIUS,
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
  pill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: TAB_WIDTH,
    borderRadius: INNER_RADIUS,
    backgroundColor: theme.colors.accent,
  },
  tab: {
    width: TAB_WIDTH,
    paddingVertical: 5,
    borderRadius: INNER_RADIUS,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  label: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm,
  },
});