import LogoPlaceholder from '@/src/components/atoms/LogoPlaceholder';
import { useCachedImage } from '@/src/hooks/useCachedImage';
import { hasShown, markShown } from '@/src/lib/shownImages';
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
  const shown = img.uri;

  return (
    <View style={style}>
      {!shown ? (
        <LogoPlaceholder iconSize={iconSize} showLabel={roomForLabel} />
      ) : (
        <Image
          source={{ uri: shown }}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={hasShown(shown) ? 0 : 150}
          onLoad={() => markShown(shown)}
          accessibilityLabel={label}
          onError={img.onError}
        />
      )}
    </View>
  );
}