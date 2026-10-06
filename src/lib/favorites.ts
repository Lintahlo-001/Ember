import { hasKey, localKeys, setWanted, type Cfg } from '@/src/lib/desired';

const CFG: Cfg = { kind: 'favorite', table: 'favorite_sets', re: /^[A-Za-z0-9._-]{1,40}$/ };

export const fetchFavoriteSetIds = async (): Promise<Set<string>> => new Set(await localKeys(CFG));
export const isFavoriteSet = (setId: string): Promise<boolean> => hasKey(CFG, setId);
export const addFavoriteSet = (setId: string): Promise<void> => setWanted(CFG, setId, true);
export const removeFavoriteSet = (setId: string): Promise<void> => setWanted(CFG, setId, false);