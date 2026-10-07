import { getMeta, setMeta } from '@/src/lib/db';

const KEY = 'update_available';
const listeners = new Set<(v: boolean) => void>();

export const getUpdateFlag = async (): Promise<boolean> => (await getMeta(KEY)) === '1';

export async function setUpdateFlag(v: boolean): Promise<void> {
  await setMeta(KEY, v ? '1' : '0');
  listeners.forEach((fn) => fn(v));
}

export function subscribeUpdateFlag(fn: (v: boolean) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}