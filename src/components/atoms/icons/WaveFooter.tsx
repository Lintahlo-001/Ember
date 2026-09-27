import theme from '@/src/theme/theme';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export default function WaveFooter({ height = 120 }: { height?: number }) {
  return (
    <View style={[styles.wrapper, { height }]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 400 120" preserveAspectRatio="none">
        <Path
          d="M0,45 C90,90 130,10 220,35 C300,55 340,15 400,40 L400,120 L0,120 Z"
          fill={theme.colors.primary}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});