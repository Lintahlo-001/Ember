// The daily catalog sync as a plain function, so it can run from the CLI
// (syncAll.ts) or from the HTTP trigger (routes/internalSync.ts).
// Never call pool.end() in here: the web server shares the pool.
// PokeWallet fallback sweeps are NOT part of this: run them by hand
// with `npm run sweep` so they can't contend with a manual backfill.
import { refreshFx } from '../fx';
import { recheckImages } from '../imageRecheck';
import { recheckFallbackLogos, refreshStaleCards, syncAllSets, syncMissingDetails } from '../sync';

const BUDGET_MS = 45 * 60_000;

export async function runDailySync(): Promise<string> {
  const started = Date.now();
  const deadline = started + BUDGET_MS;
  console.log('Daily sync started');

  const fx = await refreshFx().then(() => 'ok', (err) => `failed (${(err as Error).message})`);
  const sets = await syncAllSets();
  const logoChecks = await recheckFallbackLogos();
  const details = await syncMissingDetails(Infinity, 8, started + BUDGET_MS * 0.6);
  const cards = await refreshStaleCards(Math.max(0, deadline - Date.now()));
  const images = await recheckImages(1000);

  return (
    `Sync done in ${Math.round((Date.now() - started) / 1000)}s: ` +
    `${sets.discovered} new sets, ${sets.updated} updated sets, ` +
    `${details.done} new card details (${details.failed} failed), ${cards} cards refreshed, ` +
    `${logoChecks.restored}/${logoChecks.checked} fallback logos restored to TCGdex, ` +
    `${images.checked} images rechecked (${images.changed} changed, ${images.baselined} baselined, ${images.failed} failed), ` +
    `FX: ${fx}`
  );
}