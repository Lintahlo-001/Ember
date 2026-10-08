import CardPlaceholder from '@/src/components/atoms/CardPlaceholder';
import { useCachedImage } from '@/src/hooks/useCachedImage';
import { hasShown, markShown } from '@/src/lib/shownImages';
import { Image } from 'expo-image';
import { StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

type Props = {
  uri: string | null;
  name: string;
  style?: StyleProp<ImageStyle>;
  cacheOnView?: boolean;
};

export default function CardImage({ uri, name, style, cacheOnView }: Props) {
  const img = useCachedImage(uri, 'card', cacheOnView);

  if (!img.uri) return <CardPlaceholder style={style} />;

  const shown = img.uri;
  return (
    <Image
      source={{ uri: shown }}
      style={[styles.image, style]}
      contentFit="contain"
      cachePolicy="memory-disk"
      transition={hasShown(shown) ? 0 : 150}
      onLoad={() => markShown(shown)}
      accessibilityLabel={name}
      onError={img.onError}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    aspectRatio: 63 / 88,
    borderRadius: 8,
  },
});