import { Router } from 'express';
import { pool } from '../db';
import { publicUrl, rarityIconUrl } from '../storage';
import { syncCard, syncSet } from '../sync';
import { isUsableTcgdexAsset, TcgdexNotFound } from '../tcgdex';

export const catalogRouter = Router();

const ID_RE = /^[A-Za-z0-9._-]{1,40}$/;
const VARIANT_RE = /^[A-Za-z0-9_-]{1,40}$/;
const SEARCH_LIMIT = 200;

function resolveAsset(tcgdexUrl: string | null, storagePath: string | null): string | null {
  if (storagePath) return publicUrl(storagePath);
  if (isUsableTcgdexAsset(tcgdexUrl)) return tcgdexUrl;
  return null;
}

const cardImage = (c: { image_base: string | null; image_path: string | null }) =>
  resolveAsset(c.image_base ? `${c.image_base}/high.webp` : null, c.image_path);

const num = (v: unknown): number | null => (v == null ? null : Number(v));

function variantOptions(v: unknown): string[] {
  if (v && typeof v === 'object') {
    const keys = Object.entries(v as Record<string, unknown>)
      .filter(([k, on]) => on === true && VARIANT_RE.test(k))
      .map(([k]) => k);
    if (keys.length > 0) return keys;
  }
  return ['normal'];
}

function toListItem(c: any) {
  return {
    id: c.id,
    set_id: c.set_id,
    local_id: c.local_id,
    name: c.name,
    rarity: c.rarity,
    illustrator: c.illustrator,
    price_market: num(c.price_market),
    price_currency: c.price_currency,
    image_url: cardImage(c),
  };
}

catalogRouter.get('/sets', async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM catalog.sets ORDER BY release_date DESC NULLS LAST, name',
  );
  res.json(
    rows.map((s) => ({
      ...s,
      logo_url: resolveAsset(s.logo, s.logo_path),
      symbol_url: resolveAsset(s.symbol, s.symbol_path),
    })),
  );
});

catalogRouter.get('/sets/:setId', async (req, res) => {
  const { setId } = req.params;
  if (!ID_RE.test(setId)) {
    res.status(400).json({ error: 'Invalid set id' });
    return;
  }

  let set = await pool.query('SELECT * FROM catalog.sets WHERE id = $1', [setId]);
  if (!set.rowCount) {
    try {
      await syncSet(setId);
    } catch (err) {
      if (err instanceof TcgdexNotFound) {
        res.status(404).json({ error: 'Set not found' });
        return;
      }
      throw err;
    }
    set = await pool.query('SELECT * FROM catalog.sets WHERE id = $1', [setId]);
  }
  const cards = await pool.query(
    `SELECT id, set_id, local_id, name, image_base, image_path, rarity, illustrator,
            price_market, price_currency
     FROM catalog.cards WHERE set_id = $1
     ORDER BY NULLIF(regexp_replace(local_id, '\\D', '', 'g'), '')::int NULLS LAST, local_id`,
    [setId],
  );

  const row = set.rows[0];
  res.json({
    ...row,
    logo_url: resolveAsset(row.logo, row.logo_path),
    symbol_url: resolveAsset(row.symbol, row.symbol_path),
    cards: cards.rows.map(toListItem),
  });
});

catalogRouter.get('/cards/search', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const artist = typeof req.query.artist === 'string' ? req.query.artist.trim() : '';
  if (q.length > 100 || artist.length > 120) {
    res.status(400).json({ error: 'Query too long' });
    return;
  }
  if (!q && !artist) {
    res.status(400).json({ error: 'Provide q or artist' });
    return;
  }

  const pattern = q ? `%${q.replace(/[\\%_]/g, '\\$&')}%` : null;

  const { rows } = await pool.query(
    `SELECT id, set_id, local_id, name, image_base, image_path, rarity, illustrator,
            price_market, price_currency
     FROM catalog.cards
     WHERE ($1::text IS NULL OR name ILIKE $1 ESCAPE '\\')
       AND ($2::text IS NULL OR illustrator = $2)
     ORDER BY name, set_id, local_id
     LIMIT $3`,
    [pattern, artist || null, SEARCH_LIMIT + 1],
  );

  res.json({
    results: rows.slice(0, SEARCH_LIMIT).map(toListItem),
    truncated: rows.length > SEARCH_LIMIT,
  });
});

catalogRouter.get('/cards/:cardId', async (req, res) => {
  const { cardId } = req.params;
  if (!ID_RE.test(cardId)) {
    res.status(400).json({ error: 'Invalid card id' });
    return;
  }

  let card = await pool.query('SELECT * FROM catalog.cards WHERE id = $1', [cardId]);
  if (!card.rowCount || card.rows[0].detail_synced_at === null) {
    try {
      await syncCard(cardId);
    } catch (err) {
      if (err instanceof TcgdexNotFound) {
        res.status(404).json({ error: 'Card not found' });
        return;
      }
      throw err;
    }
    card = await pool.query('SELECT * FROM catalog.cards WHERE id = $1', [cardId]);
  }

  const row = card.rows[0];
  const set = await pool.query(
    'SELECT name, symbol, symbol_path, card_count_official, card_count_total FROM catalog.sets WHERE id = $1',
    [row.set_id],
  );
  const rarity = row.rarity
    ? await pool.query('SELECT icon_path FROM catalog.rarities WHERE name = $1', [row.rarity])
    : null;
  const iconPath: string | null = rarity?.rows[0]?.icon_path ?? null;
  const s = set.rows[0];

  res.json({
    ...row,
    price_market: num(row.price_market),
    image_url: cardImage(row),
    set_name: s?.name ?? null,
    set_symbol_url: s ? resolveAsset(s.symbol, s.symbol_path) : null,
    card_count_official: s?.card_count_official ?? null,
    rarity_icon_url: iconPath ? rarityIconUrl(iconPath) : null,
    variant_options: variantOptions(row.variants),
  });
});