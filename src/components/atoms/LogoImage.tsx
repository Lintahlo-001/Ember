import LogoPlaceholder from '@/src/components/atoms/LogoPlaceholder';
import { Image } from 'expo-image';
import { useState } from 'react';
import { View, type ViewStyle } from 'react-native';

type Props = {
  uri: string | null;
  label: string; 
  style: ViewStyle;
  iconSize?: number;
};

export default function LogoImage({ uri, label, style, iconSize }: Props) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showPlaceholder = !uri || failedUri === uri;

  return (
    <View style={style}>
      {showPlaceholder ? (
        <LogoPlaceholder iconSize={iconSize} />
      ) : (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
          transition={150}
          accessibilityLabel={label}
          onError={() => setFailedUri(uri)}
        />
      )}
    </View>
  );
}