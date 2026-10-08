import { Router } from 'express';
import { pool } from '../db';
import { getFx } from '../fx';
import { syncCard } from '../sync';
import { TcgdexNotFound } from '../tcgdex';
import { num } from './catalog';

export const pricingRouter = Router();

const ID_RE = /^[A-Za-z0-9._-]{1,40}$/;
const KEY_RE = /^[A-Za-z0-9_-]{1,40}$/;
const BATCH_LIMIT = 200;
const REFRESH_CAP = 40;

type VariantPrice = {
  key: string;
  label: string;
  market: number | null;
  low: number | null;
  mid: number | null;
  high: number | null;
};
type Source = { unit: string; updated: string | null; variants: VariantPrice[] };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const price = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 1e7 ? v : null;
const first = (o: Record<string, unknown>, ...keys: string[]): number | null => {
  for (const k of keys) {
    const p = price(o[k]);
    if (p !== null) return p;
  }
  return null;
};
const unitOf = (v: unknown, fallback: string) => (typeof v === 'string' && /^[A-Z]{3}$/.test(v) ? v : fallback);
const stampOf = (v: unknown) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v.slice(0, 40) : null);
const humanize = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
const hasAny = (v: VariantPrice) => [v.market, v.low, v.mid, v.high].some((x) => x !== null);

function tcgplayerSource(raw: unknown): Source | null {
  if (!isObj(raw)) return null;
  const variants: VariantPrice[] = [];
  for (const [key, v] of Object.entries(raw)) {
    if (!isObj(v) || !KEY_RE.test(key)) continue;
    const row: VariantPrice = {
      key,
      label: humanize(key),
      market: first(v, 'marketPrice'),
      low: first(v, 'lowPrice'),
      mid: first(v, 'midPrice'),
      high: first(v, 'highPrice'),
    };
    if (hasAny(row)) variants.push(row);
  }
  if (variants.length === 0) return null;
  variants.sort((a, b) => (b.key === 'normal' ? 1 : 0) - (a.key === 'normal' ? 1 : 0));
  return { unit: unitOf(raw.unit, 'USD'), updated: stampOf(raw.updated), variants };
}

function cardmarketSource(raw: unknown): Source | null {
  if (!isObj(raw)) return null;
  const variants = [
    {
      key: 'normal', label: 'Normal',
      market: first(raw, 'trend'), low: first(raw, 'low'), mid: first(raw, 'avg'), high: null,
    },
    {
      key: 'holo', label: 'Holo',
      market: first(raw, 'trend-holo', 'trendHolo'),
      low: first(raw, 'low-holo', 'lowHolo'),
      mid: first(raw, 'avg-holo', 'avgHolo'),
      high: null,
    },
  ].filter(hasAny);
  if (variants.length === 0) return null;
  return { unit: unitOf(raw.unit, 'EUR'), updated: stampOf(raw.updated), variants };
}

pricingRouter.get('/fx', async (_req, res) => {
  const fx = await getFx();
  if (!fx) {
    res.status(503).json({ error: 'Exchange rates unavailable' });
    return;
  }
  res.json(fx);
});

pricingRouter.get('/cards/:cardId/pricing', async (req, res) => {
  const { cardId } = req.params;
  if (!ID_RE.test(cardId)) {
    res.status(400).json({ error: 'Invalid card id' });
    return;
  }

  const load = () =>
    pool.query('SELECT pricing, detail_synced_at FROM catalog.cards WHERE id = $1', [cardId]);
  let r = await load();
  if (!r.rowCount || r.rows[0].detail_synced_at === null) {
    try {
      await syncCard(cardId);
    } catch (err) {
      if (err instanceof TcgdexNotFound) {
        res.status(404).json({ error: 'Card not found' });
        return;
      }
      throw err;
    }
    r = await load();
  }
  if (!r.rowCount) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  const p = r.rows[0].pricing;
  res.json({
    card_id: cardId,
    tcgplayer: tcgplayerSource(p?.tcgplayer),
    cardmarket: cardmarketSource(p?.cardmarket),
  });
});

pricingRouter.post('/cards/prices', async (req, res) => {
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
  const ids = [...new Set(raw)];

  const stale = await pool.query(
    `SELECT id FROM catalog.cards
     WHERE id = ANY($1::text[]) AND detail_synced_at IS NOT NULL
       AND detail_synced_at < now() - interval '24 hours'
     ORDER BY detail_synced_at ASC LIMIT $2`,
    [ids, REFRESH_CAP],
  );
  let failed = 0;
  for (let i = 0; i < stale.rows.length; i += 5) {
    const results = await Promise.allSettled(stale.rows.slice(i, i + 5).map((r) => syncCard(r.id)));
    failed += results.filter((x) => x.status === 'rejected').length;
  }
  if (failed > 0) console.warn(`/cards/prices: ${failed} card refreshes failed`);

  const { rows } = await pool.query(
    'SELECT id, price_market, price_currency, synced_at FROM catalog.cards WHERE id = ANY($1::text[])',
    [ids],
  );
  res.json(
    rows.map((r) => ({
      id: r.id,
      price_market: num(r.price_market),
      price_currency: r.price_currency,
      synced_at: r.synced_at ?? null,
    })),
  );
});