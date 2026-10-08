import type { Region, Species } from '@/src/lib/api';
import { catalog } from '@/src/lib/catalog';
import { fetchOwnedDex } from '@/src/lib/pokedex';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

export function usePokedexData() {
  const [data, setData] = useState<{ species: Species[]; regions: Region[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    catalog
      .pokedex()
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return { data, error, reload: () => setReloadKey((k) => k + 1) };
}

export function useOwnedDex() {
  const [owned, setOwned] = useState<Map<number, number>>(new Map());

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchOwnedDex()
        .then((m) => !cancelled && setOwned(m))
        .catch((err) => console.warn('Could not load owned Pokémon:', err));
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return owned;
}