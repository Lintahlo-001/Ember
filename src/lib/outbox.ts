import type { Tx } from '@/src/lib/db';
import { uuid } from '@/src/lib/uuid';

export type OpKind = 'own_add' | 'own_update' | 'own_delete' | 'wishlist' | 'favorite';

export type OpRow = {
  seq: number;
  op_id: string;
  user_id: string;
  kind: OpKind;
  entity_key: string;
  payload: string;
  status: 'pending' | 'failed' | 'blocked';
  attempts: number;
};

export async function insertOp(tx: Tx, uid: string, kind: OpKind, entityKey: string, payload: unknown) {
  await tx.runAsync(
    'INSERT INTO outbox (op_id, user_id, kind, entity_key, payload, created_at) VALUES (?,?,?,?,?,?)',
    [uuid(), uid, kind, entityKey, JSON.stringify(payload), new Date().toISOString()],
  );
}

export async function putDesired(tx: Tx, uid: string, kind: 'wishlist' | 'favorite', key: string, want: boolean) {
  const existing = await tx.getFirstAsync<{ seq: number }>(
    'SELECT seq FROM outbox WHERE user_id = ? AND kind = ? AND entity_key = ?',
    [uid, kind, key],
  );
  if (existing) {
    await tx.runAsync(
      "UPDATE outbox SET payload = ?, status = 'pending', attempts = 0, last_error = NULL WHERE seq = ?",
      [JSON.stringify({ want }), existing.seq],
    );
  } else {
    await insertOp(tx, uid, kind, key, { want });
  }
}