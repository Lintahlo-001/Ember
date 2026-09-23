import { Stack } from 'expo-router';
import { AuthProvider } from '@/src/context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modals/ownership-entry" options={{ presentation: 'modal' }} />
        <Stack.Screen name="modals/pricing-detail" options={{ presentation: 'modal' }} />
      </Stack>
    </AuthProvider>
  );
}
