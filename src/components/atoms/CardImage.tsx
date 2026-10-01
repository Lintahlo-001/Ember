import CardPlaceholder from '@/src/components/atoms/CardPlaceholder';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
    StyleSheet,
    type ImageStyle,
    type StyleProp,
} from 'react-native';

type Props = {
  uri: string | null;
  name: string;
  style?: StyleProp<ImageStyle>;
};

export default function CardImage({ uri, name, style }: Props) {
  const [failedUri, setFailedUri] = useState<string | null>(null);

  if (!uri || failedUri === uri) {
    return <CardPlaceholder style={style} />;
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.image, style]}
      contentFit="contain"
      transition={150}
      accessibilityLabel={name}
      onError={() => setFailedUri(uri)}
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