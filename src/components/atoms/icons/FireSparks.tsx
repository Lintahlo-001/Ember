import theme from '@/src/theme/theme';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const SPARK_COUNT = 6;
const RADIUS = 110;

function Spark({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2c-2 4-6 7-6 12a6 6 0 0012 0c0-2-.8-3.6-1.8-4.8.2 1.6-.6 2.4-1.7 2.4-1.4 0-2-1.2-1.5-2.6C11.8 7 12.8 5 12 2z"
        fill={color}
      />
    </Svg>
  );
}

export default function FireSparks({ size = 260 }: { size?: number }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 14000, easing: Easing.linear }), -1, false);
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const sparks = Array.from({ length: SPARK_COUNT }, (_, i) => {
    const angle = (i / SPARK_COUNT) * 2 * Math.PI;
    return {
      key: i,
      x: size / 2 + RADIUS * Math.cos(angle) - 8,
      y: size / 2 + RADIUS * Math.sin(angle) - 8,
      color: i % 2 === 0 ? theme.colors.accent : theme.colors.primary,
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        {sparks.map((spark) => (
          <View key={spark.key} style={[styles.spark, { left: spark.x, top: spark.y }]}>
            <Spark size={16} color={spark.color} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  spark: { position: 'absolute' },
});