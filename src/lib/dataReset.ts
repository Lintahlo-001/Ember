import { supabase } from '@/src/lib/supabase';
import { flush } from '@/src/lib/sync';
import { bindUser, wipeUserData } from '@/src/lib/userScope';
import NetInfo from '@react-native-community/netinfo';

async function clearTable(table: 'ownership_entries' | 'wishlist_entries'): Promise<number> {
  const net = await NetInfo.fetch();
  if (net.isConnected === false || net.isInternetReachable === false) {
    throw new Error('You need an internet connection to clear this data.');
  }
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) throw new Error('Please log in again.');

  try { await flush(); }
  catch { throw new Error("Couldn't sync your pending changes first. Please try again."); }

  const { count, error } = await supabase.from(table).delete({ count: 'exact' }).eq('user_id', uid);
  if (error) throw new Error('Could not clear your data. Please try again.');

  await wipeUserData();
  await bindUser(uid);
  return count ?? 0;
}

export const clearOwnedCards = () => clearTable('ownership_entries');
export const clearWishlist = () => clearTable('wishlist_entries');