import { supabase } from '@/src/lib/supabase';

export async function fetchFavoriteSetIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from('favorite_sets').select('set_id');
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.set_id as string));
}

export async function isFavoriteSet(setId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('favorite_sets')
    .select('set_id')
    .eq('set_id', setId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
}

export async function addFavoriteSet(setId: string): Promise<void> {
  const { error } = await supabase.from('favorite_sets').insert({ set_id: setId });
  if (error && error.code !== '23505') throw new Error(error.message);
}

export async function removeFavoriteSet(setId: string): Promise<void> {
  const { error } = await supabase.from('favorite_sets').delete().eq('set_id', setId);
  if (error) throw new Error(error.message);
}