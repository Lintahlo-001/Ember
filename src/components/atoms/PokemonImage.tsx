import LogoPlaceholder from '@/src/components/atoms/LogoPlaceholder';
import { useCachedImage } from '@/src/hooks/useCachedImage';
import { Image } from 'expo-image';
import { View, type ViewStyle } from 'react-native';

type Props = {
  uri: string | null;
  name: string;
  style?: ViewStyle;
  iconSize?: number;
  cacheOnView?: boolean;
};

export default function PokemonImage({ uri, name, style, iconSize, cacheOnView }: Props) {
  const img = useCachedImage(uri, 'pokemon', cacheOnView);

  return (
    <View style={style}>
      {!img.uri ? (
        <LogoPlaceholder iconSize={iconSize} showLabel={false} />
      ) : (
        <Image
          source={{ uri: img.uri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
          transition={150}
          accessibilityLabel={`${name} artwork`}
          onError={img.onError}
        />
      )}
    </View>
  );
}