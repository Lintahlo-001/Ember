// One-off: `npm run purge:excluded -- --dry-run` first, then without the flag.
// Order matters: bucket files first, DB rows second, so a failed run can be
// re-run (paths still exist in the DB). Cards go via ON DELETE CASCADE.
import { pool } from '../db';
import { deleteFallbacks } from '../storage';
import { EXCLUDED_SERIES, listExcludedSetIds } from '../tcgdex';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const apiIds = [...(await listExcludedSetIds())];

  const { rows: sets } = await pool.query(
    `SELECT id, logo_path, symbol_path FROM catalog.sets
     WHERE serie_id = ANY($1::text[]) OR id = ANY($2::text[])`,
    [[...EXCLUDED_SERIES], apiIds],
  );
  const setIds: string[] = sets.map((s) => s.id);
  if (setIds.length === 0) {
    console.log('Nothing to purge.');
    return;
  }

  const { rows: cards } = await pool.query(
    `SELECT image_path FROM catalog.cards WHERE set_id = ANY($1::text[])`,
    [setIds],
  );

  const paths = [
    ...sets.flatMap((s) => [s.logo_path, s.symbol_path]),
    ...cards.map((c) => c.image_path),
  ].filter((p): p is string => !!p);

  console.log(`${setIds.length} sets, ${cards.length} cards, ${paths.length} bucket files.`);
  if (dryRun) return;

  await deleteFallbacks(paths);
  const del = await pool.query(`DELETE FROM catalog.sets WHERE id = ANY($1::text[])`, [setIds]);
  console.log(`Deleted ${del.rowCount} sets (their cards cascaded).`);
}

main()
  .catch((err) => { console.error('Purge failed:', err); process.exitCode = 1; })
  .finally(() => pool.end());