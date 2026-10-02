import { useNavigation } from 'expo-router';
import { useEffect, type RefObject } from 'react';
import type { FlatList } from 'react-native';

export function useScrollToTopOnTabPress(ref: RefObject<FlatList<any> | null>) {
  const navigation = useNavigation();

  useEffect(() => {
    const tabNavigation = navigation.getParent();
    if (!tabNavigation) return;
    return (tabNavigation as any).addListener('tabPress', (e: { defaultPrevented?: boolean }) => {
      if (!navigation.isFocused()) return;
      requestAnimationFrame(() => {
        if (!e.defaultPrevented) ref.current?.scrollToOffset({ offset: 0, animated: true });
      });
    });
  }, [navigation, ref]);
}