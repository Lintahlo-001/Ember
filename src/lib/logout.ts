import { flush, pendingCount } from '@/src/lib/sync';
import { Alert } from 'react-native';

// Tries to push first, then warns if anything is still unsynced. Settings (step 5) reuses this.
export async function requestLogout(logout: () => Promise<void>, onDone: () => void): Promise<void> {
  await flush().catch(() => {});
  const n = await pendingCount();
  const go = async () => {
    await logout();
    onDone();
  };
  if (n === 0) return go();
  Alert.alert(
    'Unsynced changes',
    `${n} change${n === 1 ? '' : 's'} haven't reached the server yet and will be lost if you log out.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out anyway', style: 'destructive', onPress: () => void go() },
    ],
  );
}