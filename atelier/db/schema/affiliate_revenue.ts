import { sql } from 'drizzle-orm';
import { integer, jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { peekV2 } from './_schema';
import { cards } from './cards';
import { peeks } from './peeks';
import { picks } from './picks';

// Webhook-fed from Skimlinks/Sovrn.
export const affiliateRevenue = peekV2.table('affiliate_revenue', {
  id: uuid('id').primaryKey().defaultRandom(),
  network: text('network').notNull(),
  externalTxnId: text('external_txn_id').unique(),
  cardId: uuid('card_id').references(() => cards.id),
  pickId: uuid('pick_id').references(() => picks.id),
  peekId: uuid('peek_id').references(() => peeks.id),
  reportedAt: timestamp('reported_at', { withTimezone: true }),
  amountCents: integer('amount_cents'),
  commissionCents: integer('commission_cents'),
  currency: text('currency').notNull().default('USD'),
  // 'pending' | 'confirmed' | 'reversed'
  status: text('status'),
  rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type AffiliateRevenue = typeof affiliateRevenue.$inferSelect;
export type NewAffiliateRevenue = typeof affiliateRevenue.$inferInsert;
