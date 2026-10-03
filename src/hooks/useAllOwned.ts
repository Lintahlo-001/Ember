import { fetchAllOwned } from '@/src/lib/ownership';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export function useAllOwned() {
  const [owned, setOwned] = useState<Map<string, number>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchAllOwned()
        .then((m) => {
          if (cancelled) return;
          setOwned(m);
          setError(null);
          setLoaded(true);
        })
        .catch((e) => !cancelled && setError((e as Error).message));
      return () => {
        cancelled = true;
      };
    }, [reloadKey]),
  );

  return { owned, loaded, error, reload: () => setReloadKey((k) => k + 1) };
}