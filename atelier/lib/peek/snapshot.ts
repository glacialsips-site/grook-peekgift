import 'server-only';
import { getSupabaseService } from '@/lib/supabase/service';
import { rowToCard, rowToPeek, rowToVariantGroup } from './from-rows';
import type { PeekDraft } from './types';

export async function loadPeekSnapshot(peekId: string): Promise<PeekDraft | null> {
  const sb = getSupabaseService();

  const [peekRes, cardsRes, groupsRes] = await Promise.all([
    sb.from('peeks').select('*').eq('id', peekId).maybeSingle(),
    sb.from('cards').select('*').eq('peek_id', peekId).order('position'),
    sb.from('variant_groups').select('*').eq('peek_id', peekId).order('position'),
  ]);

  if (peekRes.error) throw new Error(`Failed to load peek: ${peekRes.error.message}`);
  if (!peekRes.data) return null;
  if (cardsRes.error) throw new Error(`Failed to load cards: ${cardsRes.error.message}`);
  if (groupsRes.error) {
    throw new Error(`Failed to load variant groups: ${groupsRes.error.message}`);
  }

  return {
    peek: rowToPeek(peekRes.data),
    cards: (cardsRes.data ?? [])
      .map(rowToCard)
      .sort((a, b) => a.position - b.position),
    variantGroups: (groupsRes.data ?? [])
      .map(rowToVariantGroup)
      .sort((a, b) => a.position - b.position),
  };
}
