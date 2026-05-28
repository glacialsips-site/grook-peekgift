import { sql } from 'drizzle-orm';
import { text, timestamp } from 'drizzle-orm/pg-core';
import { peekV2 } from './_schema';

export const users = peekV2.table('users', {
  clerkUserId: text('clerk_user_id').primaryKey(),
  email: text('email'),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  tier: text('tier').notNull().default('authenticated'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
