export * from './client';
export * from './peeks';
export * from './cards';
export * from './wire';

import { getPeekById } from './peeks';
import { getCardsForPeek } from './cards';
import { rowsToState } from './wire';
import type { SpineState } from '@/lib/spine/types';

/**
 * Load the full spine state (peek + its cards) for a peek id, or null if the
 * peek doesn't exist. Mirrors the spine route's loadState: two parallel
 * queries, mapped to the camelCase wire shape with cards sorted by position.
 */
export async function loadSpineState(peekId: string): Promise<SpineState | null> {
  const [peek, cards] = await Promise.all([
    getPeekById(peekId),
    getCardsForPeek(peekId),
  ]);
  if (!peek) return null;
  return rowsToState(peek, cards);
}
