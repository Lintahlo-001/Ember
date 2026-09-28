// One-off initial backfill: `npm run backfill`. Safe to Ctrl-C and re-run.
import { pool } from '../db';
import { syncMissingDetails } from '../sync';

async function main() {
  const started = Date.now();
  const { done, failed } = await syncMissingDetails();
  console.log(`Backfill done in ${Math.round((Date.now() - started) / 1000)}s: ${done} ok, ${failed} failed`);
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());