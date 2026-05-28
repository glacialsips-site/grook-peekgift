import { sql } from 'drizzle-orm';
import { bigserial, index, jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { peekV2 } from './_schema';
import { peeks } from './peeks';
import { users } from './users';

export const events = peekV2.table(
  'events',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    ts: timestamp('ts', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    userId: text('user_id').references(() => users.clerkUserId),
    sessionId: text('session_id'),
    peekId: uuid('peek_id').references(() => peeks.id, { onDelete: 'set null' }),
    kind: text('kind').notNull(),
    payload: jsonb('payload')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
  },
  (t) => [
    index('events_ts_idx').on(t.ts),
    index('events_user_id_idx').on(t.userId),
    index('events_peek_id_idx').on(t.peekId),
    index('events_kind_idx').on(t.kind),
  ],
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
