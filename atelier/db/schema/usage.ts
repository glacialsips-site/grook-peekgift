import { sql } from 'drizzle-orm';
import {
  bigserial,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { peekV2 } from './_schema';
import { peeks } from './peeks';
import { users } from './users';

export const usageLedger = peekV2.table(
  'usage_ledger',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    userId: text('user_id').references(() => users.clerkUserId, {
      onDelete: 'set null',
    }),
    sessionId: text('session_id'),
    peekId: uuid('peek_id').references(() => peeks.id, {
      onDelete: 'set null',
    }),
    vendor: text('vendor').notNull(),
    kind: text('kind').notNull(),
    costCents: integer('cost_cents').notNull().default(0),
    payload: jsonb('payload')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    ts: timestamp('ts', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index('usage_ledger_user_id_ts_idx').on(t.userId, t.ts),
    index('usage_ledger_session_id_ts_idx').on(t.sessionId, t.ts),
    index('usage_ledger_vendor_ts_idx').on(t.vendor, t.ts),
    index('usage_ledger_peek_id_idx').on(t.peekId),
    index('usage_ledger_peek_id_ts_idx').on(t.peekId, t.ts),
  ],
);

export type UsageLedgerRow = typeof usageLedger.$inferSelect;
export type NewUsageLedger = typeof usageLedger.$inferInsert;

export const tierConfig = peekV2.table('tier_config', {
  id: integer('id').primaryKey(),
  config: jsonb('config')
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type TierConfigRow = typeof tierConfig.$inferSelect;
export type NewTierConfig = typeof tierConfig.$inferInsert;
