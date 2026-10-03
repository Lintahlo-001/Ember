// One-off: `npm run purge:empty -- --dry-run` first, then without the flag.
// Deletes sets that have zero cards in catalog.cards, plus their bucket files.
// Don't run while a sync is in progress.
import { pool } from '../db';
import { deleteFallbacks } from '../storage';

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const { rows: sets } = await pool.query(
    `SELECT s.id, s.name, s.logo_path, s.symbol_path
     FROM catalog.sets s
     WHERE NOT EXISTS (SELECT 1 FROM catalog.cards c WHERE c.set_id = s.id)
     ORDER BY s.id`,
  );
  if (sets.length === 0) {
    console.log('No empty sets.');
    return;
  }

  const paths = sets
    .flatMap((s) => [s.logo_path, s.symbol_path])
    .filter((p): p is string => !!p);

  for (const s of sets) console.log(`  ${s.id}  ${s.name}`);
  console.log(`${sets.length} empty sets, ${paths.length} bucket files.`);
  if (dryRun) return;

  await deleteFallbacks(paths);
  const del = await pool.query(
    `DELETE FROM catalog.sets s
     WHERE s.id = ANY($1::text[])
       AND NOT EXISTS (SELECT 1 FROM catalog.cards c WHERE c.set_id = s.id)`,
    [sets.map((s) => s.id)],
  );
  console.log(`Deleted ${del.rowCount} sets.`);
}

main()
  .catch((err) => { console.error('Purge failed:', err); process.exitCode = 1; })
  .finally(() => pool.end());