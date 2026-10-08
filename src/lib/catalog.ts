import {
  CardPricing,
  PriceUpdate,
  Region,
  api as remote,
  Species,
  type CardDetail,
  type CardListItem,
  type RarityIcon,
  type SetBrief,
  type SetDetail,
} from '@/src/lib/api';
import { getDb, getMeta, runTx, setMeta } from '@/src/lib/db';

const SETS_CACHED_KEY = 'sets_cached_at';
const RARITIES_CACHED_KEY = 'rarities_cached_at';

const SET_COLS = `id, name, serie_id, serie_name, release_date, card_count_total,
                  card_count_official, logo_url, symbol_url, images_updated_at, synced_at`;
const CARD_COLS = `id, set_id, local_id, name, rarity, illustrator, price_market,
                   price_currency, image_url, image_version, synced_at`;

const chunk = <T,>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};
const placeholders = (n: number) => Array(n).fill('?').join(',');

// Same order as the server: numeric part of local_id first, then local_id.
const digits = (s: string) => {
  const d = s.replace(/\D/g, '');
  return d ? parseInt(d, 10) : null;
};
const byNumber = (a: CardListItem, b: CardListItem) => {
  const x = digits(a.local_id);
  const y = digits(b.local_id);
  if (x !== y) {
    if (x === null) return 1;
    if (y === null) return -1;
    return x - y;
  }
  return a.local_id < b.local_id ? -1 : a.local_id > b.local_id ? 1 : 0;
};

/* ---------- writes ---------- */

const UPSERT_SET = `
  INSERT INTO sets (id, name, serie_id, serie_name, release_date, card_count_total,
                    card_count_official, logo_url, symbol_url, images_updated_at, synced_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name, serie_id = excluded.serie_id, serie_name = excluded.serie_name,
    release_date = excluded.release_date, card_count_total = excluded.card_count_total,
    card_count_official = excluded.card_count_official, logo_url = excluded.logo_url,
    symbol_url = excluded.symbol_url,
    images_updated_at = CASE WHEN sets.cards_cached_at IS NOT NULL THEN sets.images_updated_at
                             ELSE excluded.images_updated_at END,
    synced_at = excluded.synced_at`;

const UPSERT_CARD = `
  INSERT INTO cards (id, set_id, local_id, name, rarity, illustrator, price_market,
                     price_currency, image_url, image_version, synced_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?)
  ON CONFLICT(id) DO UPDATE SET
    set_id = excluded.set_id, local_id = excluded.local_id, name = excluded.name,
    rarity = excluded.rarity, illustrator = excluded.illustrator,
    price_market = excluded.price_market, price_currency = excluded.price_currency,
    image_url = excluded.image_url, image_version = excluded.image_version,
    synced_at = excluded.synced_at`;

const setParams = (s: SetBrief) => [
  s.id, s.name, s.serie_id ?? null, s.serie_name, s.release_date, s.card_count_total,
  s.card_count_official, s.logo_url, s.symbol_url, s.images_updated_at ?? null, s.synced_at ?? null,
];
const cardParams = (c: CardListItem) => [
  c.id, c.set_id, c.local_id, c.name, c.rarity, c.illustrator, c.price_market,
  c.price_currency, c.image_url, c.image_version ?? null, c.synced_at ?? null,
];

async function saveRarities(list: RarityIcon[]): Promise<void> {
  const db = await getDb();
  await runTx(async (tx) => {
    for (const r of list) {
      await tx.runAsync(
        `INSERT INTO rarities (name, icon_url, icon_version) VALUES (?,?,?)
         ON CONFLICT(name) DO UPDATE SET icon_url = excluded.icon_url, icon_version = excluded.icon_version`,
        [r.name, r.icon_url, r.icon_version],
      );
    }
    if (list.length === 0) await tx.runAsync('DELETE FROM rarities');
    else
      await tx.runAsync(
        `DELETE FROM rarities WHERE name NOT IN (${placeholders(list.length)})`,
        list.map((r) => r.name),
      );
  });
  await setMeta(RARITIES_CACHED_KEY, new Date().toISOString());
}

async function syncRarities(): Promise<void> {
  await saveRarities(await remote.rarities());
}

