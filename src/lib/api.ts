import { supabase } from '@/src/lib/supabase';

const BASE = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');
const TIMEOUT_MS = 75_000;

export type CardListItem = {
  id: string;
  set_id: string;
  local_id: string;
  name: string;
  rarity: string | null;
  illustrator: string | null;
  price_market: number | null;
  price_currency: string | null;
  image_url: string | null;
  image_version: string | null;
  synced_at?: string | null;
};

export type SetBrief = {
  id: string;
  name: string;
  serie_id?: string | null;
  serie_name: string | null;
  release_date: string | null;
  card_count_total: number;
  card_count_official: number;
  logo_url: string | null;
  symbol_url: string | null;
  images_updated_at?: string | null;
  synced_at?: string | null;
};

export type SetDetail = SetBrief & { cards: CardListItem[] };

export type CardDetail = CardListItem & {
  set_name: string | null;
  set_symbol_url: string | null;
  card_count_official: number | null;
  rarity_icon_url: string | null;
  variant_options: string[];
  dex_ids: number[];
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: { method?: 'GET' | 'POST'; body?: unknown }): Promise<T> {
  if (!BASE) throw new Error('EXPO_PUBLIC_API_URL is not set. Check your .env file.');

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError(401, 'You are signed out. Log in again.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: init?.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new ApiError(res.status, res.status === 404 ? 'Not found.' : `Server error (${res.status}).`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as Error).name === 'AbortError') throw new Error('The server took too long to respond.');
    throw new Error('Could not reach the server. Check your connection.');
  } finally {
    clearTimeout(timer);
  }
}

export type RarityIcon = { name: string; icon_url: string; icon_version: string | null };

export const api = {
  rarities: () => request<RarityIcon[]>('/rarities'),
  sets: () => request<SetBrief[]>('/sets'),
  set: (id: string) => request<SetDetail>(`/sets/${encodeURIComponent(id)}`),
  card: (id: string) => request<CardDetail>(`/cards/${encodeURIComponent(id)}`),
  search: (params: { q?: string; artist?: string }) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.artist) qs.set('artist', params.artist);
    return request<{ results: CardListItem[]; truncated: boolean }>(`/cards/search?${qs.toString()}`);
  },
  suggest: (q: string) =>
  request<Suggestion[]>(`/cards/suggest?q=${encodeURIComponent(q)}`),
  cardsByIds: async (ids: string[]) => {
    const out: CardListItem[] = [];
    for (let i = 0; i < ids.length; i += 200) {
      out.push(...(await request<CardListItem[]>('/cards/batch', { method: 'POST', body: { ids: ids.slice(i, i + 200) } })));
    }
    return out;
  },
};

export type Suggestion = { label: string; kind: 'card' | 'artist' };