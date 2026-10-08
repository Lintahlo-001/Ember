const shown = new Set<string>();
const MAX = 3000;

export const hasShown = (uri: string | null) => !!uri && shown.has(uri);

export function markShown(uri: string | null) {
  if (!uri) return;
  if (shown.size >= MAX) shown.clear();
  shown.add(uri);
}