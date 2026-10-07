import { api, type SetStatus } from '@/src/lib/api';
import { catalog, type LocalSetState } from '@/src/lib/catalog';
import { setMeta } from '@/src/lib/db';
import { runPinning } from '@/src/lib/pinning';
import { flush, pendingCount } from '@/src/lib/sync';
import { setUpdateFlag } from '@/src/lib/updateFlag';
;

const BIG_SET = 2000;

const same = (a?: string | null, b?: string | null) =>
  !a && !b ? true : !!a && !!b && Date.parse(a) === Date.parse(b);

export type SetDiff = {
  added: string[];
  removed: string[];
  metaBehind: boolean; 
  cardsBehind: SetStatus[];
};

export function diffStatus(server: SetStatus[], local: LocalSetState[]): SetDiff {
  const localById = new Map(local.map((l) => [l.id, l]));
  const serverIds = new Set(server.map((s) => s.id));
  const added: string[] = [];
  const cardsBehind: SetStatus[] = [];
  let metaBehind = false;

  for (const s of server) {
    const l = localById.get(s.id);
    if (!l) {
      added.push(s.id);
      continue;
    }
    if (!same(s.synced_at, l.synced_at) || !same(s.images_updated_at, l.images_updated_at)) metaBehind = true;
    if (l.cards_cached_at && (!same(s.cards_synced_at, l.cards_synced_at) || !same(s.images_updated_at, l.images_updated_at))) {
      cardsBehind.push(s);
    }
  }
  const removed = local.filter((l) => !serverIds.has(l.id)).map((l) => l.id);
  return { added, removed, metaBehind, cardsBehind };
}

export type RefreshSummary = {
  setsAdded: number;
  setsRemoved: number;
  setsUpdated: number;
  cardsChanged: number;
  failedSets: number;
  imagesDownloaded: number;
  imagesFailed: number;
  pendingChanges: number;
};

const NETWORK_ERR = /reach the server|too long|signed out/i;

async function run(onProgress?: (text: string) => void): Promise<RefreshSummary> {
  const say = (t: string) => onProgress?.(t);
  const summary: RefreshSummary = {
    setsAdded: 0, setsRemoved: 0, setsUpdated: 0, cardsChanged: 0,
    failedSets: 0, imagesDownloaded: 0, imagesFailed: 0, pendingChanges: 0,
  };

  say('Contacting server…');
  const server = await api.setsStatus();

  say('Syncing your changes…');
  await flush({ full: true }).catch(() => {});

  const local = await catalog.localSetStates();
  const diff = diffStatus(server, local);

  if (diff.added.length > 0 || diff.removed.length > 0 || diff.metaBehind) {
    say('Updating sets…');
    const fresh = await api.sets();
    await catalog.saveSets(fresh);
    const present = new Set(fresh.map((s) => s.id));
    const gone = local.filter((l) => !present.has(l.id)).map((l) => l.id);
    if (gone.length > 0) await catalog.removeSets(gone);
    summary.setsAdded = diff.added.length;
    summary.setsRemoved = gone.length;
  }

  let i = 0;
  for (const s of diff.cardsBehind) {
    say(`Updating cards… ${++i}/${diff.cardsBehind.length}`);
    try {
      const known = await catalog.localCardTriples(s.id);
      if (known.length > BIG_SET) {
        await catalog.refetchSet(s.id);
      } else {
        const { changed, removed } = await api.setChanges(s.id, known);
        await catalog.applyChanges(s.id, changed, removed, s.images_updated_at);
        summary.cardsChanged += changed.length;
      }
      summary.setsUpdated++;
    } catch (err) {
      summary.failedSets++;
      console.warn('Set refresh failed:', s.id, (err as Error).message);
      if (NETWORK_ERR.test((err as Error).message)) {
        summary.failedSets += diff.cardsBehind.length - i;
        break;
      }
    }
  }

  say('Updating icons…');
  await catalog.syncRarities().catch(() => {});

  say('Updating images…');
  const pinned = await runPinning().catch((err) => {
    console.warn('Pinning failed:', (err as Error).message);
    return null;
  });
  if (pinned) {
    summary.imagesDownloaded = pinned.images.downloaded;
    summary.imagesFailed = pinned.images.failed;
  }

  summary.pendingChanges = await pendingCount();
  await setMeta('last_refresh_at', new Date().toISOString());
  await setMeta('last_check_at', new Date().toISOString());
  await setUpdateFlag(false);
  return summary;
}

let running: Promise<RefreshSummary> | null = null;

export function refreshAll(onProgress?: (text: string) => void): Promise<RefreshSummary> {
  running ??= run(onProgress).finally(() => {
    running = null;
  });
  return running;
}

export function summarize(s: RefreshSummary): string {
  const n = (c: number, w: string) => `${c} ${w}${c === 1 ? '' : 's'}`;
  const parts: string[] = [];
  if (s.setsAdded) parts.push(`${n(s.setsAdded, 'new set')}`);
  if (s.setsRemoved) parts.push(`${s.setsRemoved} removed`);
  if (s.cardsChanged) parts.push(`${n(s.cardsChanged, 'card')} updated`);
  if (s.imagesDownloaded) parts.push(n(s.imagesDownloaded, 'image'));
  const head = parts.length ? `Updated: ${parts.join(', ')}.` : 'Everything is up to date.';

  const problems: string[] = [];
  if (s.failedSets) problems.push(`${n(s.failedSets, 'set')} couldn't update`);
  if (s.imagesFailed) problems.push(`${n(s.imagesFailed, 'image')} couldn't download`);
  return problems.length ? `${head} ${problems.join('; ')}. Try again later.` : head;
}