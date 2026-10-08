import { api } from '@/src/lib/api';
import { catalog } from '@/src/lib/catalog';
import { getMeta, setMeta } from '@/src/lib/db';
import { fetchAllOwned } from '@/src/lib/ownership';
import { fetchWishlistIds } from '@/src/lib/wishlist';

const KEY = 'last_price_sync_at';
const INTERVAL_MS = 24 * 60 * 60 * 1000;
const RETRY_MS = 10 * 60 * 1000;

let running: Promise<number> | null = null;
let lastFailedAt = 0;

async function run(force: boolean): Promise<number> {
  if (!force) {
    const last = Date.parse((await getMeta(KEY)) ?? '');
    if (!Number.isNaN(last) && Date.now() - last < INTERVAL_MS) return 0;
    if (Date.now() - lastFailedAt < RETRY_MS) return 0;
  }
  try {
    const owned = await fetchAllOwned();
    const wished = await fetchWishlistIds();
    const ids = [...new Set([...owned.keys(), ...wished])];
    if (ids.length > 0) await catalog.applyPrices(await api.prices(ids));
    await setMeta(KEY, new Date().toISOString());
    return ids.length;
  } catch (err) {
    lastFailedAt = Date.now();
    throw err;
  }
}

export function syncPrices(force = false): Promise<number> {
  running ??= run(force).finally(() => {
    running = null;
  });
  return running;
}