async function ensureRarities(): Promise<void> {
  if (await getMeta(RARITIES_CACHED_KEY)) return;
  await syncRarities().catch(() => {});
}

async function iconUrlFor(rarity: string | null): Promise<string | null> {
  if (!rarity) return null;
  const db = await getDb();
  const row = await db.getFirstAsync<{ icon_url: string }>('SELECT icon_url FROM rarities WHERE name = ?', [rarity]);
  return row?.icon_url ?? null;
}

async function saveSets(sets: SetBrief[]): Promise<void> {
  const db = await getDb();
  await runTx(async (tx) => {
    for (const s of sets) await tx.runAsync(UPSERT_SET, setParams(s));
  });
  await setMeta(SETS_CACHED_KEY, new Date().toISOString());
}

async function saveCards(cards: CardListItem[]): Promise<void> {
  if (cards.length === 0) return;
  const db = await getDb();
  await runTx(async (tx) => {
    for (const c of cards) await tx.runAsync(UPSERT_CARD, cardParams(c));
  });
}

async function saveSet(set: SetDetail): Promise<void> {
  const db = await getDb();
  await runTx(async (tx) => {
    await tx.runAsync(UPSERT_SET, setParams(set));
    for (const c of set.cards) await tx.runAsync(UPSERT_CARD, cardParams(c));
    await tx.runAsync('UPDATE sets SET cards_cached_at = ? WHERE id = ?', [new Date().toISOString(), set.id]);
  });
}

const DETAIL_VERSION = 2;
const detailJson = (c: CardDetail) =>
  JSON.stringify({
    v: DETAIL_VERSION,
    dex_ids: c.dex_ids ?? [],
    variant_options: c.variant_options,
    set_name: c.set_name,
    set_symbol_url: c.set_symbol_url,
    card_count_official: c.card_count_official,
  });

async function saveCardDetails(list: CardDetail[]): Promise<void> {
  if (list.length === 0) return;
  const db = await getDb();
  const now = new Date().toISOString();
  await runTx(async (tx) => {
    for (const c of list) {
      await tx.runAsync(UPSERT_CARD, cardParams(c));
      await tx.runAsync('UPDATE cards SET detail = ?, detail_synced_at = ? WHERE id = ?', [detailJson(c), now, c.id]);
            await tx.runAsync('DELETE FROM card_dex WHERE card_id = ?', [c.id]);
      for (const d of c.dex_ids ?? []) {
        await tx.runAsync('INSERT OR IGNORE INTO card_dex (card_id, dex_id) VALUES (?,?)', [c.id, d]);
      }
      if (c.set_symbol_url) {
        await tx.runAsync('UPDATE sets SET symbol_url = ? WHERE id = ?', [c.set_symbol_url, c.set_id]);
      }
    }
  });
}
const saveCardDetail = (c: CardDetail) => saveCardDetails([c]);

export type LocalSetState = {
  id: string;
  synced_at: string | null;
  images_updated_at: string | null;
  cards_cached_at: string | null;
  cards_synced_at: string | null;
};

async function localSetStates(): Promise<LocalSetState[]> {
  const db = await getDb();
  return db.getAllAsync<LocalSetState>(
    `SELECT s.id, s.synced_at, s.images_updated_at, s.cards_cached_at,
            (SELECT MAX(c.synced_at) FROM cards c WHERE c.set_id = s.id) AS cards_synced_at
     FROM sets s`,
  );
}

async function localCardTriples(setId: string): Promise<[string, string | null, string | null][]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; image_version: string | null; synced_at: string | null }>(
    'SELECT id, image_version, synced_at FROM cards WHERE set_id = ?',
    [setId],
  );
  return rows.map((r) => [r.id, r.image_version, r.synced_at]);
}

async function applyChanges(
  setId: string,
  changed: CardListItem[],
  removed: string[],
  imagesUpdatedAt: string | null,
): Promise<void> {
  await runTx(async (tx) => {
    for (const c of changed) await tx.runAsync(UPSERT_CARD, cardParams(c));
    for (const part of chunk(removed, 500)) {
      await tx.runAsync(
        `DELETE FROM cards WHERE set_id = ? AND id IN (${placeholders(part.length)})`,
        [setId, ...part],
      );
    }
    await tx.runAsync('UPDATE sets SET images_updated_at = ? WHERE id = ?', [imagesUpdatedAt, setId]);
  });
}

