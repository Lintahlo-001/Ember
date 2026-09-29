import { Router } from 'express';
import { pool } from '../db';
import { publicUrl } from '../storage';
import { syncCard, syncSet } from '../sync';
import { isUsableTcgdexAsset, TcgdexNotFound } from '../tcgdex';

export const catalogRouter = Router();

const ID_RE = /^[A-Za-z0-9._-]{1,40}$/;

function resolveAsset(tcgdexUrl: string | null, storagePath: string | null): string | null {
  if (storagePath) return publicUrl(storagePath);
  if (isUsableTcgdexAsset(tcgdexUrl)) return tcgdexUrl;
  return null;
}

catalogRouter.get('/sets', async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM catalog.sets ORDER BY release_date DESC NULLS LAST, name',
  );
  res.json(
    rows.map((s) => ({
      ...s,
      logo_url: resolveAsset(s.logo, s.logo_path),
      symbol_url: resolveAsset(s.symbol, null),
    })),
  );
});

catalogRouter.get('/sets/:setId', async (req, res) => {
  const { setId } = req.params;
  if (!ID_RE.test(setId)) return res.status(400).json({ error: 'Invalid set id' });

  let set = await pool.query('SELECT * FROM catalog.sets WHERE id = $1', [setId]);
  if (!set.rowCount) {
    try {
      await syncSet(setId);
    } catch (err) {
      if (err instanceof TcgdexNotFound) return res.status(404).json({ error: 'Set not found' });
      throw err;
    }
    set = await pool.query('SELECT * FROM catalog.sets WHERE id = $1', [setId]);
  }
  const cards = await pool.query(
    `SELECT id, local_id, name, image_base, image_path, image_source, rarity, price_market, price_currency
     FROM catalog.cards WHERE set_id = $1
     ORDER BY NULLIF(regexp_replace(local_id, '\\D', '', 'g'), '')::int NULLS LAST, local_id`,
    [setId],
  );

  const row = set.rows[0];
  res.json({
    ...row,
    logo_url: resolveAsset(row.logo, row.logo_path),
    symbol_url: resolveAsset(row.symbol, null),
    cards: cards.rows.map((c) => ({
      ...c,
      image_url: resolveAsset(c.image_base ? `${c.image_base}/high.webp` : null, c.image_path),
    })),
  });
});

catalogRouter.get('/cards/:cardId', async (req, res) => {
  const { cardId } = req.params;
  if (!ID_RE.test(cardId)) return res.status(400).json({ error: 'Invalid card id' });

  let card = await pool.query('SELECT * FROM catalog.cards WHERE id = $1', [cardId]);
  if (!card.rowCount || card.rows[0].detail_synced_at === null) {
    try {
      await syncCard(cardId);
    } catch (err) {
      if (err instanceof TcgdexNotFound) return res.status(404).json({ error: 'Card not found' });
      throw err;
    }
    card = await pool.query('SELECT * FROM catalog.cards WHERE id = $1', [cardId]);
  }

  const row = card.rows[0];
  res.json({
    ...row,
    image_url: resolveAsset(row.image_base ? `${row.image_base}/high.webp` : null, row.image_path),
  });
});