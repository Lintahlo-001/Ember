import theme from '@/src/theme/theme';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export default function BlurredBackdrop({ uri }: { uri: string | null }) {
  if (!uri) return null;
  const bg = theme.colors.bg;

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Image source={{ uri }} style={styles.image} contentFit="cover" blurRadius={4} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="backdropFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={bg} stopOpacity="1" />
            <Stop offset="0.2" stopColor={bg} stopOpacity="0" />
            <Stop offset="0.7" stopColor={bg} stopOpacity="0" />
            <Stop offset="1" stopColor={bg} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#backdropFade)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: '100%', opacity: 0.65 },
});