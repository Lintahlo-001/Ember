import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !serviceKey) {
  throw new Error('Missing SUPABASE_URL / SUPABASE_SECRET_KEY — check server/.env');
}

const storageClient = createClient(url, serviceKey);
const BUCKET = 'catalog-fallbacks';

export async function uploadFallback(
  path: string,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<void> {
  const { error } = await storageClient.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed for ${path}: ${error.message}`);
}

export async function deleteFallback(path: string): Promise<void> {
  const { error } = await storageClient.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`Storage delete failed for ${path}: ${error.message}`);
}

export function publicUrl(path: string): string {
  const { data } = storageClient.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function rarityIconUrl(path: string): string {
  return storageClient.storage.from('rarity-icons').getPublicUrl(path).data.publicUrl;
}

export async function deleteFallbacks(paths: string[]): Promise<void> {
  const BATCH = 100;
  for (let i = 0; i < paths.length; i += BATCH) {
    const { error } = await storageClient.storage.from(BUCKET).remove(paths.slice(i, i + BATCH));
    if (error) throw new Error(`Storage batch delete failed: ${error.message}`);
  }
}

export const MIRROR_PREFIX = 'tcgdex/';