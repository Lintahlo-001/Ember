import { api } from '@/src/lib/api';
import { getMeta, setMeta } from '@/src/lib/db';

export const CURRENCIES = [
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'KRW', name: 'Korean Won' },
] as const;
export type CurrencyCode = (typeof CURRENCIES)[number]['code'];
export const DEFAULT_CURRENCY: CurrencyCode = 'PHP';

const PREF_KEY = 'display_currency';
const FX_KEY = 'fx_rates';
const FX_TTL_MS = 24 * 60 * 60 * 1000;
const NO_DECIMALS = new Set(['JPY', 'KRW']);

type State = { code: CurrencyCode; rates: Record<string, number> | null; ratesAt: string | null };
let state: State = { code: DEFAULT_CURRENCY, rates: null, ratesAt: null };
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((fn) => fn());
};

export const getCurrencyState = () => state;
export const subscribeCurrency = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

const isCode = (v: unknown): v is CurrencyCode => CURRENCIES.some((c) => c.code === v);

function validRates(r: unknown): r is Record<string, number> {
  if (!r || typeof r !== 'object') return false;
  return CURRENCIES.every((c) => {
    const v = (r as Record<string, unknown>)[c.code];
    return typeof v === 'number' && Number.isFinite(v) && v > 0;
  });
}

let initP: Promise<void> | null = null;
export function initCurrency(): Promise<void> {
  initP ??= (async () => {
    const [code, raw] = await Promise.all([getMeta(PREF_KEY), getMeta(FX_KEY)]);
    const next: Partial<State> = {};
    if (isCode(code)) next.code = code;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (validRates(parsed.rates)) {
          next.rates = parsed.rates;
          next.ratesAt = typeof parsed.fetched_at === 'string' ? parsed.fetched_at : null;
        }
      } catch {}
    }
    set(next);
  })().catch((err) => {
    initP = null;
    console.warn('Currency init failed:', (err as Error).message);
  });
  return initP;
}

export async function setCurrency(code: CurrencyCode): Promise<void> {
  if (!isCode(code)) return;
  await setMeta(PREF_KEY, code);
  set({ code });
}

let fxRun: Promise<void> | null = null;
export function ensureFx(force = false): Promise<void> {
  fxRun ??= (async () => {
    await initCurrency();
    const at = Date.parse(state.ratesAt ?? '');
    if (!force && state.rates && !Number.isNaN(at) && Date.now() - at < FX_TTL_MS) return;
    const fx = await api.fx();
    if (!validRates(fx.rates)) throw new Error('Exchange rates were incomplete.');
    await setMeta(FX_KEY, JSON.stringify({ rates: fx.rates, fetched_at: fx.fetched_at }));
    set({ rates: fx.rates, ratesAt: fx.fetched_at });
  })().finally(() => {
    fxRun = null;
  });
  return fxRun;
}

export function convertAmount(
  rates: Record<string, number> | null,
  amount: number,
  from: string,
  to: string,
): number | null {
  if (from === to) return amount;
  const f = rates?.[from];
  const t = rates?.[to];
  if (!f || !t) return null;
  return (amount / f) * t;
}

export function formatMoney(value: number, code: string): string {
  const d = NO_DECIMALS.has(code) ? 0 : 2;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }).format(value);
  } catch {
    return `${value.toFixed(d)} ${code}`;
  }
}