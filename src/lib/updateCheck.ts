import { api, type RarityIcon } from '@/src/lib/api';
import { catalog } from '@/src/lib/catalog';
import { ensureFx } from '@/src/lib/currency';
import { getMeta, setMeta } from '@/src/lib/db';
import { syncPrices } from '@/src/lib/prices';
import { diffStatus } from '@/src/lib/refresh';
import { setUpdateFlag } from '@/src/lib/updateFlag';
import { AppState } from 'react-native';

const INTERVAL_MS = 24 * 60 * 60 * 1000;
const RETRY_MS = 10 * 60 * 1000;
const LAST_CHECK = 'last_check_at';

export type CheckResult = 'skipped' | 'current' | 'available' | 'failed';

const raritiesDiffer = (server: RarityIcon[], local: { name: string; icon_url: string }[]) => {
  if (server.length !== local.length) return true;
  const byName = new Map(local.map((r) => [r.name, r.icon_url]));
  return server.some((r) => byName.get(r.name) !== r.icon_url);
};

let running: Promise<CheckResult> | null = null;
let lastFailedAt = 0;

async function run(force: boolean): Promise<CheckResult> {
  if (!(await getMeta('sets_cached_at'))) return 'skipped';
  
  void syncPrices(force).catch((err) => console.warn('Price sync failed:', (err as Error).message));
  void ensureFx().catch(() => {});

  if (!force) {
    const last = Date.parse((await getMeta(LAST_CHECK)) ?? '');
    if (!Number.isNaN(last) && Date.now() - last < INTERVAL_MS) return 'skipped';
    if (Date.now() - lastFailedAt < RETRY_MS) return 'skipped';
  }

  try {
    const [server, local] = await Promise.all([api.setsStatus(), catalog.localSetStates()]);
    const d = diffStatus(server, local);
    let available = d.added.length > 0 || d.removed.length > 0 || d.metaBehind;

    if (!available && (await getMeta('rarities_cached_at'))) {
      const [remote, cached] = await Promise.all([api.rarities(), catalog.localRarities()]);
      available = raritiesDiffer(remote, cached);
    }

    await setUpdateFlag(available);
    await setMeta(LAST_CHECK, new Date().toISOString());
    return available ? 'available' : 'current';
  } catch (err) {
    lastFailedAt = Date.now();
    console.warn('Update check failed:', (err as Error).message);
    return 'failed'; 
  }
}

export function checkForUpdates(force = false): Promise<CheckResult> {
  running ??= run(force).finally(() => {
    running = null;
  });
  return running;
}

let started = false;
export function startUpdateChecks(): void {
  if (started) return;
  started = true;
  setTimeout(() => void checkForUpdates(), 5000);
  AppState.addEventListener('change', (s) => {
    if (s === 'active') void checkForUpdates();
  });
}