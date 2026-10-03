import { supabase } from '@/src/lib/supabase';

export const CONDITIONS = [
  'Near Mint',
  'Lightly Played',
  'Moderately Played',
  'Heavily Played',
  'Damaged',
] as const;
export type Condition = (typeof CONDITIONS)[number];

export type EntryValues = {
  quantity: number;
  condition: Condition;
  variant: string;
  notes: string;
};

export type OwnershipEntry = EntryValues & { id: string; card_id: string };

const COLUMNS = 'id, card_id, variant, condition, quantity, notes';

function toError(err: { code?: string; message: string }): Error {
  if (err.code === '23505') {
    return new Error('You already have an entry with that variant and condition.');
  }
  if (err.code === '23514') return new Error('One of the values is not allowed.');
  return new Error(err.message);
}

const toEntry = (r: any): OwnershipEntry => ({ ...r, notes: r.notes ?? '' });

export async function fetchOwnedTotals(cardIds: string[]): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  for (let i = 0; i < cardIds.length; i += 100) {
    const { data, error } = await supabase
      .from('ownership_entries')
      .select('card_id, quantity')
      .in('card_id', cardIds.slice(i, i + 100));
    if (error) throw toError(error);
    for (const r of data ?? []) totals.set(r.card_id, (totals.get(r.card_id) ?? 0) + r.quantity);
  }
  return totals;
}

export async function fetchEntries(cardId: string): Promise<OwnershipEntry[]> {
  const { data, error } = await supabase
    .from('ownership_entries')
    .select(COLUMNS)
    .eq('card_id', cardId)
    .order('created_at');
  if (error) throw toError(error);
  return (data ?? []).map(toEntry);
}

export async function fetchEntry(entryId: string): Promise<OwnershipEntry> {
  const { data, error } = await supabase
    .from('ownership_entries')
    .select(COLUMNS)
    .eq('id', entryId)
    .single();
  if (error) throw toError(error);
  return toEntry(data);
}

export async function addEntry(cardId: string, v: EntryValues): Promise<void> {
  const { error } = await supabase.rpc('add_ownership_entry', {
    p_card_id: cardId,
    p_variant: v.variant,
    p_condition: v.condition,
    p_quantity: v.quantity,
    p_notes: v.notes,
  });
  if (error) throw toError(error);
}

export async function updateEntry(
  entryId: string,
  patch: Partial<EntryValues>,
): Promise<void> {
  const body: Record<string, unknown> = { ...patch };
  if (patch.notes !== undefined) body.notes = patch.notes.trim() === '' ? null : patch.notes.trim();
  const { error } = await supabase.from('ownership_entries').update(body).eq('id', entryId);
  if (error) throw toError(error);
}

export async function deleteEntry(entryId: string): Promise<void> {
  const { error } = await supabase.from('ownership_entries').delete().eq('id', entryId);
  if (error) throw toError(error);
}

export async function fetchAllOwned(): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('ownership_entries')
      .select('card_id, quantity')
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw toError(error);
    for (const r of data ?? []) totals.set(r.card_id, (totals.get(r.card_id) ?? 0) + r.quantity);
    if (!data || data.length < PAGE) break;
  }
  return totals;
}