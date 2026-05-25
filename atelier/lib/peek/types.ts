export type VibePalette = {
  bg: string;
  surface: string;
  ink: string;
  accent: string;
  accent2?: string;
};

export type VibeMotion = 'still' | 'soft' | 'lively';

export type VibeFontPairing = {
  display: string;
  body: string;
};

export type Vibe = {
  tone?: string;
  palette?: VibePalette;
  mood_words?: string[];
  motion?: VibeMotion;
  font_pairing?: VibeFontPairing;
};

export type PeekStatus = 'draft' | 'published' | 'claimed' | 'archived';

export type Peek = {
  id: string;
  slug: string;
  curatorId: string | null;
  recipientName: string | null;
  relationship: string | null;
  occasion: string | null;
  vibe: Vibe;
  heroImageUrl: string | null;
  heroImageSource: string | null;
  heroPrompt: string | null;
  noteMd: string | null;
  status: PeekStatus;
  metadata: Record<string, unknown>;
  updatedAt: string;
};

export type VariantSelection = 'pick_one' | 'pick_any' | 'pick_all';

export type VariantGroup = {
  id: string;
  peekId: string;
  title: string;
  selection: VariantSelection;
  position: number;
};

export type CardType = 'product' | 'activity' | 'aspirational' | 'digital';

export type UnlockRule = {
  kind?: 'beg' | 'date_after' | 'event';
  beg_prompt?: string;
  unlock_after?: string;
};

export type Card = {
  id: string;
  peekId: string;
  variantGroupId: string | null;
  position: number;
  type: CardType;
  title: string;
  description: string | null;
  imageUrl: string | null;
  valueCents: number | null;
  revealValue: boolean;
  isTaunt: boolean;
  tauntText: string | null;
  isLocked: boolean;
  unlockRule: UnlockRule;
  proposedDate: string | null;
  locationHint: string | null;
  addedByUserId: string | null;
};

export type PeekDraft = {
  peek: Peek;
  cards: Card[];
  variantGroups: VariantGroup[];
};

export const DEFAULT_VIBE: Vibe = {
  tone: 'warm',
  motion: 'soft',
};

export type ChatMessage =
  | { id: string; role: 'user'; content: string }
  | {
      id: string;
      role: 'assistant';
      content: string;
      toolCalls: ToolCallEvent[];
      streaming: boolean;
    };

export type ToolCallEvent = {
  id: string;
  name: string;
  status: 'pending' | 'done' | 'error';
};

export { type SseEvent } from '@/lib/chat/sse-types';