async function refetchSet(id: string): Promise<void> {
  const fresh = await remote.set(id);
  await saveSet(fresh);
  const db = await getDb();
  const keep = new Set(fresh.cards.map((c) => c.id));
  const have = await db.getAllAsync<{ id: string }>('SELECT id FROM cards WHERE set_id = ?', [id]);
  const gone = have.map((r) => r.id).filter((x) => !keep.has(x));
  await runTx(async (tx) => {
    for (const part of chunk(gone, 500)) {
      await tx.runAsync(`DELETE FROM cards WHERE id IN (${placeholders(part.length)})`, part);
    }
    await tx.runAsync('UPDATE sets SET images_updated_at = ? WHERE id = ?', [fresh.images_updated_at ?? null, id]);
  });
}

async function removeSets(ids: string[]): Promise<void> {
  await runTx(async (tx) => {
    for (const part of chunk(ids, 500)) {
      await tx.runAsync(`DELETE FROM cards WHERE set_id IN (${placeholders(part.length)})`, part);
      await tx.runAsync(`DELETE FROM sets WHERE id IN (${placeholders(part.length)})`, part);
    }
  });
}

async function sets(): Promise<SetBrief[]> {
  const db = await getDb();
  if (await getMeta(SETS_CACHED_KEY)) {
    return db.getAllAsync<SetBrief>(
      `SELECT ${SET_COLS} FROM sets ORDER BY release_date IS NULL, release_date DESC, name`,
    );
  }
  const fresh = await remote.sets();
  await saveSets(fresh);
  return fresh;
}

async function set(id: string): Promise<SetDetail> {
  const db = await getDb();
  const row = await db.getFirstAsync<SetBrief & { cards_cached_at: string | null }>(
    `SELECT ${SET_COLS}, cards_cached_at FROM sets WHERE id = ?`,
    [id],
  );
  if (row?.cards_cached_at) {
    const { cards_cached_at: _ignored, ...brief } = row;
    const cards = await db.getAllAsync<CardListItem>(`SELECT ${CARD_COLS} FROM cards WHERE set_id = ?`, [id]);
    return { ...brief, cards: cards.sort(byNumber) };
  }
  const fresh = await remote.set(id);
  await saveSet(fresh);
  return fresh;
}

async function cardsByIds(ids: string[]): Promise<CardListItem[]> {
  const unique = [...new Set(ids)];
  const db = await getDb();
  const have = new Map<string, CardListItem>();

  for (const part of chunk(unique, 200)) {
    const rows = await db.getAllAsync<CardListItem>(
      `SELECT ${CARD_COLS} FROM cards WHERE id IN (${placeholders(part.length)})`,
      part,
    );
    for (const r of rows) have.set(r.id, r);
  }

  const missing = unique.filter((id) => !have.has(id));
  if (missing.length > 0) {
    try {
      const fetched = await remote.cardsByIds(missing);
      await saveCards(fetched);
      for (const c of fetched) have.set(c.id, c);
    } catch (err) {
      if (have.size === 0) throw err;
    }
  }
  return unique.map((id) => have.get(id)).filter((c): c is CardListItem => !!c);
}

type CardRow = CardListItem & { detail: string | null; live_symbol: string | null };
const inflight = new Set<string>();

function toDetail(row: CardRow, rarityIconUrl: string | null): CardDetail | null {
  if (!row.detail) return null;
  try {
    const { detail, live_symbol, ...list } = row;
    const parsed = JSON.parse(detail);
    return {
      ...list,
      ...parsed,
      set_symbol_url: live_symbol ?? parsed.set_symbol_url ?? null,
      rarity_icon_url: rarityIconUrl,
    } as CardDetail;
  } catch {
    return null;
  }
}

