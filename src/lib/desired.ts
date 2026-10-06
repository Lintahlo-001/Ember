import { getDb, runTx } from '@/src/lib/db';
import { putDesired } from '@/src/lib/outbox';
import { ensureInitialPull, kickFlush } from '@/src/lib/sync';
import { currentUser } from '@/src/lib/userScope';

export type Cfg = { kind: 'wishlist' | 'favorite'; table: 'wishlist' | 'favorite_sets'; re: RegExp };

export async function localKeys(cfg: Cfg): Promise<string[]> {
  const uid = await currentUser();
  await ensureInitialPull();
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string }>(
    `SELECT key FROM ${cfg.table} WHERE user_id = ? ORDER BY rowid DESC`,
    [uid],
  );
  return rows.map((r) => r.key);
}

export async function hasKey(cfg: Cfg, key: string): Promise<boolean> {
  const uid = await currentUser();
  await ensureInitialPull();
  const db = await getDb();
  return !!(await db.getFirstAsync(`SELECT 1 AS x FROM ${cfg.table} WHERE user_id = ? AND key = ?`, [uid, key]));
}

export async function setWanted(cfg: Cfg, key: string, want: boolean): Promise<void> {
  if (!cfg.re.test(key)) throw new Error('One of the values is not allowed.');
  const uid = await currentUser();
  await ensureInitialPull();
  await runTx(async (tx) => {
    if (want) {
      await tx.runAsync(
        `INSERT INTO ${cfg.table} (user_id, key, sync_state) VALUES (?,?, 'pending')
         ON CONFLICT(user_id, key) DO UPDATE SET sync_state = 'pending'`,
        [uid, key],
      );
    } else {
      await tx.runAsync(`DELETE FROM ${cfg.table} WHERE user_id = ? AND key = ?`, [uid, key]);
    }
    await putDesired(tx, uid, cfg.kind, key, want);
  });
  kickFlush();
}