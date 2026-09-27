import { useAuth } from '@/src/context/AuthContext';
import { Redirect } from 'expo-router';

export default function Index() {
  const { isLoggedIn, loading, session } = useAuth();
  console.log('[index] loading:', loading, 'isLoggedIn:', isLoggedIn, 'session:', session?.user?.email ?? null);
  return <Redirect href={isLoggedIn ? '/(tabs)/dashboard' : '/(auth)/welcome'} />;
}