async function card(id: string, onFresh?: (fresh: CardDetail) => void): Promise<CardDetail> {
  const db = await getDb();
  const row = await db.getFirstAsync<CardRow>(
    `SELECT ${CARD_COLS}, detail,
            (SELECT symbol_url FROM sets WHERE sets.id = cards.set_id) AS live_symbol
     FROM cards WHERE id = ?`,
    [id],
  );
  if (row) await ensureRarities();
  const cached = row ? toDetail(row, await iconUrlFor(row.rarity)) : null;

  if (cached) {
    if (onFresh && !inflight.has(id)) {
      inflight.add(id);
      remote
        .card(id)
        .then(async (fresh) => {
          await saveCardDetail(fresh);
          await ensureRarities();
          onFresh(fresh);
        })
        .catch((err) => console.warn('Card refresh failed:', id, (err as Error).message))
        .finally(() => inflight.delete(id));
    }
    return cached;
  }

  const fresh = await remote.card(id);
  await saveCardDetail(fresh);
  return fresh;
}

const DETAIL_BATCH = 50;

async function prefetchDetails(ids: string[], maxCards = 600): Promise<{ saved: number; unavailable: number }> {
  const db = await getDb();
  const need: string[] = [];
  for (const part of chunk([...new Set(ids)], 500)) {
    const rows = await db.getAllAsync<{ id: string }>(
      `SELECT id FROM cards WHERE (detail IS NULL OR detail NOT LIKE ?) AND id IN (${placeholders(part.length)})`,
      [`%"v":${DETAIL_VERSION}%`, ...part],
    );
    need.push(...rows.map((r) => r.id));
  }
  const batch = need.slice(0, maxCards);
  let saved = 0;
  for (const part of chunk(batch, DETAIL_BATCH)) {
    const list = await remote.cardDetails(part);
    await saveCardDetails(list);
    saved += list.length;
  }
  return { saved, unavailable: batch.length - saved };
}

async function localRarities(): Promise<{ name: string; icon_url: string }[]> {
  const db = await getDb();
  return db.getAllAsync<{ name: string; icon_url: string }>('SELECT name, icon_url FROM rarities');
}

const SPECIES_CACHED_KEY = 'species_cached_at';
const POKEMON_TTL_MS = 24 * 60 * 60 * 1000;
const pokemonInflight = new Set<number>();

async function syncPokedex(): Promise<void> {
  const [list, regions] = await Promise.all([remote.species(), remote.regions()]);
  if (list.length === 0) throw new Error('Pokédex data is not available yet.');
  await runTx(async (tx) => {
    for (const s of list) {
      await tx.runAsync(
        `INSERT INTO species (dex_id, name, description, image_url) VALUES (?,?,?,?)
         ON CONFLICT(dex_id) DO UPDATE SET name = excluded.name,
           description = excluded.description, image_url = excluded.image_url`,
        [s.dex_id, s.name, s.description, s.image_url],
      );
    }
    await tx.runAsync('DELETE FROM regions');
    for (let i = 0; i < regions.length; i++) {
      const r = regions[i];
      await tx.runAsync(
        'INSERT INTO regions (id, name, dex_start, dex_end, sort_order) VALUES (?,?,?,?,?)',
        [r.id, r.name, r.dex_start, r.dex_end, i],
      );
    }
  });
  await setMeta(SPECIES_CACHED_KEY, new Date().toISOString());
}

async function ensurePokedex(): Promise<void> {
  if (!(await getMeta(SPECIES_CACHED_KEY))) await syncPokedex();
}

async function pokedex(): Promise<{ species: Species[]; regions: Region[] }> {
  await ensurePokedex();
  const db = await getDb();
  const [species, regions] = await Promise.all([
    db.getAllAsync<Species>('SELECT dex_id, name, description, image_url FROM species ORDER BY dex_id'),
    db.getAllAsync<Region>('SELECT id, name, dex_start, dex_end FROM regions ORDER BY sort_order'),
  ]);
  return { species, regions };
}

async function speciesById(dexId: number): Promise<Species | null> {
  await ensurePokedex();
  const db = await getDb();
  return (
    (await db.getFirstAsync<Species>(
      'SELECT dex_id, name, description, image_url FROM species WHERE dex_id = ?',
      [dexId],
    )) ?? null
  );
}

async function savePokemonCards(dexId: number, cards: CardListItem[]): Promise<void> {
  await runTx(async (tx) => {
    for (const c of cards) await tx.runAsync(UPSERT_CARD, cardParams(c));
    await tx.runAsync('DELETE FROM card_dex WHERE dex_id = ?', [dexId]);
    for (const c of cards) {
      await tx.runAsync('INSERT OR IGNORE INTO card_dex (card_id, dex_id) VALUES (?,?)', [c.id, dexId]);
    }
    await tx.runAsync(
      `INSERT INTO pokemon_cards_cached (dex_id, cached_at) VALUES (?,?)
       ON CONFLICT(dex_id) DO UPDATE SET cached_at = excluded.cached_at`,
      [dexId, new Date().toISOString()],
    );
  });
}

