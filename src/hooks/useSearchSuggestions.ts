import { api, type Suggestion } from '@/src/lib/api';
import { useEffect, useRef, useState } from 'react';

const MIN_CHARS = 2;
const DEBOUNCE_MS = 120;
const CACHE_MAX = 100;

export function useSearchSuggestions(input: string, enabled = true) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const cache = useRef(new Map<string, Suggestion[]>());

  useEffect(() => {
    const q = input.trim().toLowerCase();
    if (!enabled || q.length < MIN_CHARS) {
      setSuggestions([]);
      return;
    }

    const hit = cache.current.get(q);
    if (hit) {
      setSuggestions(hit);
      return;
    }

    setSuggestions((prev) => prev.filter((s) => s.label.toLowerCase().includes(q)));

    let cancelled = false;
    const timer = setTimeout(() => {
      api
        .suggest(q)
        .then((r) => {
          if (cancelled) return;
          if (cache.current.size >= CACHE_MAX) cache.current.clear();
          cache.current.set(q, r);
          setSuggestions(r);
        })
        .catch(() => !cancelled && setSuggestions([]));
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [input, enabled]);

  return suggestions;
}