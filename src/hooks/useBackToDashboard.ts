import { useFocusEffect, useNavigation } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler } from 'react-native';

export function useBackToDashboard() {
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        navigation.getParent()?.navigate('dashboard' as never);
        return true;
      });
      return () => sub.remove();
    }, [navigation]),
  );
}