// Batch-fills missing/broken card images and set logos from PokeWallet.
// Run manually: `npm run sweep -- --limit=5000`
// Debug a small sample without writing anything: `npm run sweep -- --debug`
// Resumable: only ever selects rows still missing a fallback, so a run cut
// short by the request budget or a 429 picks up exactly where it left off.
// PokeWallet free tier is 100 requests/hour, 1000/day — REQUEST_BUDGET stops
// the job cleanly before hitting the hourly cap rather than after a 429.
import { pool } from '../db';
import {
  fetchImageById,
  fetchSetLogo,
  findPwSet,
  getPwSetCards,
  listPwSets,
  PwRateLimited,
  PwSet,
  requestStats,
} from '../pokewallet';
import { uploadFallback } from '../storage';
import { isUsableTcgdexAsset } from '../tcgdex';

const DELAY_MS = 200;
const REQUEST_BUDGET = 90;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function budgetExceeded(): boolean {
  if (requestStats.count >= REQUEST_BUDGET) {
    console.warn(`Hit request budget (${REQUEST_BUDGET}/hr) — stopping cleanly. Re-run next hour to resume.`);
    return true;
  }
  return false;
}

function localIdMatches(tcgdexLocalId: string, pwCardNumber: string | null): boolean {
  if (!pwCardNumber) return false;
  const numerator = pwCardNumber.split('/')[0].trim();
  const a = Number(tcgdexLocalId);
  const b = Number(numerator);
  if (Number.isFinite(a) && Number.isFinite(b)) return a === b;
  return tcgdexLocalId.trim() === numerator;
}

type PwSetCardList = Awaited<ReturnType<typeof getPwSetCards>>;

async function sweepCards(pwSets: PwSet[], limit: number): Promise<{ done: number; failed: number; skipped: number; stopped: boolean }> {
  const { rows } = await pool.query(
    `SELECT c.id, c.local_id, c.set_id, s.name AS set_name
     FROM catalog.cards c JOIN catalog.sets s ON s.id = c.set_id
     WHERE c.image_path IS NULL AND c.image_base IS NULL
     ORDER BY c.set_id, c.local_id
     LIMIT $1`,
    [limit],
  );

  let done = 0, failed = 0, skipped = 0, stopped = false;
  const pwSetCache = new Map<string, PwSet | null>();
  const pwCardListCache = new Map<string, PwSetCardList | null>();

  for (const row of rows) {
    if (budgetExceeded()) { stopped = true; break; }

    if (!pwSetCache.has(row.set_id)) {
      pwSetCache.set(row.set_id, findPwSet(pwSets, row.set_id, row.set_name));
    }
    const pwSet = pwSetCache.get(row.set_id)!;
    if (!pwSet) {
      skipped++;
      continue;
    }

    const codeOrId = pwSet.set_code ?? pwSet.set_id;

    if (!pwCardListCache.has(codeOrId)) {
      if (budgetExceeded()) { stopped = true; break; }
      try {
        const cards = await getPwSetCards(codeOrId);
        pwCardListCache.set(codeOrId, cards);
        await sleep(DELAY_MS);
      } catch (err) {
        if (err instanceof PwRateLimited) {
          console.warn(`Rate limited fetching set ${codeOrId} — stopping this run early. Re-run to resume.`);
          stopped = true;
          break;
        }
        pwCardListCache.set(codeOrId, null);
        console.error(`getPwSetCards failed for ${codeOrId}:`, err);
      }
    }

    const cards = pwCardListCache.get(codeOrId);
    if (!cards) {
      failed++;
      continue;
    }

    const match = cards.find(
      (c) => c.card_info.product_type === 'card' && localIdMatches(row.local_id, c.card_info.card_number),
    );
    if (!match) {
      failed++;
      continue;
    }

    if (budgetExceeded()) { stopped = true; break; }

    try {
      const img = await fetchImageById(match.id);
      await sleep(DELAY_MS);
      if (!img) { failed++; continue; }

      const path = `cards/${row.id}.webp`;
      await uploadFallback(path, img.bytes, img.contentType);
      await pool.query(
        `UPDATE catalog.cards SET image_path = $1, image_source = 'pokewallet' WHERE id = $2`,
        [path, row.id],
      );
      done++;
    } catch (err) {
      if (err instanceof PwRateLimited) {
        console.warn(`Rate limited on card ${row.id} — stopping this run early. Re-run to resume.`);
        stopped = true;
        break;
      }
      failed++;
      console.error(`card image fallback failed for ${row.id}:`, err);
    }
  }
  return { done, failed, skipped, stopped };
}

