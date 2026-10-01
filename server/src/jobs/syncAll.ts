// CLI entry: `npm run sync` (local) or `npm run sync:prod`.
// The same work is also reachable over HTTP via POST /internal/sync (cron-job.org).
import { pool } from '../db';
import { runDailySync } from './dailySync';

runDailySync()
  .then((summary) => console.log(summary))
  .catch((err) => {
    console.error('Sync failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());