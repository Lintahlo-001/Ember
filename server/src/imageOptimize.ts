import sharp from 'sharp';

sharp.cache({ items: 20 });
sharp.concurrency(1);

export type ImageKind = 'card' | 'logo' | 'icon';
const PRESET: Record<ImageKind, { width: number; quality: number }> = {
  card: { width: 800, quality: 82 },
  logo: { width: 600, quality: 85 },
  icon: { width: 128, quality: 90 },
};

export function kindFromPath(path: string): ImageKind {
  if (/rarity/i.test(path)) return 'icon';
  if (/logo|symbol/i.test(path)) return 'logo';
  return 'card';
}

export async function optimizeImage(input: Buffer, kind: ImageKind, fallbackType: string) {
  try {
    const img = sharp(input, { limitInputPixels: 50_000_000 });
    const meta = await img.metadata();
    const p = PRESET[kind];
    const out = await img
      .resize({ width: p.width, withoutEnlargement: true })
      .webp({ quality: p.quality, alphaQuality: 100, effort: 5 })
      .toBuffer();

    if (meta.format === 'webp' && out.length >= input.length) return { bytes: input, contentType: 'image/webp' };
    return { bytes: out, contentType: 'image/webp' };
  } catch (e) {
    console.warn('[image] optimize failed, uploading original:', (e as Error).message);
    return { bytes: input, contentType: fallbackType };
  }
}