async function sweepSetLogos(pwSets: PwSet[], limit: number): Promise<{ done: number; failed: number; skipped: number; stopped: boolean }> {
  const { rows } = await pool.query(
    `SELECT id, name, logo FROM catalog.sets WHERE logo_path IS NULL LIMIT $1`,
    [limit],
  );

  let done = 0, failed = 0, skipped = 0, stopped = false;

  for (const row of rows) {
    if (isUsableTcgdexAsset(row.logo)) continue;
    if (budgetExceeded()) { stopped = true; break; }

    const pwSet = findPwSet(pwSets, row.id, row.name);
    if (!pwSet) { skipped++; continue; }

    try {
      const logo = await fetchSetLogo(pwSet.set_id);
      await sleep(DELAY_MS);
      if (!logo) {
        failed++;
        console.log(`No logo image at PokeWallet for set ${row.id} (pw set_id=${pwSet.set_id})`);
        continue;
      }
      const path = `sets/${row.id}/logo.webp`;
      await uploadFallback(path, logo.bytes, logo.contentType);
      await pool.query(
        `UPDATE catalog.sets SET logo_path = $1, logo_source = 'pokewallet' WHERE id = $2`,
        [path, row.id],
      );
      done++;
    } catch (err) {
      if (err instanceof PwRateLimited) {
        console.warn(`Rate limited on set ${row.id} (pw set_id=${pwSet.set_id}) — stopping this run early. Re-run to resume.`);
        stopped = true;
        break;
      }
      failed++;
      console.error(`set logo fallback failed for ${row.id} (pw set_id=${pwSet.set_id}):`, err);
    }
  }
  return { done, failed, skipped, stopped };
}

async function runDebug(pwSets: PwSet[]) {
  console.log('\n--- Sample PokeWallet sets (first 5) ---');
  console.log(JSON.stringify(pwSets.slice(0, 5), null, 2));

  const { rows } = await pool.query(
    `SELECT c.id, c.local_id, c.set_id, s.name AS set_name
     FROM catalog.cards c JOIN catalog.sets s ON s.id = c.set_id
     WHERE c.image_path IS NULL AND c.image_base IS NULL
     ORDER BY c.set_id, c.local_id LIMIT 3`,
  );

  const pwCardListCache = new Map<string, PwSetCardList | null>();

  for (const row of rows) {
    const pwSet = findPwSet(pwSets, row.set_id, row.set_name);
    console.log(`\n--- ${row.id} (tcgdex set=${row.set_id} "${row.set_name}", local_id=${row.local_id}) ---`);
    console.log(
      `Matched PokeWallet set: ${pwSet ? `${pwSet.name} (id=${pwSet.set_id}, code=${pwSet.set_code}, lang=${pwSet.language})` : 'NONE'}`,
    );
    if (!pwSet) continue;

    const codeOrId = pwSet.set_code ?? pwSet.set_id;
    if (!pwCardListCache.has(codeOrId)) {
      try {
        pwCardListCache.set(codeOrId, await getPwSetCards(codeOrId));
      } catch (err) {
        console.error(`getPwSetCards failed for ${codeOrId}:`, err);
        pwCardListCache.set(codeOrId, null);
      }
    }
    const cards = pwCardListCache.get(codeOrId);
    if (!cards) { console.log('  (set card list fetch failed)'); continue; }

    console.log(`  set has ${cards.length} cards on PokeWallet`);
    const match = cards.find(
      (c) => c.card_info.product_type === 'card' && localIdMatches(row.local_id, c.card_info.card_number),
    );
    console.log(
      match
        ? `  MATCH: id=${match.id}, card_number=${match.card_info.card_number}, name=${match.card_info.name}`
        : `  NO MATCH for local_id=${row.local_id}`,
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 500;
  const debug = args.includes('--debug');

  const pwSets = await listPwSets();
  console.log(`Loaded ${pwSets.length} PokeWallet sets for matching.`);

  if (debug) {
    await runDebug(pwSets);
    return;
  }

  const cards = await sweepCards(pwSets, limit);
  console.log(
    `Cards: ${cards.done} ok / ${cards.failed} failed / ${cards.skipped} no set match` +
    (cards.stopped ? ' (stopped early — budget or rate limit)' : ''),
  );

  if (cards.stopped) {
    console.log(`Skipping logo sweep this run — request budget already spent. Re-run later to continue.`);
  } else {
    const sets = await sweepSetLogos(pwSets, limit);
    console.log(
      `Logos: ${sets.done} ok / ${sets.failed} failed / ${sets.skipped} no set match` +
      (sets.stopped ? ' (stopped early — budget or rate limit)' : ''),
    );
  }

  console.log(`Total PokeWallet requests this run: ${requestStats.count}`);
}

main()
  .catch((err) => { console.error('Sweep failed:', err); process.exitCode = 1; })
  .finally(() => pool.end());