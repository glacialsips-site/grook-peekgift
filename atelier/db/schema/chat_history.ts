import { sql } from 'drizzle-orm';
import { index, jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { peekV2 } from './_schema';
import { peeks } from './peeks';

export const chatMessages = peekV2.table(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    peekId: uuid('peek_id')
      .notNull()
      .references(() => peeks.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['user', 'assistant', 'tool_result'] }).notNull(),
    content: jsonb('content').$type<unknown>().notNull(),
    toolCallId: text('tool_call_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index('chat_messages_peek_id_idx').on(t.peekId),
    index('chat_messages_created_at_idx').on(t.createdAt),
  ],
);

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
