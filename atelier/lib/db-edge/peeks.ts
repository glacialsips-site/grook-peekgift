import { getSupabaseEdge } from './client';
import { PEEK_COLUMNS, type SpinePeekRow } from './wire';

/**
 * Load a single peek row by id, or null if it doesn't exist.
 * Throws on any DB error (no silent failures).
 */
export async function getPeekById(id: string): Promise<SpinePeekRow | null> {
  const { data, error } = await getSupabaseEdge()
    .from('peeks')
    .select(PEEK_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('db_peeks_get: ' + error.message);
  return (data as SpinePeekRow | null) ?? null;
}

/**
 * Patch a peek row in place. `patch` is snake_case column → value.
 * Throws on any DB error.
 */
export async function updatePeek(
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await getSupabaseEdge().from('peeks').update(patch).eq('id', id);
  if (error) throw new Error('db_peeks_update: ' + error.message);
}
