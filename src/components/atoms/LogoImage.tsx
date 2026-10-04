import LogoPlaceholder from '@/src/components/atoms/LogoPlaceholder';
import { useCachedImage } from '@/src/hooks/useCachedImage';
import { Image } from 'expo-image';
import { View, type ViewStyle } from 'react-native';

type Props = {
  uri: string | null;
  label: string;
  style: ViewStyle;
  iconSize?: number;
};

export default function LogoImage({ uri, label, style, iconSize }: Props) {
  const img = useCachedImage(uri, 'misc');
  const roomForLabel = typeof style.height === 'number' && style.height >= 48;

  return (
    <View style={style}>
      {!img.uri ? (
        <LogoPlaceholder iconSize={iconSize} showLabel={roomForLabel} />
      ) : (
        <Image
          source={{ uri: img.uri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
          transition={150}
          accessibilityLabel={label}
          onError={img.onError}
        />
      )}
    </View>
  );
}