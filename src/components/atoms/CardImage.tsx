import CardPlaceholder from '@/src/components/atoms/CardPlaceholder';
import { useCachedImage } from '@/src/hooks/useCachedImage';
import { hasShown, markShown } from '@/src/lib/shownImages';
import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  uri: string | null;
  name: string;
  style?: StyleProp<ViewStyle>;
  cacheOnView?: boolean;
};

export default function CardImage({ uri, name, style, cacheOnView }: Props) {
  const img = useCachedImage(uri, 'card', cacheOnView);

  if (!img.uri) return <CardPlaceholder style={style} />;

  const shown = img.uri;
  return (
    <View style={[styles.frame, style]}>
      <Image
        source={{ uri: shown }}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        cachePolicy="memory-disk"
        recyclingKey={shown}
        transition={hasShown(shown) ? 0 : 150}
        onLoad={() => markShown(shown)}
        accessibilityLabel={name}
        onError={img.onError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: 63 / 88, borderRadius: 8, overflow: 'hidden' },
});