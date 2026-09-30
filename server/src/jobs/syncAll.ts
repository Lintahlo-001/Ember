import { pool } from '../db';
import { listPwSets, PwRateLimited, requestStats } from '../pokewallet';
import { recheckFallbackLogos, refreshStaleCards, syncAllSets, syncMissingDetails } from '../sync';
import { sweepCards, sweepSetLogos } from './fallbackSweep';

async function main() {
  const started = Date.now();
  const sets = await syncAllSets();
  const details = await syncMissingDetails(3000);
  const cards = await refreshStaleCards();
  const logoChecks = await recheckFallbackLogos();

  let fallbackCards = { done: 0, failed: 0, skipped: 0, stopped: false };
  let fallbackLogos = { done: 0, failed: 0, skipped: 0, stopped: false };
  try {
    const pwSets = await listPwSets();
    fallbackCards = await sweepCards(pwSets, 60);
    if (!fallbackCards.stopped) fallbackLogos = await sweepSetLogos(pwSets, 30);
  } catch (err) {
    if (err instanceof PwRateLimited) {
      console.warn(`PokeWallet rate limited${err.retryAfterSec ? ` (retry after ${err.retryAfterSec}s)` : ''} — skipping fallback phase this run.`);
    } else {
      throw err;
    }
  }

  console.log(
    `Sync done in ${Math.round((Date.now() - started) / 1000)}s: ` +
      `${sets.discovered} new sets, ${sets.updated} updated sets, ` +
      `${details.done} new card details (${details.failed} failed), ${cards} cards refreshed, ` +
      `${logoChecks.restored}/${logoChecks.checked} fallback logos restored to TCGdex, ` +
      `${fallbackCards.done} card fallbacks / ${fallbackLogos.done} logo fallbacks added ` +
      `(${requestStats.count} PokeWallet requests used)`,
  );
}

main()
  .catch((err) => { console.error('Sync failed:', err); process.exitCode = 1; })
  .finally(() => pool.end());