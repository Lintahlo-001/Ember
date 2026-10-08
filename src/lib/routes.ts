import { useSegments, type Href } from 'expo-router';

export type TabStack = 'dashboard' | 'wishlist' | 'pokedex';

export function useTabStack(): TabStack {
  const segments = useSegments() as string[];
  const tab = segments[1];
  return tab === 'wishlist' || tab === 'pokedex' ? tab : 'dashboard';
}

export function pokemonDetailHref(stack: TabStack, pokemonId: number | string): Href {
  const params: { pokemonId: string; from?: string } = { pokemonId: String(pokemonId) };
  if (stack !== 'pokedex') params.from = stack;
  return { pathname: '/(tabs)/pokedex/pokemon-detail/[pokemonId]', params };
}

export function cardDetailHref(stack: TabStack, cardId: string): Href {
  const params = { cardId };
  switch (stack) {
    case 'wishlist':
      return { pathname: '/(tabs)/wishlist/card-detail/[cardId]', params };
    case 'pokedex':
      return { pathname: '/(tabs)/pokedex/card-detail/[cardId]', params };
    default:
      return { pathname: '/(tabs)/dashboard/card-detail/[cardId]', params };
  }
}