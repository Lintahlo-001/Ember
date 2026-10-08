import {
    convertAmount,
    ensureFx,
    formatMoney,
    getCurrencyState,
    initCurrency,
    subscribeCurrency,
} from '@/src/lib/currency';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

export function useCurrency() {
  const s = useSyncExternalStore(subscribeCurrency, getCurrencyState);

  useEffect(() => {
    initCurrency()
      .then(() => ensureFx())
      .catch(() => {});
  }, []);

  const convert = useCallback(
    (value: number, from?: string | null) => convertAmount(s.rates, value, (from ?? 'USD').toUpperCase(), s.code),
    [s.rates, s.code],
  );

  const format = useCallback(
    (value: number | null | undefined, from?: string | null) => {
      if (value == null) return 'No price';
      const c = convert(value, from);
      return c !== null ? formatMoney(c, s.code) : formatMoney(value, (from ?? 'USD').toUpperCase());
    },
    [convert, s.code],
  );

  return { code: s.code, ratesReady: !!s.rates, ratesAt: s.ratesAt, convert, format };
}