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

// PokeAPI's official-artwork front_default, built from the dex id (no API call).
export const pokemonArtworkUrl = (dexId: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dexId}.png`;

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