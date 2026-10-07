import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ember.onboarding.seen.v1';

export const hasSeenOnboarding = async () => (await AsyncStorage.getItem(KEY)) === '1';
export const markOnboardingSeen = () => AsyncStorage.setItem(KEY, '1');
export const resetOnboarding = () => AsyncStorage.removeItem(KEY);