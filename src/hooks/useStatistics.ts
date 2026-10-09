import type { CardListItem, SetBrief } from '@/src/lib/api';
import { catalog } from '@/src/lib/catalog';
import { fetchOwnedDex } from '@/src/lib/pokedex';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export type StatisticsData = {
  sets: SetBrief[];
  owned: Map<string, number>;
  ownedCards: CardListItem[];
  ownedPokemon: number;
  totalPokemon: number;
};

export function useStatistics(owned: Map<string, number>, ownedLoaded: boolean) {
  const [data, setData] = useState<StatisticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!ownedLoaded) return;
      let cancelled = false;
      (async () => {
        const [sets, dex, pokedex] = await Promise.all([
          catalog.sets(),
          fetchOwnedDex(),
          catalog.pokedex().catch(() => null),
        ]);
        const ownedCards = await catalog.cardsByIds([...owned.keys()]).catch(() => [] as CardListItem[]);
        if (cancelled) return;
        setData({
          sets,
          owned,
          ownedCards,
          ownedPokemon: dex.size,
          totalPokemon: pokedex?.species.length ?? 0,
        });
        setError(null);
      })().catch((e: Error) => !cancelled && setError(e.message));
      return () => {
        cancelled = true;
      };
    }, [owned, ownedLoaded, reloadKey]),
  );

  return { data, error, reload: () => setReloadKey((k) => k + 1) };
}