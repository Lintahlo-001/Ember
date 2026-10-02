// Mirrors TCGdex card images, set logos and set symbols into the
// `catalog-fallbacks` bucket and links them via image_path / logo_path / symbol_path.
//   npm run mirror -- --dry-run
//   npm run mirror -- --sets-only
//   npm run mirror -- --cards-only --limit=2000 --card-size=low
//   --set=swsh3,swsh4          only these sets
//   --exclude-set=base1,base2  everything except these (wins if a set is in both)
// Safe to Ctrl-C and re-run: only rows with a NULL path are selected.
import { pool } from '../db';
import { MIRROR_PREFIX, uploadFallback } from '../storage';
import { isUsableTcgdexAsset } from '../tcgdex';
import { assertKnownSets, parseSetFilter, setFilterSql } from './cliFilters';

const args = process.argv.slice(2);
const has = (n: string) => args.includes(`--${n}`);
const opt = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];

const CONCURRENCY = 6;
const BATCH = 200;
const cardSize = opt('card-size') === 'low' ? 'low' : 'high';
const limit = Number(opt('limit') ?? Infinity);
const dryRun = has('dry-run');
const { only, skip } = parseSetFilter(args)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function download(url: string): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.startsWith('image/')) return null;
      return { bytes: await res.arrayBuffer(), contentType };
    } catch (err) {
      if (attempt === 2) throw err;
      await sleep(500);
    }
  }
  return null;
}

async function inChunks<T>(items: T[], worker: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    await Promise.all(items.slice(i, i + CONCURRENCY).map(worker));
  }
}

async function mirrorSets() {
  const { rows } = await pool.query(
    `SELECT id, logo, symbol, logo_path, symbol_path FROM catalog.sets
    WHERE true ${setFilterSql('id')}
    ORDER BY id`,
    [only, skip],
  );
  let done = 0, failed = 0, missing = 0;

  const one = async (
    setId: string, url: string, file: 'logo' | 'symbol',
  ) => {
    try {
      const img = await download(`${url}.webp`);
      if (!img) { missing++; return; }
      const path = `${MIRROR_PREFIX}sets/${setId}/${file}.webp`;
      await uploadFallback(path, img.bytes, img.contentType);
      if (file === 'logo') {
        await pool.query(
          `UPDATE catalog.sets SET logo_path = $1, logo_source = 'tcgdex' WHERE id = $2 AND logo_path IS NULL`,
          [path, setId],
        );
      } else {
        await pool.query(
          `UPDATE catalog.sets SET symbol_path = $1 WHERE id = $2 AND symbol_path IS NULL`,
          [path, setId],
        );
      }
      done++;
    } catch (err) {
      failed++;
      console.error(`set ${file} failed for ${setId}:`, err);
    }
  };

  const jobs: { id: string; url: string; file: 'logo' | 'symbol' }[] = [];
  for (const r of rows) {
    if (!r.logo_path && isUsableTcgdexAsset(r.logo)) jobs.push({ id: r.id, url: r.logo, file: 'logo' });
    if (!r.symbol_path && isUsableTcgdexAsset(r.symbol)) jobs.push({ id: r.id, url: r.symbol, file: 'symbol' });
  }
  console.log(`Sets: ${jobs.length} logo/symbol files to mirror`);
  if (dryRun) return;

  await inChunks(jobs, (j) => one(j.id, j.url, j.file));
  console.log(`Sets: ${done} ok, ${missing} not on TCGdex, ${failed} failed`);
}

async function mirrorCards() {
  const { rows: c } = await pool.query(
    `SELECT count(*)::int AS n FROM catalog.cards
    WHERE image_path IS NULL AND image_base IS NOT NULL AND image_base NOT LIKE '%/univ/%'
    ${setFilterSql('set_id')}`,
    [only, skip],
  );
  console.log(`Cards: ${c[0].n} images to mirror (${cardSize}.webp)`);
  if (dryRun) return;

  let lastId = '', done = 0, failed = 0, missing = 0;
  while (done + failed + missing < limit) {
    const take = Math.min(BATCH, limit - done - failed - missing);
    const { rows } = await pool.query(
      `SELECT id, image_base FROM catalog.cards
      WHERE image_path IS NULL AND image_base IS NOT NULL
        AND image_base NOT LIKE '%/univ/%' AND id > $3
        ${setFilterSql('set_id')}
      ORDER BY id LIMIT $4`,
      [only, skip, lastId, take],
    );
    if (rows.length === 0) break;
    lastId = rows[rows.length - 1].id;

    await inChunks(rows, async (row) => {
      try {
        const img = await download(`${row.image_base}/${cardSize}.webp`);
        if (!img) { missing++; return; }
        const path = `${MIRROR_PREFIX}cards/${row.id}.webp`;
        await uploadFallback(path, img.bytes, img.contentType);
        await pool.query(
          `UPDATE catalog.cards SET image_path = $1, image_source = 'tcgdex'
           WHERE id = $2 AND image_path IS NULL`,
          [path, row.id],
        );
        done++;
      } catch (err) {
        failed++;
        console.error(`card image failed for ${row.id}:`, err);
      }
    });
    console.log(`cards: ${done} ok, ${missing} missing, ${failed} failed`);
  }
}

async function main() {
  await assertKnownSets(only, skip);
  if (only || skip) {
    console.log(`Filter: only=${only?.join(',') ?? 'all'} exclude=${skip?.join(',') ?? 'none'}`);
  }
  if (!has('cards-only')) await mirrorSets();
  if (!has('sets-only')) await mirrorCards();
}

main()
  .catch((err) => { console.error('Mirror failed:', err); process.exitCode = 1; })
  .finally(() => pool.end());