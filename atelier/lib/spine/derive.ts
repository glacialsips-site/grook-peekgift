import type { Card, Peek } from '@/db/schema';
import {
  fromPeekData,
  type RenderablePage,
} from '@/components/renderer/page-state';
import type { SpineState, SpineWireCard } from './types';

function toCard(w: SpineWireCard, peekId: string): Card {
  return {
    id: w.id,
    peekId,
    variantGroupId: w.variantGroupId,
    position: w.position,
    type: w.type,
    title: w.title,
    description: w.description,
    imageUrl: w.imageUrl,
    sourceUrl: null,
    sourceRetailer: null,
    affiliateUrl: null,
    affiliateNetwork: null,
    commissionPct: null,
    valueCents: w.valueCents,
    revealValue: w.revealValue,
    isTaunt: w.isTaunt,
    tauntText: w.tauntText,
    isLocked: false,
    unlockRule: {},
    proposedDate: null,
    locationHint: null,
    addedByUserId: null,
    metadata: {},
  };
}

export function deriveSpinePage(state: SpineState): RenderablePage {
  const peek: Pick<
    Peek,
    'recipientName' | 'occasion' | 'heroImageUrl' | 'noteMd' | 'giverNames' | 'vibe'
  > = {
    recipientName: state.peek.recipientName,
    occasion: state.peek.occasion,
    heroImageUrl: state.peek.heroImageUrl,
    noteMd: state.peek.noteMd,
    giverNames: state.peek.giverNames,
    vibe: state.peek.vibe,
  };
  const cards = state.cards
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((c) => toCard(c, state.peek.id));
  return fromPeekData({ peek, cards });
}
