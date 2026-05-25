import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { peekV2 } from './_schema';
import { peeks } from './peeks';
import { users } from './users';

export const cardType = peekV2.enum('card_type', [
  'product',
  'activity',
  'aspirational',
  'digital',
]);

export const variantSelection = peekV2.enum('variant_selection', [
  'pick_one',
  'pick_any',
  'pick_all',
]);

export const variantGroups = peekV2.table('variant_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  peekId: uuid('peek_id')
    .notNull()
    .references(() => peeks.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  selection: variantSelection('selection').notNull(),
  position: integer('position').notNull().default(0),
});

export type VariantGroup = typeof variantGroups.$inferSelect;
export type NewVariantGroup = typeof variantGroups.$inferInsert;

export type UnlockRule = {
  kind: 'beg' | 'date_after' | 'event';
  beg_prompt?: string;
  unlock_after?: string;
};

export const cards = peekV2.table(
  'cards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    peekId: uuid('peek_id')
      .notNull()
      .references(() => peeks.id, { onDelete: 'cascade' }),
    variantGroupId: uuid('variant_group_id').references(
      () => variantGroups.id,
      { onDelete: 'set null' },
    ),
    position: integer('position').notNull().default(0),
    type: cardType('type').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    imageUrl: text('image_url'),
    // hidden from recipient
    sourceUrl: text('source_url'),
    // hidden from recipient
    sourceRetailer: text('source_retailer'),
    // computed at scrape time
    affiliateUrl: text('affiliate_url'),
    // 'skimlinks' | 'sovrn' | 'amazon_associates' | 'direct'
    affiliateNetwork: text('affiliate_network'),
    commissionPct: numeric('commission_pct', { precision: 5, scale: 2 }),
    valueCents: integer('value_cents'),
    revealValue: boolean('reveal_value').notNull().default(false),
    isTaunt: boolean('is_taunt').notNull().default(false),
    tauntText: text('taunt_text'),
    isLocked: boolean('is_locked').notNull().default(false),
    unlockRule: jsonb('unlock_rule')
      .$type<UnlockRule | Record<string, never>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    proposedDate: timestamp('proposed_date', { withTimezone: true }),
    locationHint: text('location_hint'),
    // which contributor added it (for group peeks)
    addedByUserId: text('added_by_user_id').references(() => users.clerkUserId),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
  },
  (t) => [
    index('cards_peek_id_idx').on(t.peekId),
    index('cards_variant_group_id_idx').on(t.variantGroupId),
  ],
);

export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
