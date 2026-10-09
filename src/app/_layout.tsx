import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { imageCache } from '@/src/lib/imageCache';
import { setIssueHandler } from '@/src/lib/sync';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const [cacheReady, setCacheReady] = useState(false);
  useEffect(() => {
  imageCache.init().catch((err) => console.warn('Image cache init failed:', err)).finally(() => setCacheReady(true));
  }, []);
  const { loading: authLoading } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    'Anton-Regular': require('../../assets/fonts/Anton-Regular.ttf'),
    'WorkSans-Regular': require('../../assets/fonts/WorkSans-Regular.ttf'),
    'WorkSans-Medium': require('../../assets/fonts/WorkSans-Medium.ttf'),
  });
  
  useEffect(() => {
    setIssueHandler((message) => Alert.alert('Sync problem', message));
    return () => setIssueHandler(null);
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && !authLoading && cacheReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, authLoading, cacheReady]);

  if ((!fontsLoaded && !fontError) || authLoading || !cacheReady) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modals/ownership-entry" options={{ presentation: 'transparentModal', animation: 'fade' }}/>
        <Stack.Screen name="modals/pricing-detail" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}