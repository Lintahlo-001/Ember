const BASE = 'https://api.pokewallet.io';

function apiKey(): string {
  const key = process.env.POKEWALLET_API_KEY;
  if (!key) throw new Error('POKEWALLET_API_KEY is not set — check server/.env');
  return key;
}

export class PwRateLimited extends Error {}

export const requestStats = { count: 0 };

async function get<T>(path: string): Promise<T> {
  requestStats.count++;
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-API-Key': apiKey() },
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 429) throw new PwRateLimited(path);
  if (!res.ok) throw new Error(`PokeWallet ${res.status} for ${path}`);
  return (await res.json()) as T;
}

async function getBinary(path: string): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  requestStats.count++;
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-API-Key': apiKey() },
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 404) return null;
  if (res.status === 429) throw new PwRateLimited(path);
  if (!res.ok) throw new Error(`PokeWallet ${res.status} for ${path}`);
  return { bytes: await res.arrayBuffer(), contentType: res.headers.get('content-type') ?? 'image/jpeg' };
}

export type PwSet = {
  name: string;
  set_code: string | null;
  set_id: string;
  language: string;
  card_count?: number;
};

export async function listPwSets(): Promise<PwSet[]> {
  const { data } = await get<{ data: PwSet[] }>('/sets');
  return data;
}

const STOPWORDS = new Set([
  'the', 'and', 'of', 'pokemon', 'tcg', 'set', 'sets', 'collection',
  'collections', 'series', 'promo', 'promos', 'pack', 'packs', 'deck',
  'decks', 'card', 'cards', 'edition', 'exclusive', 'exclusives',
]);

function normalizeWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function extractYear(s: string): string | null {
  const m = s.match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : null;
}

export function findPwSet(pwSets: PwSet[], tcgdexSetId: string, tcgdexSetName: string): PwSet | null {
  const byCode = pwSets.filter((s) => s.set_code?.toLowerCase() === tcgdexSetId.toLowerCase());
  const byName = pwSets.filter((s) => s.name.toLowerCase() === tcgdexSetName.toLowerCase());
  const exact = byCode.length > 0 ? byCode : byName;
  if (exact.length > 0) return exact.find((s) => s.language === 'eng') ?? exact[0];

  const tcgdexYear = extractYear(tcgdexSetName);
  const tcgdexWords = new Set(normalizeWords(tcgdexSetName));
  if (tcgdexWords.size === 0) return null;

  let best: PwSet | null = null;
  let bestScore = 0;
  for (const s of pwSets) {
    const pwYear = extractYear(s.name);
    if (tcgdexYear && tcgdexYear !== pwYear) continue;
    const pwWords = normalizeWords(s.name);
    const overlap = pwWords.filter((w) => tcgdexWords.has(w)).length;
    if (overlap === 0) continue;
    const score = overlap + (s.language === 'eng' ? 0.5 : 0);
    if (score > bestScore) { bestScore = score; best = s; }
  }
  return bestScore > 0 ? best : null;
}

type PwSetCard = {
  id: string;
  card_info: {
    name: string | null;
    card_number: string | null;
    product_type: string;
  };
};
type PwSetDetail = {
  success: boolean;
  set: { name: string; set_code: string | null; set_id: string };
  cards: PwSetCard[];
};

export async function getPwSetCards(pwSetCodeOrId: string): Promise<PwSetCard[]> {
  const { cards } = await get<PwSetDetail>(`/sets/${encodeURIComponent(pwSetCodeOrId)}`);
  return cards;
}

function localIdMatches(tcgdexLocalId: string, pwCardNumber: string | null): boolean {
  if (!pwCardNumber) return false;
  const numerator = pwCardNumber.split('/')[0].trim();
  const a = Number(tcgdexLocalId);
  const b = Number(numerator);
  if (Number.isFinite(a) && Number.isFinite(b)) return a === b;
  return tcgdexLocalId.trim() === numerator; // non-numeric ids (rare promos etc.)
}

export async function fetchCardImage(
  pwSetCodeOrId: string,
  tcgdexLocalId: string,
): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  const cards = await getPwSetCards(pwSetCodeOrId);
  const match = cards.find(
    (c) => c.card_info.product_type === 'card' && localIdMatches(tcgdexLocalId, c.card_info.card_number),
  );
  if (!match) return null;
  return getBinary(`/images/${match.id}?size=high`);
}

export async function fetchSetLogo(pwSetId: string): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  return getBinary(`/sets/${pwSetId}/image`);
}

export async function fetchImageById(pwCardId: string): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  return getBinary(`/images/${pwCardId}?size=high`);
}