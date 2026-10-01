import { timingSafeEqual } from 'crypto';
import { Router } from 'express';
import { runDailySync } from '../jobs/dailySync';

export const internalSyncRouter = Router();

let running = false;

function secretMatches(header: string): boolean {
  const secret = process.env.CRON_SECRET ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (secret.length < 24 || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

internalSyncRouter.post('/internal/sync', (req, res) => {
  if (!secretMatches(req.headers.authorization ?? '')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (running) {
    res.status(409).json({ error: 'Sync already running' });
    return;
  }
  running = true;
  res.status(202).json({ status: 'started' });
  runDailySync()
    .then((summary) => console.log(summary))
    .catch((err) => console.error('Sync failed:', err))
    .finally(() => {
      running = false;
    });
});