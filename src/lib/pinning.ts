import { catalog } from '@/src/lib/catalog';
import { imageCache } from '@/src/lib/imageCache';
import { fetchAllOwned } from '@/src/lib/ownership';
import { fetchWishlistIds } from '@/src/lib/wishlist';

export async function runPinning() {
  const owned = await fetchAllOwned();
  const wished = await fetchWishlistIds();
  const ids = [...new Set([...owned.keys(), ...wished])];

  await catalog.ensureRarities();
  if (ids.length > 0) {
    await catalog.cardsByIds(ids).catch(() => {});
    await catalog.prefetchDetails(ids).catch(() => {});
  }
  const images = await imageCache.syncPinned(ids);
  return { images };
}