const BASE = 'https://api.tcgdex.net/v2/en';

export class TcgdexNotFound extends Error {}

export type TcgdexSetBrief = {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  cardCount?: { total?: number; official?: number };
};

export type TcgdexSet = TcgdexSetBrief & {
  releaseDate?: string;
  serie?: { id?: string; name?: string };
  cards?: { id: string; localId?: string; name: string; image?: string }[];
};

export type TcgdexCard = {
  id: string;
  localId?: string;
  name: string;
  image?: string;
  category?: string;
  rarity?: string;
  illustrator?: string;
  dexId?: number[];
  variants?: Record<string, unknown>;
  set: { id: string };
  pricing?: {
    tcgplayer?: { unit?: string } & Record<string, unknown>;
    cardmarket?: { unit?: string; trend?: number; avg?: number } & Record<string, unknown>;
  };
};

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(15_000) });
  if (res.status === 404) throw new TcgdexNotFound(path);
  if (!res.ok) throw new Error(`TCGdex ${res.status} for ${path}`);
  return (await res.json()) as T;
}

export const listSets = () => get<TcgdexSetBrief[]>('/sets');
export const getSet = (id: string) => get<TcgdexSet>(`/sets/${encodeURIComponent(id)}`);
export const getCard = (id: string) => get<TcgdexCard>(`/cards/${encodeURIComponent(id)}`);