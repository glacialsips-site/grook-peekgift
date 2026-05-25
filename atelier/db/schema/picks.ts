import { sql } from 'drizzle-orm';
import { index, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { peekV2 } from './_schema';
import { cards } from './cards';
import { peeks } from './peeks';

export const picks = peekV2.table(
  'picks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    peekId: uuid('peek_id')
      .notNull()
      .references(() => peeks.id, { onDelete: 'cascade' }),
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    pickedAt: timestamp('picked_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    // hashed session id or claim token
    recipientSignature: text('recipient_signature'),
    recipientNote: text('recipient_note'),
    // if locked card required a beg
    begMessage: text('beg_message'),
    begApprovedAt: timestamp('beg_approved_at', { withTimezone: true }),
    fulfilledAt: timestamp('fulfilled_at', { withTimezone: true }),
    fulfillmentNotes: text('fulfillment_notes'),
  },
  (t) => [
    index('picks_peek_id_idx').on(t.peekId),
    index('picks_card_id_idx').on(t.cardId),
  ],
);

export type Pick = typeof picks.$inferSelect;
export type NewPick = typeof picks.$inferInsert;
