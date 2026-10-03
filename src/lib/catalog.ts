import {
    api as remote,
    type CardDetail,
    type CardListItem,
    type SetBrief,
    type SetDetail,
} from '@/src/lib/api';
import { getDb, getMeta, setMeta } from '@/src/lib/db';

const SETS_CACHED_KEY = 'sets_cached_at';

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
    symbol_url = excluded.symbol_url, images_updated_at = excluded.images_updated_at,
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

async function saveSets(sets: SetBrief[]): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const s of sets) await tx.runAsync(UPSERT_SET, setParams(s));
  });
  await setMeta(SETS_CACHED_KEY, new Date().toISOString());
}

async function saveCards(cards: CardListItem[]): Promise<void> {
  if (cards.length === 0) return;
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const c of cards) await tx.runAsync(UPSERT_CARD, cardParams(c));
  });
}

async function saveSet(set: SetDetail): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(UPSERT_SET, setParams(set));
    for (const c of set.cards) await tx.runAsync(UPSERT_CARD, cardParams(c));
    await tx.runAsync('UPDATE sets SET cards_cached_at = ? WHERE id = ?', [new Date().toISOString(), set.id]);
  });
}

async function saveCardDetail(c: CardDetail): Promise<void> {
  const db = await getDb();
  const detail = JSON.stringify({
    dex_ids: c.dex_ids ?? [],
    variant_options: c.variant_options,
    set_name: c.set_name,
    set_symbol_url: c.set_symbol_url,
    card_count_official: c.card_count_official,
    rarity_icon_url: c.rarity_icon_url,
  });
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(UPSERT_CARD, cardParams(c));
    await tx.runAsync('UPDATE cards SET detail = ?, detail_synced_at = ? WHERE id = ?', [
      detail,
      new Date().toISOString(),
      c.id,
    ]);
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

type CardRow = CardListItem & { detail: string | null };
const inflight = new Set<string>();

function toDetail(row: CardRow): CardDetail | null {
  if (!row.detail) return null;
  try {
    const { detail, ...list } = row;
    return { ...list, ...JSON.parse(detail) } as CardDetail;
  } catch {
    return null;
  }
}

async function card(id: string, onFresh?: (fresh: CardDetail) => void): Promise<CardDetail> {
  const db = await getDb();
  const row = await db.getFirstAsync<CardRow>(`SELECT ${CARD_COLS}, detail FROM cards WHERE id = ?`, [id]);
  const cached = row ? toDetail(row) : null;

  if (cached) {
    if (onFresh && !inflight.has(id)) {
      inflight.add(id);
      remote
        .card(id)
        .then(async (fresh) => {
          await saveCardDetail(fresh);
          onFresh(fresh);
        })
        .catch(() => {})
        .finally(() => inflight.delete(id));
    }
    return cached;
  }

  const fresh = await remote.card(id);
  await saveCardDetail(fresh);
  return fresh;
}

export const catalog = { sets, set, cardsByIds, card };