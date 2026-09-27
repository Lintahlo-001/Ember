import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { loading: authLoading } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    'Anton-Regular': require('../../assets/fonts/Anton-Regular.ttf'),
    'WorkSans-Regular': require('../../assets/fonts/WorkSans-Regular.ttf'),
    'WorkSans-Medium': require('../../assets/fonts/WorkSans-Medium.ttf'),
  });

  useEffect(() => {
    if ((fontsLoaded || fontError) && !authLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, authLoading]);

  if ((!fontsLoaded && !fontError) || authLoading) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modals/ownership-entry" options={{ presentation: 'modal' }} />
        <Stack.Screen name="modals/pricing-detail" options={{ presentation: 'modal' }} />
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