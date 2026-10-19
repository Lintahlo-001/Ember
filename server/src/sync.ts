import { pool } from './db';
import { resolveDexIds } from './dexInference';
import { deleteFallback, MIRROR_PREFIX } from './storage';
import {
  EmptySet,
  ExcludedSeries,
  getCard,
  getSet,
  isExcludedSerie,
  isUsableTcgdexAsset,
  listExcludedSetIds,
  listSets,
  TcgdexCard,
} from './tcgdex';


const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown, max = 300): string | null =>
  typeof v === 'string' && v.length > 0 ? v.slice(0, max) : null;
const int = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : 0;

export async function syncSet(setId: string): Promise<void> {
  const set = await getSet(setId);
  if (isExcludedSerie(set.serie?.id)) throw new ExcludedSeries(setId);

  const cards = (set.cards ?? []).filter((c) => str(c.id) && str(c.name));
  if (cards.length === 0) throw new EmptySet(setId);
  const releaseDate = set.releaseDate && DATE_RE.test(set.releaseDate) ? set.releaseDate : null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO catalog.sets
         (id, name, serie_id, serie_name, logo, symbol, release_date,
          card_count_total, card_count_official, synced_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, serie_id = EXCLUDED.serie_id, serie_name = EXCLUDED.serie_name,
         logo = EXCLUDED.logo, symbol = EXCLUDED.symbol, release_date = EXCLUDED.release_date,
         card_count_total = EXCLUDED.card_count_total,
         card_count_official = EXCLUDED.card_count_official, synced_at = now()`,
      [
        str(set.id), str(set.name), str(set.serie?.id), str(set.serie?.name),
        str(set.logo), str(set.symbol), releaseDate,
        int(set.cardCount?.total), int(set.cardCount?.official),
      ],
    );

    if (cards.length > 0) {
      await client.query(
        `INSERT INTO catalog.cards (id, set_id, local_id, name, image_base, image_source)
         SELECT u.id, $1::text, u.local_id, u.name, u.image,
                CASE WHEN u.image IS NULL THEN NULL ELSE 'tcgdex' END
         FROM unnest($2::text[], $3::text[], $4::text[], $5::text[]) AS u(id, local_id, name, image)
         ON CONFLICT (id) DO UPDATE SET
           set_id = EXCLUDED.set_id, local_id = EXCLUDED.local_id, name = EXCLUDED.name,
           image_base = COALESCE(EXCLUDED.image_base, catalog.cards.image_base),
           image_source = CASE WHEN EXCLUDED.image_base IS NOT NULL THEN 'tcgdex'
                               ELSE catalog.cards.image_source END,
           synced_at = now()`,
        [
          set.id,
          cards.map((c) => c.id),
          cards.map((c) => String(c.localId ?? c.id).slice(0, 40)),
          cards.map((c) => c.name.slice(0, 300)),
          cards.map((c) => str(c.image, 500)),
        ],
      );
    }
    await client.query('COMMIT');
    await reconcileFallback('catalog.sets', 'logo_path', 'logo_source', set.id, str(set.logo));
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function extractPrice(p: TcgdexCard['pricing'] | Record<string, any> | null | undefined) {
  const tp = (p as any)?.tcgplayer as Record<string, any> | undefined;
  if (tp) {
    const preferred = ['normal', 'holofoil', 'holo', 'reverse-holofoil', 'reverse', '1st-edition'];
    const keys = [...preferred, ...Object.keys(tp).filter((k) => !preferred.includes(k))];
    for (const key of keys) {
      const m = tp[key]?.marketPrice;
      if (typeof m === 'number' && Number.isFinite(m)) return { value: m, currency: str(tp.unit, 8) ?? 'USD' };
    }
  }
  const cm = (p as any)?.cardmarket;
  const v = cm?.trend ?? cm?.avg;
  if (typeof v === 'number' && Number.isFinite(v)) return { value: v, currency: str(cm?.unit, 8) ?? 'EUR' };
  return { value: null, currency: null };
}

function mergePricing(prev: any, next: TcgdexCard['pricing']) {
  const out: Record<string, unknown> = { ...(prev ?? {}) };
  for (const src of ['tcgplayer', 'cardmarket'] as const) {
    const incoming = next?.[src];
    if (incoming && Object.keys(incoming).length > 0) out[src] = incoming;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export async function syncCard(cardId: string): Promise<void> {
  const card = await getCard(cardId);
  const setExists = await pool.query('SELECT 1 FROM catalog.sets WHERE id = $1', [card.set.id]);
  if (!setExists.rowCount) await syncSet(card.set.id);

  const { rows: prevRows } = await pool.query(
    'SELECT pricing FROM catalog.cards WHERE id = $1', [cardId],
  );
  const pricing = mergePricing(prevRows[0]?.pricing, card.pricing);
  const { value, currency } = extractPrice(pricing);
  const given = Array.isArray(card.dexId) ? card.dexId.filter((n) => Number.isInteger(n)) : [];
  const { ids: dexIds, inferred: dexInferred } = await resolveDexIds(given, card.name, card.category);

  await pool.query(
    `INSERT INTO catalog.cards
       (id, set_id, local_id, name, image_base, image_source, category, rarity, illustrator,
        dex_ids, variants, pricing, price_market, price_currency, detail_synced_at, synced_at, dex_inferred)
     VALUES ($1,$2,$3,$4,$5,CASE WHEN $5::text IS NULL THEN NULL ELSE 'tcgdex' END,
             $6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13, now(), now(), $14)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name, local_id = EXCLUDED.local_id,
       image_base = COALESCE(EXCLUDED.image_base, catalog.cards.image_base),
       image_source = CASE WHEN EXCLUDED.image_base IS NOT NULL THEN 'tcgdex'
                           ELSE catalog.cards.image_source END,
       category = EXCLUDED.category, rarity = EXCLUDED.rarity, illustrator = EXCLUDED.illustrator,
       dex_ids = EXCLUDED.dex_ids, variants = EXCLUDED.variants, pricing = EXCLUDED.pricing,
       price_market = EXCLUDED.price_market, price_currency = EXCLUDED.price_currency,
       detail_synced_at = now(), synced_at = now(), dex_inferred = EXCLUDED.dex_inferred`,
    [
      str(card.id), str(card.set.id), String(card.localId ?? card.id).slice(0, 40),
      str(card.name), str(card.image, 500), str(card.category, 60), str(card.rarity, 60),
      str(card.illustrator, 120), dexIds,
      card.variants ? JSON.stringify(card.variants) : null,
      pricing ? JSON.stringify(pricing) : null,
      value, currency, dexInferred,
    ],
  );
  await reconcileFallback('catalog.cards', 'image_path', 'image_source', card.id, str(card.image, 500));
}

export async function syncAllSets(): Promise<{ discovered: number; updated: number }> {
  const remote = await listSets();
  const excluded = await listExcludedSetIds();
  const local = await pool.query('SELECT id, card_count_total FROM catalog.sets');
  const known = new Map<string, number>(local.rows.map((r) => [r.id, r.card_count_total]));

  let discovered = 0;
  let updated = 0;
  for (const s of remote) {
    if (excluded.has(s.id)) continue;
    const isNew = !known.has(s.id);
    if (isNew && int(s.cardCount?.total) === 0) continue;
    const changed = !isNew && known.get(s.id) !== int(s.cardCount?.total);
    if (!isNew && !changed) continue;
    try {
      await syncSet(s.id);
      isNew ? discovered++ : updated++;
    } catch (err) {
      if (err instanceof ExcludedSeries || err instanceof EmptySet) continue;
      console.error(`syncSet failed for ${s.id}:`, err);
    }
  }
  return { discovered, updated };
}

export async function refreshStaleCards(maxMs = 20 * 60_000, concurrency = 8): Promise<number> {
  const deadline = Date.now() + maxMs;
  const failed = new Set<string>();
  let done = 0;

  while (Date.now() < deadline) {
    const { rows } = await pool.query(
      `SELECT id FROM catalog.cards
       WHERE detail_synced_at IS NOT NULL
         AND detail_synced_at < now() - interval '20 hours'
         AND id <> ALL($1::text[])
       ORDER BY detail_synced_at ASC LIMIT 200`,
      [[...failed]],
    );
    if (rows.length === 0) break;

    for (let i = 0; i < rows.length && Date.now() < deadline; i += concurrency) {
      const chunk = rows.slice(i, i + concurrency);
      const results = await Promise.allSettled(chunk.map((r) => syncCard(r.id)));
      results.forEach((r, j) => {
        if (r.status === 'fulfilled') done++;
        else failed.add(chunk[j].id);
      });
    }
  }
  return done;
}

export async function syncMissingDetails(
  maxCards = Infinity,
  concurrency = 5,
): Promise<{ done: number; failed: number }> {
  const BATCH = 200;
  let lastId = '';
  let done = 0;
  let failed = 0;

  while (done + failed < maxCards) {
    const take = Math.min(BATCH, maxCards - done - failed);
    const { rows } = await pool.query(
      `SELECT id FROM catalog.cards
       WHERE detail_synced_at IS NULL AND id > $1
       ORDER BY id LIMIT $2`,
      [lastId, take],
    );
    if (rows.length === 0) break;
    lastId = rows[rows.length - 1].id;

    for (let i = 0; i < rows.length; i += concurrency) {
      const chunk = rows.slice(i, i + concurrency);
      const results = await Promise.allSettled(chunk.map((r) => syncCard(r.id)));
      results.forEach((r, j) => {
        if (r.status === 'fulfilled') done++;
        else {
          failed++;
          console.error(`syncCard failed for ${chunk[j].id}:`, r.reason);
        }
      });
    }
    console.log(`details: ${done} ok, ${failed} failed`);
  }
  return { done, failed };
}

async function reconcileFallback(
  table: 'catalog.sets' | 'catalog.cards',
  pathCol: string,
  sourceCol: string,
  id: string,
  newTcgdexUrl: string | null,
): Promise<void> {
  if (!isUsableTcgdexAsset(newTcgdexUrl)) return;

  const { rows } = await pool.query(`SELECT ${pathCol} AS path FROM ${table} WHERE id = $1`, [id]);
  const oldPath: string | null = rows[0]?.path ?? null;
  if (!oldPath) return;
  if (oldPath.startsWith(MIRROR_PREFIX)) return;

  await pool.query(`UPDATE ${table} SET ${pathCol} = NULL, ${sourceCol} = NULL WHERE id = $1`, [id]);
  try {
    await deleteFallback(oldPath);
  } catch (err) {
    console.error(`Storage delete failed for ${oldPath} (non-fatal):`, err);
  }
}

export async function recheckFallbackLogos(): Promise<{ checked: number; restored: number }> {
  const { rows } = await pool.query(
    `SELECT id FROM catalog.sets WHERE logo_path IS NOT NULL AND logo_path NOT LIKE 'tcgdex/%'`,
  );
  let restored = 0;
  for (const row of rows) {
    const before = await pool.query(`SELECT logo_path FROM catalog.sets WHERE id = $1`, [row.id]);
    await syncSet(row.id);
    const after = await pool.query(`SELECT logo_path FROM catalog.sets WHERE id = $1`, [row.id]);
    if (before.rows[0]?.logo_path && !after.rows[0]?.logo_path) restored++;
  }
  return { checked: rows.length, restored };
}