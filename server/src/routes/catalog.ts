import express, { Router } from 'express';
import { pool } from '../db';
import { publicUrl, rarityIconUrl } from '../storage';
import { ensureLoaded, suggest } from '../suggest';
import { syncCard, syncSet } from '../sync';
import { isUsableTcgdexAsset, TcgdexNotFound, tcgdexSymbolUrl } from '../tcgdex';

export const catalogRouter = Router();

const ID_RE = /^[A-Za-z0-9._-]{1,40}$/;
const VARIANT_RE = /^[A-Za-z0-9_-]{1,40}$/;
const SEARCH_LIMIT = 200;

const IMG_EXT_RE = /\.(png|webp|jpe?g)$/i;
const withExt = (url: string) => (IMG_EXT_RE.test(url) ? url : `${url}.webp`);

function resolveAsset(tcgdexUrl: string | null, storagePath: string | null): string | null {
  if (storagePath) return publicUrl(storagePath);
  if (tcgdexUrl && isUsableTcgdexAsset(tcgdexUrl)) return withExt(tcgdexUrl);
  return null;
}

const resolveSymbol = (symbol: string | null, storagePath: string | null) =>
  resolveAsset(tcgdexSymbolUrl(symbol), storagePath);

const versioned = (url: string | null, v: string | null | undefined) =>
  url && v ? `${url}?v=${v}` : url;

const cardImage = (c: { image_base: string | null; image_path: string | null; image_version?: string | null }) =>
  versioned(resolveAsset(c.image_base ? `${c.image_base}/high.webp` : null, c.image_path), c.image_version);

const LIST_COLS = `id, set_id, local_id, name, image_base, image_path, image_version,
                   rarity, illustrator, price_market, price_currency, synced_at`;

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
    image_version: c.image_version ?? null,
    synced_at: c.synced_at ?? null,
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
      symbol_url: resolveSymbol(s.symbol, s.symbol_path),
    })),
  );
});

catalogRouter.get('/sets/status', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT s.id, s.images_updated_at, s.synced_at, max(c.synced_at) AS cards_synced_at
     FROM catalog.sets s LEFT JOIN catalog.cards c ON c.set_id = s.id
     GROUP BY s.id`,
  );
  res.json(rows);
});

const VERSION_RE = /^[a-f0-9]{8}$/;
const KNOWN_MAX = 2000;

catalogRouter.post('/sets/:setId/changes', express.json({ limit: '100kb' }), async (req, res) => {
  const { setId } = req.params;
  if (!ID_RE.test(setId)) {
    res.status(400).json({ error: 'Invalid set id' });
    return;
  }

  const raw: unknown = req.body?.known;
  const valid =
    Array.isArray(raw) &&
    raw.length <= KNOWN_MAX &&
    raw.every(
      (t) =>
        Array.isArray(t) &&
        t.length === 3 &&
        typeof t[0] === 'string' && ID_RE.test(t[0]) &&
        (t[1] === null || (typeof t[1] === 'string' && VERSION_RE.test(t[1]))) &&
        (t[2] === null || (typeof t[2] === 'string' && !Number.isNaN(Date.parse(t[2])))),
    );
  if (!valid) {
    res.status(400).json({ error: `known must be up to ${KNOWN_MAX} [id, version, syncedAt] triples` });
    return;
  }

  const set = await pool.query('SELECT 1 FROM catalog.sets WHERE id = $1', [setId]);
  if (!set.rowCount) {
    res.status(404).json({ error: 'Set not found' });
    return;
  }

  const client = new Map(
    (raw as [string, string | null, string | null][]).map(([id, v, s]) => [
      id,
      { v, s: s ? Date.parse(s) : null },
    ]),
  );
  const { rows } = await pool.query(
    `SELECT ${LIST_COLS} FROM catalog.cards WHERE set_id = $1`,
    [setId],
  );

  const changed = rows.filter((r) => {
    const k = client.get(r.id);
    return !k || (r.image_version ?? null) !== k.v || r.synced_at.getTime() !== k.s;
  });
  const serverIds = new Set(rows.map((r) => r.id));

  res.json({
    changed: changed.map(toListItem),
    removed: [...client.keys()].filter((id) => !serverIds.has(id)),
  });
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
    `SELECT ${LIST_COLS}
     FROM catalog.cards WHERE set_id = $1
     ORDER BY NULLIF(regexp_replace(local_id, '\\D', '', 'g'), '')::int NULLS LAST, local_id`,
    [setId],
  );

  const row = set.rows[0];
  res.json({
    ...row,
    logo_url: resolveAsset(row.logo, row.logo_path),
    symbol_url: resolveSymbol(row.symbol, row.symbol_path),
    cards: cards.rows.map(toListItem),
  });
});

const SUGGEST_MIN_CHARS = 2;

catalogRouter.get('/cards/suggest', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length > 100) {
    res.status(400).json({ error: 'Query too long' });
    return;
  }
  if (q.length < SUGGEST_MIN_CHARS) {
    res.json([]);
    return;
  }
  await ensureLoaded();
  res.json(suggest(q));
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
    `SELECT ${LIST_COLS}
     FROM catalog.cards
     WHERE ($1::text IS NULL OR name ILIKE $1 ESCAPE '\\' OR illustrator ILIKE $1 ESCAPE '\\')
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

const BATCH_LIMIT = 200;

catalogRouter.post('/cards/batch', async (req, res) => {
  const raw: unknown = req.body?.ids;
  if (
    !Array.isArray(raw) ||
    raw.length === 0 ||
    raw.length > BATCH_LIMIT ||
    !raw.every((i): i is string => typeof i === 'string' && ID_RE.test(i))
  ) {
    res.status(400).json({ error: `Provide 1-${BATCH_LIMIT} valid card ids` });
    return;
  }
  const { rows } = await pool.query(
    `SELECT ${LIST_COLS}
     FROM catalog.cards WHERE id = ANY($1::text[])`,
    [[...new Set(raw)]],
  );
  res.json(rows.map(toListItem));
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
    set_symbol_url: s ? resolveSymbol(s.symbol, s.symbol_path) : null,
    card_count_official: s?.card_count_official ?? null,
    rarity_icon_url: iconPath ? rarityIconUrl(iconPath) : null,
    variant_options: variantOptions(row.variants),
  });
});