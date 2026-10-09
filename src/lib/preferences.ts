import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export type Prefs = {
  dimUnownedCards: boolean;
  dimUnownedPokemon: boolean;
  cardsQuickAdd: boolean;
  cardsOwnedBadge: boolean;
  pokedexOwnedBadge: boolean;
};
const KEY = 'ember.prefs.v1';
const DEFAULTS: Prefs = {
  dimUnownedCards: false,
  dimUnownedPokemon: false,
  cardsQuickAdd: true,
  cardsOwnedBadge: true,
  pokedexOwnedBadge: true,
};

let state: Prefs = DEFAULTS;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

AsyncStorage.getItem(KEY)
  .then((raw) => { if (raw) { try { state = { ...DEFAULTS, ...JSON.parse(raw) }; emit(); } catch { } } })
  .catch(() => {});

export async function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  state = { ...state, [key]: value };
  emit();
  try { await AsyncStorage.setItem(KEY, JSON.stringify(state)); } catch { }
}

export function usePref<K extends keyof Prefs>(key: K): Prefs[K] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => state[key],
    () => DEFAULTS[key],
  );
}

export function useBadgePrefs(scope: 'cards' | 'pokedex') {
  const quickAdd = usePref('cardsQuickAdd');
  const ownedBadge = usePref(scope === 'cards' ? 'cardsOwnedBadge' : 'pokedexOwnedBadge');
  return { quickAdd, ownedBadge };
}

export const useDimUnownedCards = () => usePref('dimUnownedCards');
export const useDimUnownedPokemon = () => usePref('dimUnownedPokemon');