import { fetchOwnedTotals } from '@/src/lib/ownership';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

// Refetches on every focus, so coming back from the entry modal shows fresh counts.
export function useOwnedTotals(cardIds: string[]) {
  const [owned, setOwned] = useState<Map<string, number>>(new Map());

  useFocusEffect(
    useCallback(() => {
      if (cardIds.length === 0) {
        setOwned(new Map());
        return;
      }
      let cancelled = false;
      fetchOwnedTotals(cardIds)
        .then((m) => {
          if (!cancelled) setOwned(m);
        })
        .catch((err) => console.warn('Could not load ownership:', err));
      return () => {
        cancelled = true;
      };
    }, [cardIds]),
  );

  return owned;
}