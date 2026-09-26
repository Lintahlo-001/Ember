import theme from '@/src/theme/theme';
import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
  noBackground?: boolean;
  noPadding?: boolean;
  style?: ViewStyle;
};

export default function Screen({ children, noBackground, noPadding, style }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top },
        !noBackground && { backgroundColor: theme.colors.bg },
        !noPadding && { paddingHorizontal: theme.spacing.space3 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});