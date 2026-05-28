import type { Vibe } from '@/db/schema/peeks';

export interface CardSignal {
  type: string;
  is_taunt: boolean;
}

export function classifyCards(cards: CardSignal[]): Partial<Vibe> {
  if (cards.length === 0) return {};
  const total = cards.length;
  const tauntRatio = cards.filter((c) => c.is_taunt).length / total;
  const activityRatio = cards.filter((c) => c.type === 'activity').length / total;
  const aspirationalRatio =
    cards.filter((c) => c.type === 'aspirational').length / total;

  const patch: Partial<Vibe> = {};

  if (tauntRatio >= 0.3) {
    patch.motion = 'lively';
  } else if (activityRatio >= 0.4) {
    patch.motion = 'soft';
  } else if (aspirationalRatio >= 0.5) {
    patch.motion = 'still';
  }

  return patch;
}
