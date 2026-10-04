import CardPlaceholder from '@/src/components/atoms/CardPlaceholder';
import { useCachedImage } from '@/src/hooks/useCachedImage';
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

  return (
    <Image
      source={{ uri: img.uri }}
      style={[styles.image, style]}
      contentFit="contain"
      transition={150}
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