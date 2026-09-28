import theme from '@/src/theme/theme';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const LOOP_DURATION_MS = 9000;
export default function WaveFooter({ height = 150 }: { height?: number }) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const offset = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    offset.value = withRepeat(
      withTiming(-width, { duration: LOOP_DURATION_MS, easing: Easing.linear }),
      -1,
      false
    );
    return () => cancelAnimation(offset);
  }, [offset, width, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <View style={[styles.wrapper, { height }]} pointerEvents="none">
      <Animated.View style={[{ width: width * 2, height }, animatedStyle]}>
        <Svg width={width * 2} height={height} viewBox="0 0 800 120" preserveAspectRatio="none">
          <Path
            d="M0,50 Q100,10 200,50 T400,50 T600,50 T800,50 L800,120 L0,120 Z"
            fill={theme.colors.primary}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    alignItems: 'flex-start',
  },
});