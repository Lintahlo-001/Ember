// Deletes mirrored TCGdex files (tcgdex/ prefix) from the bucket and clears the
// matching DB paths, so the API serves the TCGdex URLs again. PokeWallet
// fallbacks (no tcgdex/ prefix) are never touched: they may be the only copy.
//   npm run purge:mirror -- --set=swsh3,swsh4 --dry-run
//   npm run purge:mirror -- --exclude-set=sv1 --cards-only
//   npm run purge:mirror -- --all
// Needs --set, --exclude-set or --all, so a bare run can't wipe everything.
//   --set=swsh3,swsh4          only these sets
//   --exclude-set=base1,base2  everything except these (wins if a set is in both)
// Per-batch (files, then DB paths), so Ctrl-C and re-run is safe.
import { pool } from '../db';
import { deleteFallbacks, MIRROR_PREFIX } from '../storage';
import { assertKnownSets, parseSetFilter, setFilterSql } from './cliFilters';

const args = process.argv.slice(2);
const has = (n: string) => args.includes(`--${n}`);
const { only, skip } = parseSetFilter(args);
const dryRun = has('dry-run');
const LIKE = `${MIRROR_PREFIX}%`;
const BATCH = 100;

async function purgeCards() {
  const { rows: c } = await pool.query(
    `SELECT count(*)::int AS n FROM catalog.cards
     WHERE image_path LIKE $3 ${setFilterSql('set_id')}`,
    [only, skip, LIKE],
  );
  console.log(`Cards: ${c[0].n} mirrored images to purge`);
  if (dryRun) return;

  let lastId = '';
  let done = 0;
  for (;;) {
    const { rows } = await pool.query(
      `SELECT id, image_path FROM catalog.cards
       WHERE image_path LIKE $3 AND id > $4 ${setFilterSql('set_id')}
       ORDER BY id LIMIT $5`,
      [only, skip, LIKE, lastId, BATCH],
    );
    if (rows.length === 0) break;
    lastId = rows[rows.length - 1].id;

    await deleteFallbacks(rows.map((r) => r.image_path));
    await pool.query(
      `UPDATE catalog.cards SET image_path = NULL
       WHERE id = ANY($1::text[]) AND image_path LIKE $2`,
      [rows.map((r) => r.id), LIKE],
    );
    done += rows.length;
    console.log(`cards: ${done} purged`);
  }
}

async function purgeSets() {
  const { rows } = await pool.query(
    `SELECT id, logo_path, symbol_path FROM catalog.sets
     WHERE (logo_path LIKE $3 OR symbol_path LIKE $3) ${setFilterSql('id')}`,
    [only, skip, LIKE],
  );
  const paths = rows.flatMap((r) =>
    [r.logo_path, r.symbol_path].filter((p): p is string => !!p && p.startsWith(MIRROR_PREFIX)),
  );
  console.log(`Sets: ${paths.length} mirrored logo/symbol files to purge`);
  if (dryRun || rows.length === 0) return;

  await deleteFallbacks(paths);
  // Only clears mirrored columns; a PokeWallet logo_path on the same row survives.
  await pool.query(
    `UPDATE catalog.sets SET
       logo_source = CASE WHEN logo_path LIKE $2 THEN NULL ELSE logo_source END,
       logo_path   = CASE WHEN logo_path LIKE $2 THEN NULL ELSE logo_path END,
       symbol_path = CASE WHEN symbol_path LIKE $2 THEN NULL ELSE symbol_path END
     WHERE id = ANY($1::text[])`,
    [rows.map((r) => r.id), LIKE],
  );
  console.log(`Sets: ${paths.length} purged`);
}

async function main() {
  if (!only && !skip && !has('all')) {
    console.error('Refusing to run without --set=, --exclude-set= or --all.');
    process.exitCode = 1;
    return;
  }
  await assertKnownSets(only, skip);
  if (!has('sets-only')) await purgeCards();
  if (!has('cards-only')) await purgeSets();
}

main()
  .catch((err) => { console.error('Purge failed:', err); process.exitCode = 1; })
  .finally(() => pool.end());