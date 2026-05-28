import { sql } from 'drizzle-orm';
import {
  bigserial,
  boolean,
  index,
  jsonb,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { peekV2 } from './_schema';

export const webhookLog = peekV2.table(
  'webhook_log',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    source: text('source').notNull(),
    payload: jsonb('payload').$type<unknown>().notNull(),
    success: boolean('success').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index('webhook_log_source_idx').on(t.source),
    index('webhook_log_received_at_idx').on(t.receivedAt),
  ],
);

export type WebhookLog = typeof webhookLog.$inferSelect;
export type NewWebhookLog = typeof webhookLog.$inferInsert;
