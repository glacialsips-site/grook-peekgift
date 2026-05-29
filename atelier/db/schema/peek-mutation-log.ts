import { sql } from 'drizzle-orm';
import { index, integer, jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { peekV2 } from './_schema';
import { peeks } from './peeks';
import type {
  ChipColor,
  MutationInverse,
  MutationVerb,
  SubjectKind,
} from '@/lib/mutation-log/types';

// Per-peek, time-ordered audit log of every successful page-state mutation.
// Distinct from `events` (analytics breadcrumbs): this is ordered per peek,
// carries `inverse` for UI-level undo, `summary`/`chipColor` for the depth-layer
// diff-mark pane, and per-mutation cost observability. Append-only, audit-grade.
export const peekMutationLog = peekV2.table(
  'peek_mutation_log',
  {
    // ulid — lexicographically sortable by emit time; generated edge-side.
    id: text('id').primaryKey(),
    peekId: uuid('peek_id')
      .notNull()
      .references(() => peeks.id, { onDelete: 'cascade' }),
    // groups every mutation emitted within one model turn.
    turnId: text('turn_id').notNull(),

    emittedAt: timestamp('emitted_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    verb: text('verb').$type<MutationVerb>().notNull(),

    subjectKind: text('subject_kind').$type<SubjectKind>().notNull(),
    // null for page/vibe/hero/note/recipient singletons.
    subjectId: text('subject_id'),
    // card/group title at mutation time; survives later renames.
    subjectTitleSnapshot: text('subject_title_snapshot'),

    toolInput: jsonb('tool_input').$type<Record<string, unknown>>().notNull(),
    toolOutput: jsonb('tool_output').$type<Record<string, unknown>>().notNull(),

    changedIds: jsonb('changed_ids')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    summary: text('summary').notNull(),
    chipColor: text('chip_color').$type<ChipColor>(),

    inverse: jsonb('inverse').$type<MutationInverse | null>(),

    scrapeCostCents: integer('scrape_cost_cents'),
    imageGenCostCents: integer('image_gen_cost_cents'),
    llmInputTokens: integer('llm_input_tokens'),
    llmOutputTokens: integer('llm_output_tokens'),
  },
  (t) => [
    index('peek_mutation_log_peek_emitted_idx').on(t.peekId, t.emittedAt),
    index('peek_mutation_log_turn_idx').on(t.turnId),
  ],
);

export type PeekMutationLog = typeof peekMutationLog.$inferSelect;
export type NewPeekMutationLog = typeof peekMutationLog.$inferInsert;
