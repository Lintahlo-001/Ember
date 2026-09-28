// Run once a day (Render Cron Job -> `npm run sync:prod`) or manually: `npm run sync`.
import { pool } from '../db';
import { refreshStaleCards, syncAllSets, syncMissingDetails } from '../sync';

async function main() {
  const started = Date.now();
  const sets = await syncAllSets();
  const details = await syncMissingDetails(3000);
  const cards = await refreshStaleCards();
  console.log(
    `Sync done in ${Math.round((Date.now() - started) / 1000)}s: ` +
      `${sets.discovered} new sets, ${sets.updated} updated sets, ` +
      `${details.done} new card details (${details.failed} failed), ${cards} cards refreshed`,
  );
}

main()
  .catch((err) => {
    console.error('Sync failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());