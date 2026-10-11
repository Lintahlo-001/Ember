import Icon from '@/src/components/atoms/Icon';
import theme from '@/src/theme/theme';
import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  tone: 'series' | 'set';
  leading?: ReactNode;
};

export default function CollapsibleHeader({ title, collapsed, onToggle, tone, leading }: Props) {
  const color = tone === 'series' ? theme.colors.surface : theme.colors.text;
  const reduceMotion = useReducedMotion();
  const rotation = useSharedValue(collapsed ? -90 : 0);

  useEffect(() => {
    const target = collapsed ? -90 : 0;
    rotation.value = reduceMotion ? target : withTiming(target, { duration: 250, easing: Easing.out(Easing.cubic) });
  }, [collapsed, reduceMotion, rotation]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ expanded: !collapsed }}
      onPress={onToggle}
      style={[styles.row, tone === 'series' ? styles.series : styles.set]}
    >
      {leading}
      <Text style={[styles.title, tone === 'series' ? styles.seriesTitle : null, { color }]} numberOfLines={1}>
        {title}
      </Text>
      <Animated.View style={chevronStyle} accessible={false} importantForAccessibility="no-hide-descendants">
        <Icon name="chevron-down" size={22} color={color} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.space1,
    minHeight: theme.a11y.touchTargetMin,
  },
  series: { paddingHorizontal: theme.spacing.space2, borderRadius: 12, backgroundColor: theme.colors.accent },
  set: { paddingHorizontal: 2 },
  title: { flex: 1, fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.base },
  seriesTitle: { fontFamily: theme.fonts.header, fontSize: theme.fontSizes.base },
});