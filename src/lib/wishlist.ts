import { supabase } from '@/src/lib/supabase';

export async function fetchWishlistIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from('wishlist_entries')
    .select('card_id')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.card_id as string);
}

export async function isWishlisted(cardId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('wishlist_entries')
    .select('card_id')
    .eq('card_id', cardId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
}

export async function addToWishlist(cardId: string): Promise<void> {
  const { error } = await supabase.from('wishlist_entries').insert({ card_id: cardId });
  if (error && error.code !== '23505') throw new Error(error.message); // already there = success
}

export async function removeFromWishlist(cardId: string): Promise<void> {
  const { error } = await supabase.from('wishlist_entries').delete().eq('card_id', cardId);
  if (error) throw new Error(error.message);
}