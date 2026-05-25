import { sql } from 'drizzle-orm';
import { text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { peekV2 } from './_schema';
import { peeks } from './peeks';
import { users } from './users';

export const collaboratorRole = peekV2.enum('collaborator_role', [
  'organizer',
  'co_organizer',
  'contributor',
]);

export const peekCollaborators = peekV2.table(
  'peek_collaborators',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    peekId: uuid('peek_id')
      .notNull()
      .references(() => peeks.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.clerkUserId),
    // for pre-signup invites
    invitedEmail: text('invited_email'),
    role: collaboratorRole('role').notNull(),
    inviteToken: text('invite_token').unique(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [unique('peek_collaborators_peek_user_unique').on(t.peekId, t.userId)],
);

export type PeekCollaborator = typeof peekCollaborators.$inferSelect;
export type NewPeekCollaborator = typeof peekCollaborators.$inferInsert;
