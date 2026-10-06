import { hasKey, localKeys, setWanted, type Cfg } from '@/src/lib/desired';

const CFG: Cfg = { kind: 'wishlist', table: 'wishlist', re: /^[A-Za-z0-9._-]{1,40}$/ };

export const fetchWishlistIds = (): Promise<string[]> => localKeys(CFG);
export const isWishlisted = (cardId: string): Promise<boolean> => hasKey(CFG, cardId);
export const addToWishlist = (cardId: string): Promise<void> => setWanted(CFG, cardId, true);
export const removeFromWishlist = (cardId: string): Promise<void> => setWanted(CFG, cardId, false);