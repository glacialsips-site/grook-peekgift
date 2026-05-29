import { getSupabaseEdge } from './client';
import { CARD_COLUMNS, type SpineCardRow } from './wire';

/**
 * Load every card row for a peek (unsorted). Throws on any DB error.
 * Sorting by position happens in `rowsToState`.
 */
export async function getCardsForPeek(peekId: string): Promise<SpineCardRow[]> {
  const { data, error } = await getSupabaseEdge()
    .from('cards')
    .select(CARD_COLUMNS)
    .eq('peek_id', peekId);
  if (error) throw new Error('db_cards_get: ' + error.message);
  return (data as SpineCardRow[] | null) ?? [];
}

/**
 * Insert one card row. `row` is snake_case column → value (must include
 * `peek_id`). Throws on any DB error.
 */
export async function insertCard(row: Record<string, unknown>): Promise<void> {
  const { error } = await getSupabaseEdge().from('cards').insert(row);
  if (error) throw new Error('db_cards_insert: ' + error.message);
}

/**
 * Patch a card. Scoped by BOTH id AND peek_id so a card can only ever be
 * mutated within its own peek (security parity with the route's remove_card).
 * Throws on any DB error.
 */
export async function updateCard(
  id: string,
  peekId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await getSupabaseEdge()
    .from('cards')
    .update(patch)
    .eq('id', id)
    .eq('peek_id', peekId);
  if (error) throw new Error('db_cards_update: ' + error.message);
}

/**
 * Delete a card. Scoped by BOTH id AND peek_id (same security parity as
 * updateCard). Throws on any DB error.
 */
export async function deleteCard(id: string, peekId: string): Promise<void> {
  const { error } = await getSupabaseEdge()
    .from('cards')
    .delete()
    .eq('id', id)
    .eq('peek_id', peekId);
  if (error) throw new Error('db_cards_delete: ' + error.message);
}
