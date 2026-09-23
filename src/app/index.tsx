import { Redirect } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';

// Entry point: gated on auth state, not a one-time flag, per the Welcome
// screen requirement (every logged-out cold launch lands on Welcome).
export default function Index() {
  const { isLoggedIn } = useAuth();
  return <Redirect href={isLoggedIn ? '/(tabs)/dashboard' : '/(auth)/welcome'} />;
}
