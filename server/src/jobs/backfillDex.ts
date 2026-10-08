// Infers dex ids for existing Pokémon cards that have none.
//   npm run backfill:dex -- --dry-run   (prints what it would do + unmatched names)
//   npm run backfill:dex                (writes)
//   npm run backfill:dex -- --redo      (also re-evaluates rows already marked dex_inferred,
//                                        use after reseeding species or tuning the matcher)
// Safe to re-run. Never overwrites a dex_ids value that came from TCGdex.
import { pool } from '../db';
import { ensureSpecies, inferDexIds } from '../dexInference';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const redo = args.includes('--redo');
const BATCH = 500;
const CONCURRENCY = 20;

async function main() {
  if (!(await ensureSpecies())) throw new Error('catalog.pokemon_species is empty: run `npm run seed:species` first');

  let lastId = '';
  let scanned = 0, matched = 0, unmatched = 0;
  const samples: string[] = [];

  for (;;) {
    const { rows } = await pool.query<{ id: string; name: string }>(
      `SELECT id, name FROM catalog.cards
       WHERE detail_synced_at IS NOT NULL
         AND translate(lower(category), 'é', 'e') = 'pokemon'
         AND (cardinality(dex_ids) = 0 OR ($1::boolean AND dex_inferred))
         AND id > $2
       ORDER BY id LIMIT $3`,
      [redo, lastId, BATCH],
    );
    if (rows.length === 0) break;
    lastId = rows[rows.length - 1].id;

    const updates: { id: string; ids: number[] }[] = [];
    for (const r of rows) {
      scanned++;
      const ids = inferDexIds(r.name);
      if (ids.length === 0) {
        unmatched++;
        if (samples.length < 40) samples.push(`${r.id} "${r.name}"`);
      } else {
        matched++;
        updates.push({ id: r.id, ids });
      }
    }

    if (!dryRun) {
      for (let i = 0; i < updates.length; i += CONCURRENCY) {
        await Promise.all(
          updates.slice(i, i + CONCURRENCY).map((u) =>
            pool.query(
              `UPDATE catalog.cards SET dex_ids = $2::int[], dex_inferred = true
               WHERE id = $1 AND (cardinality(dex_ids) = 0 OR dex_inferred)`,
              [u.id, u.ids],
            ),
          ),
        );
      }
    }
    console.log(`scanned ${scanned}: ${matched} matched, ${unmatched} unmatched`);
  }

  console.log(`${dryRun ? 'DRY RUN. ' : ''}Done: ${matched} matched, ${unmatched} unmatched of ${scanned}.`);
  if (samples.length) console.log('Unmatched samples (check these by eye):\n  ' + samples.join('\n  '));
}

main()
  .catch((err) => { console.error('Backfill failed:', (err as Error).message); process.exitCode = 1; })
  .finally(() => pool.end());