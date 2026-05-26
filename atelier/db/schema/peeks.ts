import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { peekV2 } from './_schema';
import { users } from './users';

export const peekStatus = peekV2.enum('peek_status', [
  'draft',
  'published',
  'claimed',
  'archived',
]);

export type VibeSignalSource =
  | 'curator'
  | 'hero_palette'
  | 'tone_classifier'
  | 'card_mix';

export type VibePalette = {
  bg: string;
  surface: string;
  ink: string;
  accent: string;
  accent2?: string;
};

export type VibeMotion = 'still' | 'soft' | 'lively';

export type VibePreset = 'playful' | 'romantic' | 'dry' | 'unhinged' | 'tender';

export type VibeFontPairing = { display: string; body: string };

export type VibeHeadingFont =
  | 'serif'
  | 'display'
  | 'sans'
  | 'mono'
  | 'script';
export type VibeBodyFont = 'sans' | 'serif' | 'mono';
export type VibeTypography = {
  heading: VibeHeadingFont;
  body: VibeBodyFont;
};
export type VibeDensity = 'compact' | 'cozy' | 'breathable';
export type VibeShape = 'sharp' | 'soft' | 'pillowy';
export type VibeMood = 'minimal' | 'rich' | 'whimsical' | 'editorial';

export type VoiceWarmth = 'restrained' | 'measured' | 'warm' | 'effusive';
export type VoiceHumor = 'none' | 'gentle' | 'dry' | 'sharp';
export type VoicePace = 'considered' | 'natural' | 'quick';
export type VoiceFormality = 'casual' | 'neutral' | 'formal';
export type VoiceEmoji = 'none' | 'rare' | 'occasional' | 'playful';
export type VoiceVocabulary = 'slangy' | 'neutral' | 'elevated';
export type VoiceLength = 'punchy' | 'natural' | 'fuller';

export type VibeVoice = {
  warmth?: VoiceWarmth;
  humor?: VoiceHumor;
  pace?: VoicePace;
  formality?: VoiceFormality;
  emoji?: VoiceEmoji;
  vocabulary?: VoiceVocabulary;
  length?: VoiceLength;
};

export type VibeCore = {
  preset?: VibePreset;
  tone?: string;
  palette?: VibePalette;
  mood_words?: string[];
  motion?: VibeMotion;
  font_pairing?: VibeFontPairing;
  typography?: VibeTypography;
  density?: VibeDensity;
  shape?: VibeShape;
  mood?: VibeMood;
  voice?: VibeVoice;
};

export type VibeSignalSourceEntry = {
  source: VibeSignalSource;
  ts: string;
  patch: Partial<VibeCore>;
};

export type Vibe = VibeCore & {
  signal_source_history?: VibeSignalSourceEntry[];
};

export type RecipientProfile = {
  favorite_things?: string[];
  current_obsessions?: string[];
  allergies_or_no_gos?: string[];
  sizes?: Record<string, string>;
  notes?: string;
};

export const peeks = peekV2.table(
  'peeks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    curatorId: text('curator_id').references(() => users.clerkUserId),
    recipientName: text('recipient_name'),
    relationship: text('relationship'),
    occasion: text('occasion'),
    giverNames: text('giver_names')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    budgetCents: integer('budget_cents'),
    recipientProfile: jsonb('recipient_profile')
      .$type<RecipientProfile>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    vibe: jsonb('vibe').$type<Vibe>().notNull().default(sql`'{}'::jsonb`),
    heroImageUrl: text('hero_image_url'),
    // 'user_upload' | 'unsplash' | 'ai_generated' | 'external'
    heroImageSource: text('hero_image_source'),
    heroPrompt: text('hero_prompt'),
    noteMd: text('note_md'),
    status: peekStatus('status').notNull().default('draft'),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    stripeCheckoutSessionId: text('stripe_checkout_session_id'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    shareUrl: text('share_url'),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index('peeks_curator_id_idx').on(t.curatorId),
    index('peeks_slug_idx').on(t.slug),
    index('peeks_status_idx').on(t.status),
  ],
);

export type Peek = typeof peeks.$inferSelect;
export type NewPeek = typeof peeks.$inferInsert;
