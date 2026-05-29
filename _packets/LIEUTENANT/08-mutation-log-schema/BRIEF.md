# BRIEF 08 — Mutation log schema (small, foundational)

**Source of need:** curator-tools spec §6 requires a per-peek-ordered `MutationLogEntry` table with `inverse` for undo, `summary` for the depth-layer UI diff-mark pane, and observability fields (token cost, scrape cost). The existing `events` table is analytics-only; it doesn't fit. This brief installs the table cleanly so BRIEF 04 (mutation tools) and BRIEF 06 (depth-layer UI) don't need to invent it.

**Read first:**
1. `_packets/LIEUTENANT/_research/curator-tools/REPORT.md` §6 — the `MutationLogEntry` shape.
2. `atelier/db/schema/events.ts` — current analytics table (don't reuse; design parallel).
3. `atelier/db/schema/peeks.ts` — for the FK target.

## DELIVERABLES

### 1. Drizzle schema

`atelier/db/schema/peek-mutation-log.ts` defining `peekMutationLog`:

```ts
export const peekMutationLog = pgTable('peek_mutation_log', {
  id: text('id').primaryKey(),                              // ulid (sortable by time)
  peekId: uuid('peek_id').notNull().references(() => peeks.id, { onDelete: 'cascade' }),
  turnId: text('turn_id').notNull(),                        // groups mutations within a single model turn

  emittedAt: timestamp('emitted_at', { withTimezone: true }).notNull().defaultNow(),
  verb: text('verb').notNull(),                             // MutationVerb enum (text for flexibility)

  subjectKind: text('subject_kind').notNull(),              // 'page'|'card'|'group'|'vibe'|'hero'|'note'|'recipient'
  subjectId: text('subject_id'),                            // null for 'page'/'vibe'/'hero'/'note'/'recipient' singletons
  subjectTitleSnapshot: text('subject_title_snapshot'),     // for 'card'/'group' — survives subsequent renames

  toolInput: jsonb('tool_input').notNull().$type<Record<string, unknown>>(),
  toolOutput: jsonb('tool_output').notNull().$type<Record<string, unknown>>(),

  changedIds: jsonb('changed_ids').notNull().$type<string[]>().default([]),
  summary: text('summary').notNull(),                       // "Peek added 'Wool Throw' to The Drop"
  chipColor: text('chip_color'),                            // 'add'|'edit'|'remove'|'reorder'|'vibe'

  inverse: jsonb('inverse').$type<{ verb: string, input: Record<string, unknown> } | null>(),

  scrapeCostCents: integer('scrape_cost_cents'),
  imageGenCostCents: integer('image_gen_cost_cents'),
  llmInputTokens: integer('llm_input_tokens'),
  llmOutputTokens: integer('llm_output_tokens'),
}, (t) => ({
  byPeekTime: index('peek_mutation_log_peek_emitted_idx').on(t.peekId, t.emittedAt),
  byTurn: index('peek_mutation_log_turn_idx').on(t.turnId),
}));
```

### 2. Migration

`atelier/db/migrations/0015_peek_mutation_log.sql` (or 0016 if 0015 is taken by BRIEF 04 — coordinate; if conflict, this becomes 0016).

Includes the table + indices + RLS policies:
- Default-deny.
- `INSERT`/`SELECT` for service role only (mutations come from the chat route via service role).
- No curator-facing read policy — the depth-layer UI hits this through an authenticated server action that scopes by `curator_id` on the parent peek.

### 3. Helpers

`atelier/lib/mutation-log/` with:
- `write.ts` — `writeMutationLog(entry: MutationLogEntry)` — used by the dispatch wrapper from BRIEF 04.
- `read.ts` — `readMutationLogForPeek(peekId, { limit, since? })` — used by the depth-layer UI for the diff-mark mutation pane.
- `summary.ts` — `summarize(verb, subject, toolInput, toolOutput)` — generates the `summary` string per spec §6 (dispatch, not handlers). Implement summarizers for all 22 verbs.
- `inverse.ts` — `inverseOf(verb, toolInput, toolOutput)` — computes the inverse mutation (or returns null if not undoable). At least: every `add_*` ↔ `remove_*`; every `update_*` ↔ `update_*` with prior values; `set_*` ↔ `set_*` with prior values; `mark_ready_to_publish` ↔ status reset.

### 4. Tests

- Migration applies cleanly to a fresh local DB.
- `writeMutationLog` round-trips for all 22 verbs.
- `summarize` produces sensible summaries for ≥5 representative verbs.
- `inverseOf` correctly inverts every reversible verb; returns null for `payment_*`-crossing entries.
- `readMutationLogForPeek` returns ordered results.

## HARD RULES

- **Edge-safe.** Mutation log writes happen inside the dispatch wrapper called from the edge chat route. Use `lib/db-edge` (BRIEF 03) if landed; otherwise inline supabase REST.
- **Cascading delete on peek removal.** `onDelete: 'cascade'`.
- **RLS default-deny + service-role-only write.** Curator can't tamper with their own log; it's audit-grade.
- **Schema migration number** — coordinate with BRIEF 04. If both ship together, 0015 = BRIEF 04 (curator-tools schema adds), 0016 = this. If this ships first, claim 0015.
- **Branch:** `lt/mutation-log-schema` off `claude/bold-ride-Li5zK`. Push.

## VERIFICATION

- `npm --prefix atelier run typecheck` — 0 errors.
- `npm --prefix atelier run test` — pass + new tests.
- `npm --prefix atelier run build` — clean.
- Migration applied to local DB without error.

## RETURN.md

Sections: what you built; final migration number used; verification; integration notes for BRIEF 04 (writer wrapper shape) and BRIEF 06 (reader API); any subtleties on `inverse` for verbs that are sneakily not-undoable. Honesty section.

Per PROTOCOL.md: push `lt/mutation-log-schema`, write RETURN.md.
