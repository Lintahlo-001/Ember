// The daily catalog sync as a plain function, so it can run from the CLI
// (syncAll.ts) or from the HTTP trigger (routes/internalSync.ts).
// Never call pool.end() in here: the web server shares the pool.
// PokeWallet fallback sweeps are NOT part of this: run them by hand
// with `npm run sweep` so they can't contend with a manual backfill.
import { recheckImages } from '../imageRecheck';
import { recheckFallbackLogos, refreshStaleCards, syncAllSets, syncMissingDetails } from '../sync';

export async function runDailySync(): Promise<string> {
  const started = Date.now();
  const sets = await syncAllSets();
  const details = await syncMissingDetails(3000);
  const cards = await refreshStaleCards();
  const logoChecks = await recheckFallbackLogos();
  const images = await recheckImages(1000);

  return (
    `Sync done in ${Math.round((Date.now() - started) / 1000)}s: ` +
    `${sets.discovered} new sets, ${sets.updated} updated sets, ` +
    `${details.done} new card details (${details.failed} failed), ${cards} cards refreshed, ` +
    `${logoChecks.restored}/${logoChecks.checked} fallback logos restored to TCGdex, ` +
    `${images.checked} images rechecked (${images.changed} changed, ${images.baselined} baselined, ${images.failed} failed)`
    
  );
}