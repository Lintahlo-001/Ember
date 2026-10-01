import { api, type Suggestion } from '@/src/lib/api';
import { useEffect, useState } from 'react';

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

export function useSearchSuggestions(input: string, enabled = true) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    const q = input.trim();
    if (!enabled || q.length < MIN_CHARS) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      api
        .suggest(q)
        .then((r) => !cancelled && setSuggestions(r))
        .catch(() => !cancelled && setSuggestions([]));
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [input, enabled]);

  return suggestions;
}