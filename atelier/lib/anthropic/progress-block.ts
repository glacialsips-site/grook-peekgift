import 'server-only';
import { loadPeekSnapshot } from '@/lib/peek/snapshot';
import type { PeekDraft } from '@/lib/peek/types';

const TARGET_CARD_LOW = 4;
const TARGET_CARD_HIGH = 8;

function formatBudget(cents: number | null): string {
  if (cents == null) return 'untracked';
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: dollars % 1 === 0 ? 0 : 2,
  }).format(dollars);
}

function check(present: boolean): string {
  return present ? 'yes' : 'no';
}

export function renderProgressBlock(draft: PeekDraft): string {
  const peek = draft.peek;
  const cards = draft.cards;

  const recipientParts: string[] = [];
  if (peek.recipientName) recipientParts.push(peek.recipientName);
  if (peek.occasion) recipientParts.push(peek.occasion);
  if (peek.giverNames.length > 0) {
    recipientParts.push(`from ${peek.giverNames.join(', ')}`);
  }
  const recipientStr =
    recipientParts.length > 0 ? recipientParts.join(' / ') : '(unset)';

  const vibe = peek.vibe ?? {};
  const vibeBits: string[] = [];
  if (vibe.preset) vibeBits.push(vibe.preset);
  if (vibe.mood) vibeBits.push(vibe.mood);
  const vibeStr = vibeBits.length > 0 ? vibeBits.join(', ') : '(unset)';

  const cardCount = cards.length;
  const cardsLine =
    cardCount === 0
      ? `0 / suggested ${TARGET_CARD_LOW}-${TARGET_CARD_HIGH}`
      : `${cardCount} / suggested ${TARGET_CARD_LOW}-${TARGET_CARD_HIGH}`;

  const profile = peek.recipientProfile ?? {};
  const profileBits: string[] = [];
  if (profile.favorite_things && profile.favorite_things.length > 0) {
    profileBits.push(`favorite_things: ${profile.favorite_things.join(', ')}`);
  }
  if (profile.current_obsessions && profile.current_obsessions.length > 0) {
    profileBits.push(
      `current_obsessions: ${profile.current_obsessions.join(', ')}`,
    );
  }
  if (profile.allergies_or_no_gos && profile.allergies_or_no_gos.length > 0) {
    profileBits.push(
      `allergies_or_no_gos: ${profile.allergies_or_no_gos.join(', ')}`,
    );
  }
  if (profile.sizes && Object.keys(profile.sizes).length > 0) {
    const entries = Object.entries(profile.sizes)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    profileBits.push(`sizes: ${entries}`);
  }
  if (profile.notes && profile.notes.trim().length > 0) {
    profileBits.push(`notes: ${profile.notes.trim()}`);
  }
  const profileBlock =
    profileBits.length > 0
      ? `\n  recipient profile:\n    ${profileBits.join('\n    ')}`
      : '\n  recipient profile: (empty)';

  return [
    'Peek state:',
    `  recipient: ${check(!!peek.recipientName)} (${recipientStr})`,
    `  vibe: ${check(!!(vibe.preset || vibe.mood))} (${vibeStr})`,
    `  cover photo: ${check(!!peek.heroImageUrl)}`,
    `  note: ${check(!!peek.noteMd)}`,
    `  cards: ${cardsLine}`,
    `  budget: ${formatBudget(peek.budgetCents)}`,
    profileBlock.replace(/^\n/, ''),
  ].join('\n');
}

export async function loadProgressBlock(peekId: string): Promise<string | null> {
  try {
    const draft = await loadPeekSnapshot(peekId);
    if (!draft) return null;
    return renderProgressBlock(draft);
  } catch {
    return null;
  }
}
