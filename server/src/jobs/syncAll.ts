// Run once a day (Render Cron Job -> `npm run sync:prod`) or manually: `npm run sync`.
import { pool } from '../db';
import { listPwSets, requestStats } from '../pokewallet';
import { recheckFallbackLogos, refreshStaleCards, syncAllSets, syncMissingDetails } from '../sync';
import { sweepCards, sweepSetLogos } from './fallbackSweep';

async function main() {
  const started = Date.now();
  const sets = await syncAllSets();
  const details = await syncMissingDetails(3000);
  const cards = await refreshStaleCards();
  const logoChecks = await recheckFallbackLogos();
  const pwSets = await listPwSets();
  const fallbackCards = await sweepCards(pwSets, 60);
  const fallbackLogos = fallbackCards.stopped
    ? { done: 0, failed: 0, skipped: 0, stopped: true }
    : await sweepSetLogos(pwSets, 30);

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
  .catch((err) => {
    console.error('Sync failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());