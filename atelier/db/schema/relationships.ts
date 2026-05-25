import { sql } from 'drizzle-orm';
import { date, index, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { peekV2 } from './_schema';
import { peeks } from './peeks';
import { users } from './users';

// The relationship graph for recurring nudges.
export const relationships = peekV2.table(
  'relationships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.clerkUserId),
    recipientName: text('recipient_name').notNull(),
    // 'mom', 'girlfriend', 'best friend'
    relationship: text('relationship'),
    birthday: date('birthday'),
    anniversary: date('anniversary'),
    lastPeekId: uuid('last_peek_id').references(() => peeks.id),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index('relationships_user_id_idx').on(t.userId)],
);

export type Relationship = typeof relationships.$inferSelect;
export type NewRelationship = typeof relationships.$inferInsert;
