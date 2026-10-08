const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatReleaseDate(v: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? ''));
  if (!m) return 'Release date unknown';
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

export function formatPrice(value: number | null | undefined, currency: string | null | undefined): string {
  if (value == null) return 'No price';
  const n = value.toFixed(2);
  if (!currency || currency === 'USD') return `$${n}`;
  if (currency === 'EUR') return `€${n}`;
  return `${n} ${currency}`;
}

export const cardNumber = (localId: string, official: number | null | undefined) =>
  official ? `${localId}/${official}` : localId;

export const pokemonArtworkUrl = (dexId: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dexId}.png?v=1`;

const VARIANT_LABELS: Record<string, string> = {
  normal: 'Normal',
  reverse: 'Reverse Holo',
  holo: 'Holo',
  firstEdition: '1st Edition',
  wPromo: 'W Promo',
};

export function variantLabel(key: string): string {
  if (VARIANT_LABELS[key]) return VARIANT_LABELS[key];
  const spaced = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(0, Math.round(n / 1024))} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(n < 100 * 1024 ** 2 ? 1 : 0)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function formatAgo(iso: string | null | undefined): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(t)) return 'never';
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}