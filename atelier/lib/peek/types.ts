import type {
  RecipientProfile,
  Vibe,
  VibeBodyFont,
  VibeCore,
  VibeDensity,
  VibeFontPairing,
  VibeHeadingFont,
  VibeMood,
  VibeMotion,
  VibePalette,
  VibePreset,
  VibeShape,
  VibeSignalSource,
  VibeSignalSourceEntry,
  VibeTypography,
  VibeVoice,
  VoiceEmoji,
  VoiceFormality,
  VoiceHumor,
  VoiceLength,
  VoicePace,
  VoiceVocabulary,
  VoiceWarmth,
} from '@/db/schema/peeks';
import type {
  UnlockRule as SchemaUnlockRule,
  UnlockRuleBeg as SchemaUnlockRuleBeg,
  UnlockRuleDateAfter as SchemaUnlockRuleDateAfter,
  UnlockRuleEvent as SchemaUnlockRuleEvent,
  UnlockRuleRequiresPicks as SchemaUnlockRuleRequiresPicks,
  UnlockRuleKind as SchemaUnlockRuleKind,
} from '@/db/schema/cards';

export type {
  RecipientProfile,
  Vibe,
  VibeBodyFont,
  VibeCore,
  VibeDensity,
  VibeFontPairing,
  VibeHeadingFont,
  VibeMood,
  VibeMotion,
  VibePalette,
  VibePreset,
  VibeShape,
  VibeSignalSource,
  VibeSignalSourceEntry,
  VibeTypography,
  VibeVoice,
  VoiceEmoji,
  VoiceFormality,
  VoiceHumor,
  VoiceLength,
  VoicePace,
  VoiceVocabulary,
  VoiceWarmth,
};

export type PeekStatus =
  | 'draft'
  | 'ready_for_publish'
  | 'published'
  | 'claimed'
  | 'archived';

export type Peek = {
  id: string;
  slug: string;
  curatorId: string | null;
  recipientName: string | null;
  relationship: string | null;
  occasion: string | null;
  giverNames: string[];
  budgetCents: number | null;
  recipientProfile: RecipientProfile;
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

export type UnlockRuleKind = SchemaUnlockRuleKind;

export type UnlockRule = {
  kind?: UnlockRuleKind;
  beg_prompt?: string;
  unlock_after?: string;
  card_ids?: string[];
};

export type SchemaUnlockRules =
  | SchemaUnlockRuleBeg
  | SchemaUnlockRuleDateAfter
  | SchemaUnlockRuleEvent
  | SchemaUnlockRuleRequiresPicks
  | SchemaUnlockRule;

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

export {
  DEFAULT_VIBE,
  applyDefaultVibe,
  isDefaultVibe,
  makeVibe,
} from '@/lib/vibe/defaults';

export type ChatMessageImage = {
  url: string;
  contentType?: string;
  alt?: string;
};

export type ChatMessage =
  | {
      id: string;
      role: 'user';
      content: string;
      images?: ChatMessageImage[];
    }
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
