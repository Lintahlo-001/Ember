import * as Linking from 'expo-linking';

let latest: string | null = null;
const subs = new Set<(url: string) => void>();

function take(url: string | null) {
  if (!url || !url.includes('reset-password')) return;
  latest = url;
  subs.forEach((fn) => fn(url));
}

Linking.getInitialURL().then(take).catch(() => {});
Linking.addEventListener('url', (e) => take(e.url));

export const getRecoveryUrl = () => latest;
export const clearRecoveryUrl = () => { latest = null; };
export const subscribeRecovery = (fn: (url: string) => void) => {
  subs.add(fn);
  return () => { subs.delete(fn); };
};