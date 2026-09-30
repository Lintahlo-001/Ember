const BASE = 'https://api.pokewallet.io';

function apiKey(): string {
  const key = process.env.POKEWALLET_API_KEY;
  if (!key) throw new Error('POKEWALLET_API_KEY is not set — check server/.env');
  return key;
}

export class PwRateLimited extends Error {
  constructor(path: string, public retryAfterSec: number | null = null) {
    super(`PokeWallet rate limited: ${path}`);
    this.name = 'PwRateLimited';
  }
}

function rateLimited(res: Response, path: string): PwRateLimited {
  const ra = Number(res.headers.get('retry-after'));
  return new PwRateLimited(path, Number.isFinite(ra) && ra > 0 ? ra : null);
}

export const requestStats = { count: 0 };

async function get<T>(path: string): Promise<T> {
  requestStats.count++;
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-API-Key': apiKey() },
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 429) throw rateLimited(res, path);
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
  if (res.status === 429) throw rateLimited(res, path);
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

export type PwSetCard = {
  id: string;
  card_info: { name: string | null; card_number: string | null; product_type: string };
};

type PwSetDetail = {
  success: boolean;
  set: { name: string; set_code: string | null; set_id: string };
  cards: PwSetCard[];
  pagination?: { page?: number; total_pages?: number };
  [key: string]: unknown;
};

export async function getPwSetPage(pwSetCodeOrId: string, page = 1): Promise<PwSetDetail> {
  const base = `/sets/${encodeURIComponent(pwSetCodeOrId)}`;
  return get<PwSetDetail>(page === 1 ? base : `${base}?page=${page}`);
}

const MAX_PAGES = 15;

export async function getPwSetCards(pwSetCodeOrId: string): Promise<PwSetCard[]> {
  const byId = new Map<string, PwSetCard>();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const d = await getPwSetPage(pwSetCodeOrId, page);
    const before = byId.size;
    for (const c of d.cards ?? []) byId.set(c.id, c);
    const totalPages = Number(d.pagination?.total_pages ?? d.total_pages ?? 1);
    if (page >= totalPages || byId.size === before) break;
  }
  return [...byId.values()];
}

function normId(s: string): string {
  return s.split('/')[0].trim().toLowerCase().replace(/^([a-z]*)0+(?=\d)/, '$1');
}

function cleanName(s: string | null): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*-\s*[a-z]*\d+\s*$/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function nameScore(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 3;
  if (a.includes(b) || b.includes(a)) return 2;
  const words = new Set(a.split(' '));
  return b.split(' ').some((w) => words.has(w)) ? 1 : 0;
}

function cardNumbers(c: PwSetCard): string[] {
  const out: string[] = [];
  if (c.card_info.card_number) out.push(normId(c.card_info.card_number));
  const m = c.card_info.name?.match(/-\s*([A-Za-z]*\d+)\s*$/);
  if (m) out.push(normId(m[1]));
  return out;
}

export function findPwCard(
  cards: PwSetCard[],
  tcgdexLocalId: string,
  tcgdexName: string | null,
): PwSetCard | null {
  const want = normId(tcgdexLocalId);
  const numMatches = cards.filter(
    (c) => c.card_info.product_type === 'card' && cardNumbers(c).includes(want),
  );
  if (numMatches.length === 0) return null;
  const wantName = cleanName(tcgdexName);
  if (!wantName) return numMatches[0];

  const scored = numMatches
    .map((c) => ({ c, s: nameScore(cleanName(c.card_info.name), wantName) }))
    .sort((a, b) => b.s - a.s);
  if (scored[0].s === 0 && scored.length > 1) return null;
  return scored[0].c;
}

export async function fetchSetLogo(pwSetId: string): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  return getBinary(`/sets/${pwSetId}/image`);
}

export async function fetchImageById(pwCardId: string): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  return getBinary(`/images/${pwCardId}?size=high`);
}