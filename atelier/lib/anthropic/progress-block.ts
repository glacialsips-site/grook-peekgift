import 'server-only';
import { loadPeekSnapshot } from '@/lib/peek/snapshot';
import type { PeekDraft } from '@/lib/peek/types';

export function renderPeekStateJson(draft: PeekDraft): string {
  const peek = draft.peek;
  const cards = draft.cards;
  const state = {
    recipient: {
      name: peek.recipientName,
      relationship: peek.relationship,
      occasion: peek.occasion,
      giver_names: peek.giverNames,
      profile: peek.recipientProfile ?? {},
    },
    vibe: peek.vibe ?? null,
    hero_image_url: peek.heroImageUrl,
    note_md: peek.noteMd,
    cards_count: cards.length,
    cards: cards.map((c) => ({
      id: c.id,
      type: c.type,
      title: c.title,
      variant_group_id: c.variantGroupId,
      is_taunt: c.isTaunt,
      is_locked: c.isLocked,
    })),
    variant_groups: draft.variantGroups.map((g) => ({
      id: g.id,
      title: g.title,
      selection: g.selection,
    })),
    status: peek.status,
    budget_cents: peek.budgetCents,
  };
  return JSON.stringify(state, null, 2);
}

export async function loadPeekStateJson(peekId: string): Promise<string | null> {
  try {
    const draft = await loadPeekSnapshot(peekId);
    if (!draft) return null;
    return renderPeekStateJson(draft);
  } catch {
    return null;
  }
}
