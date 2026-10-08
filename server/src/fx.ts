import { pool } from './db';

export const FX_CURRENCIES = ['PHP', 'USD', 'CAD', 'EUR', 'GBP', 'AUD', 'CNY', 'JPY', 'KRW'] as const;
const TTL_MS = 12 * 60 * 60 * 1000;

export type Fx = { base: 'USD'; rates: Record<string, number>; date: string | null; fetched_at: string };

const toFx = (row: any): Fx => ({
  base: 'USD',
  rates: row.rates,
  date: row.rates_date ?? null,
  fetched_at: new Date(row.fetched_at).toISOString(),
});

async function doRefresh(): Promise<Fx> {
  const symbols = FX_CURRENCIES.filter((c) => c !== 'USD').join(',');
  const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=USD&symbols=${symbols}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
  const body = (await res.json()) as { rates?: Record<string, unknown>; date?: unknown };

  const rates: Record<string, number> = { USD: 1 };
  for (const c of FX_CURRENCIES) {
    if (c === 'USD') continue;
    const v = body.rates?.[c];
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) throw new Error(`Missing rate for ${c}`);
    rates[c] = v;
  }
  const date = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : null;

  const { rows } = await pool.query(
    `INSERT INTO catalog.fx_rates (base, rates, rates_date, fetched_at)
     VALUES ('USD', $1::jsonb, $2, now())
     ON CONFLICT (base) DO UPDATE SET
       rates = EXCLUDED.rates, rates_date = EXCLUDED.rates_date, fetched_at = now()
     RETURNING rates, rates_date, fetched_at`,
    [JSON.stringify(rates), date],
  );
  return toFx(rows[0]);
}

let inflight: Promise<Fx> | null = null;
export function refreshFx(): Promise<Fx> {
  inflight ??= doRefresh().finally(() => {
    inflight = null;
  });
  return inflight;
}

export async function getFx(): Promise<Fx | null> {
  const { rows } = await pool.query(
    "SELECT rates, rates_date, fetched_at FROM catalog.fx_rates WHERE base = 'USD'",
  );
  const current = rows[0] ? toFx(rows[0]) : null;
  if (current && Date.now() - Date.parse(current.fetched_at) < TTL_MS) return current;
  try {
    return await refreshFx();
  } catch (err) {
    console.error('FX refresh failed:', (err as Error).message);
    return current;
  }
}