// ============================================================================
// peek-render/cards.ts — Card → display model (INTERFACES §1.3 giftgrid rules)
// ----------------------------------------------------------------------------
// Centralizes: the homemade/experience/idea → product|activity|aspirational|digital
// re-map (the renderer owns this, NOT the IR — DQ-5), price text (value_display wins,
// then value_cents, hidden when reveal_value===false), taunt/locked state, and which
// cards feed the running total.
// ============================================================================

import type { Card, VariantGroup } from '@/lib/ir/contract';

export interface CardView {
  id: string;
  type: Card['type'];
  title: string;
  description: string | null;
  url: string | null;
  alt: string;
  retailer: string | null;
  /** the price string to SHOW (already respects reveal_value + value_display + cents) */
  priceText: string | null;
  /** numeric cents for subtotal math (null when not counted) */
  valueCents: number | null;
  /** true when this card has a real $ figure that counts toward the numeric total */
  countsToTotal: boolean;
  /** non-priced but pickable (homemade/experience shown as ★) → appended as " + label" */
  starLabel: string | null;
  isTaunt: boolean;
  tauntText: string | null;
  isLocked: boolean;
  lockKind: 'beg' | 'date_after' | 'event' | null;
  begPrompt: string | null;
  unlockAfter: string | null;
  proposedDate: string | null;
  locationHint: string | null;
  groupId: string | null;
  featured: boolean;
  /** colourway swatches if the card carries them (HEMLOCK pattern) */
  swatches: string[];
  raw: Card;
}

function dollars(cents: number): string {
  const n = cents / 100;
  return '$' + (Number.isInteger(n) ? String(n) : n.toFixed(2));
}

export function priceFor(card: Card): { text: string | null; counts: boolean } {
  if (card.reveal_value === false) return { text: null, counts: false };
  if (card.value_display) return { text: card.value_display, counts: false };
  if (typeof card.value_cents === 'number') return { text: dollars(card.value_cents), counts: true };
  return { text: null, counts: false };
}

export function toCardView(card: Card): CardView {
  const { text: priceText, counts } = priceFor(card);
  const ur = card.unlock_rule as Record<string, unknown>;
  const lockKind =
    card.is_locked && ur && typeof ur.kind === 'string'
      ? (ur.kind as 'beg' | 'date_after' | 'event')
      : null;

  // A non-priced but pickable item (activity/digital w/o a $ figure) shows as ★ and is
  // appended to the running total as a label (e.g. "$74 + dinner").
  const hasNumber = counts;
  const starLabel =
    !hasNumber && !card.is_taunt && (card.type === 'activity' || card.type === 'digital')
      ? deriveStarLabel(card)
      : null;

  const meta = card.metadata || {};
  const swatches = Array.isArray((meta as { swatches?: unknown }).swatches)
    ? ((meta as { swatches: unknown[] }).swatches.filter((s) => typeof s === 'string') as string[])
    : [];

  return {
    id: card.id,
    type: card.type,
    title: card.title,
    description: card.description,
    url: card.media?.url ?? null,
    alt: card.media?.alt || card.title,
    retailer: card.source_retailer,
    priceText,
    valueCents: hasNumber ? card.value_cents : null,
    countsToTotal: hasNumber,
    starLabel,
    isTaunt: !!card.is_taunt,
    tauntText: card.taunt_text,
    isLocked: !!card.is_locked,
    lockKind,
    begPrompt: typeof ur?.beg_prompt === 'string' ? (ur.beg_prompt as string) : null,
    unlockAfter: typeof ur?.unlock_after === 'string' ? (ur.unlock_after as string) : null,
    proposedDate: card.proposed_date,
    locationHint: card.location_hint,
    groupId: card.variant_group_id,
    featured: !!(meta as { hero_activity?: unknown; featured?: unknown }).hero_activity ||
      !!(meta as { featured?: unknown }).featured ||
      card.type === 'aspirational',
    swatches,
    raw: card,
  };
}

/** A short word for the non-priced star item, e.g. "dinner", "soup". Best-effort from the title. */
function deriveStarLabel(card: Card): string {
  const t = (card.title || '').toLowerCase();
  if (/dinner|steak|chophouse|meal|brunch|lunch/.test(t)) return 'dinner';
  if (/soup/.test(t)) return 'soup';
  if (/pizza/.test(t)) return 'pizza money';
  if (/lasagna|casserole/.test(t)) return 'a home-cooked meal';
  // fall back to the first meaningful word
  const w = (card.title || 'the experience').split(/\s+/)[0];
  return w.toLowerCase();
}

/** Order cards by position; group variant members under their group (preserving order). */
export function orderedCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

export function groupFor(groups: VariantGroup[], id: string | null): VariantGroup | null {
  if (!id) return null;
  return groups.find((g) => g.id === id) || null;
}

export interface TotalState {
  /** sum of counted cents across claimed cards */
  cents: number;
  /** distinct non-priced star labels claimed (deduped, order-preserving) */
  starLabels: string[];
  /** number of claimed items (incl. star items) */
  count: number;
}

/** Compute the running total from the set of claimed card ids. */
export function computeTotal(views: CardView[], claimed: Set<string>): TotalState {
  let cents = 0;
  const starLabels: string[] = [];
  let count = 0;
  for (const v of views) {
    if (!claimed.has(v.id)) continue;
    if (v.isTaunt) continue;
    count++;
    if (v.countsToTotal && typeof v.valueCents === 'number') cents += v.valueCents;
    else if (v.starLabel && !starLabels.includes(v.starLabel)) starLabels.push(v.starLabel);
  }
  return { cents, starLabels, count };
}

/** Format the bar's running-total string, e.g. "$74 + dinner" or "Pick something". */
export function formatTotal(state: TotalState, fallback: string): string {
  const parts: string[] = [];
  if (state.cents > 0) parts.push(dollars(state.cents));
  if (state.starLabels.length) parts.push(state.starLabels.join(' + '));
  if (!parts.length) return fallback;
  return parts.join(' + ');
}

export { dollars };