async function readPokemonCards(dexId: number): Promise<CardListItem[]> {
  const db = await getDb();
  const cards = await db.getAllAsync<CardListItem>(
    `SELECT ${CARD_COLS} FROM cards WHERE id IN (SELECT card_id FROM card_dex WHERE dex_id = ?)`,
    [dexId],
  );
  return cards.sort((a, b) => (a.set_id < b.set_id ? -1 : a.set_id > b.set_id ? 1 : byNumber(a, b)));
}

async function pokemonCards(
  dexId: number,
  onFresh?: (fresh: CardListItem[]) => void,
): Promise<CardListItem[]> {
  const db = await getDb();
  const mark = await db.getFirstAsync<{ cached_at: string }>(
    'SELECT cached_at FROM pokemon_cards_cached WHERE dex_id = ?',
    [dexId],
  );

  if (mark) {
    const stale = Date.now() - Date.parse(mark.cached_at) > POKEMON_TTL_MS;
    if (stale && onFresh && !pokemonInflight.has(dexId)) {
      pokemonInflight.add(dexId);
      remote
        .pokemonCards(dexId)
        .then(async (r) => {
          await savePokemonCards(dexId, r.results);
          onFresh(await readPokemonCards(dexId));
        })
        .catch((err) => console.warn('Pokémon refresh failed:', dexId, (err as Error).message))
        .finally(() => pokemonInflight.delete(dexId));
    }
    return readPokemonCards(dexId);
  }

  const fresh = await remote.pokemonCards(dexId);
  await savePokemonCards(dexId, fresh.results);
  return readPokemonCards(dexId);
}

async function applyPrices(list: PriceUpdate[]): Promise<void> {
  if (list.length === 0) return;
  await runTx(async (tx) => {
    for (const p of list) {
      await tx.runAsync(
        'UPDATE cards SET price_market = ?, price_currency = ?, synced_at = COALESCE(?, synced_at) WHERE id = ?',
        [p.price_market, p.price_currency, p.synced_at, p.id],
      );
    }
  });
}

const PRICING_TTL_MS = 6 * 60 * 60 * 1000;
const pricingInflight = new Set<string>();

async function savePricing(cardId: string, data: CardPricing): Promise<void> {
  await runTx(async (tx) => {
    await tx.runAsync(
      `INSERT INTO card_pricing (card_id, data, fetched_at) VALUES (?,?,?)
       ON CONFLICT(card_id) DO UPDATE SET data = excluded.data, fetched_at = excluded.fetched_at`,
      [cardId, JSON.stringify(data), new Date().toISOString()],
    );
  });
}

async function pricing(cardId: string, onFresh?: (fresh: CardPricing) => void): Promise<CardPricing> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ data: string; fetched_at: string }>(
    'SELECT data, fetched_at FROM card_pricing WHERE card_id = ?',
    [cardId],
  );
  if (row) {
    try {
      const cached = JSON.parse(row.data) as CardPricing;
      const stale = Date.now() - Date.parse(row.fetched_at) > PRICING_TTL_MS;
      if (stale && onFresh && !pricingInflight.has(cardId)) {
        pricingInflight.add(cardId);
        remote
          .cardPricing(cardId)
          .then(async (fresh) => {
            await savePricing(cardId, fresh);
            onFresh(fresh);
          })
          .catch((err) => console.warn('Pricing refresh failed:', cardId, (err as Error).message))
          .finally(() => pricingInflight.delete(cardId));
      }
      return cached;
    } catch {
    }
  }
  const fresh = await remote.cardPricing(cardId);
  await savePricing(cardId, fresh);
  return fresh;
}

export const catalog = {
  sets, set, cardsByIds, card, syncRarities, ensureRarities, prefetchDetails,
  saveSets, removeSets, localSetStates, localCardTriples, applyChanges, refetchSet,
  localRarities, pokedex, speciesById, syncPokedex, pokemonCards, applyPrices, pricing
};