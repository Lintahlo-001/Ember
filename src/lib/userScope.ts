import { getDb, getMeta, runTx, setMeta } from '@/src/lib/db';

let activeUser: string | null = null;
let generation = 0;
let binding: Promise<void> = Promise.resolve();

export const getActiveUserId = () => activeUser;
export const getGeneration = () => generation;

async function clearTables(): Promise<void> {
  await runTx(async (tx) => {
    await tx.runAsync('DELETE FROM ownership_entries');
    await tx.runAsync('DELETE FROM wishlist');
    await tx.runAsync('DELETE FROM favorite_sets');
    await tx.runAsync('DELETE FROM outbox');
    await tx.runAsync('UPDATE image_files SET pinned = 0'); 
  });
}

async function applyBind(id: string | null): Promise<void> {
  if (id === activeUser) return;
  if (id) {
    const owner = await getMeta('data_owner_id');
    if (owner && owner !== id) await clearTables(); 
    await setMeta('data_owner_id', id);
  }
  activeUser = id;
  generation++;
}

export function bindUser(id: string | null): Promise<void> {
  binding = binding.then(() => applyBind(id)).catch((err) => console.warn('bindUser failed:', err));
  return binding;
}

export async function currentUser(): Promise<string> {
  await binding;
  if (!activeUser) throw new Error('You are signed out. Log in again.');
  return activeUser;
}

export async function wipeUserData(): Promise<void> {
  generation++;
  await clearTables();
  const db = await getDb();
  await db.runAsync(
    "DELETE FROM meta WHERE key = 'data_owner_id' OR key LIKE 'pulled:%' OR key LIKE 'own_pull_since:%'",
  );
}