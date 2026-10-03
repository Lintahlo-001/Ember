import { fetchFavoriteSetIds } from '@/src/lib/favorites';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export function useFavoriteSets() {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchFavoriteSetIds()
        .then((s) => !cancelled && setIds(s))
        .catch((err) => console.warn('Could not load favorites:', err));
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return ids;
}