import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { peekV2 } from './_schema';

export const curatorMemory = peekV2.table(
  'curator_memory',
  {
    clerkUserId: text('clerk_user_id').notNull(),
    path: text('path').notNull(),
    content: text('content').notNull().default(''),
    sizeBytes: integer('size_bytes').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    primaryKey({ columns: [t.clerkUserId, t.path] }),
    index('curator_memory_user_prefix_idx').on(t.clerkUserId, t.path),
    index('curator_memory_user_updated_idx').on(t.clerkUserId, t.updatedAt),
  ],
);

export type CuratorMemoryRow = typeof curatorMemory.$inferSelect;
export type NewCuratorMemoryRow = typeof curatorMemory.$inferInsert;
