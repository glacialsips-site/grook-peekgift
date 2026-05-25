import { sql } from 'drizzle-orm';
import { index, jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { peekV2 } from './_schema';
import { users } from './users';

export const peekStatus = peekV2.enum('peek_status', [
  'draft',
  'published',
  'claimed',
  'archived',
]);

export type Vibe = {
  tone?: string;
  palette?: string[];
  mood_words?: string[];
  motion?: string;
  font_pairing?: string;
};

export const peeks = peekV2.table(
  'peeks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    curatorId: text('curator_id')
      .notNull()
      .references(() => users.clerkUserId),
    recipientName: text('recipient_name'),
    relationship: text('relationship'),
    occasion: text('occasion'),
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
