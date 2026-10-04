import { catalog } from '@/src/lib/catalog';
import { imageCache } from '@/src/lib/imageCache';
import { fetchWishlistIds } from '@/src/lib/wishlist';
import { useEffect, useMemo } from 'react';

export function usePinnedImages(owned: Map<string, number>, ready: boolean) {
  const key = useMemo(() => [...owned.keys()].sort().join(','), [owned]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const wished = await fetchWishlistIds();
        const ids = [...new Set([...(key ? key.split(',') : []), ...wished])];
        await catalog.ensureRarities();
        if (ids.length > 0) await catalog.cardsByIds(ids).catch(() => {});
        const r = await imageCache.syncPinned(ids);
        if (r.downloaded || r.failed) console.log('Image cache:', r);
      } catch (err) {
        console.warn('Image pinning skipped:', (err as Error).message);
      }
    }, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, ready]);
}