/**
 * Pure snake_case ↔ camelCase mappers for the mutation log. Kept separate from
 * `write.ts`/`read.ts` (which touch the Supabase client) so the row shape can be
 * unit-tested for every verb with zero DB. The Supabase edge client is scoped to
 * the `peek_v2` schema, so these rows are exactly what `.insert()` takes and
 * `.select()` returns.
 */
import type {
  ChipColor,
  MutationInverse,
  MutationLogEntry,
  MutationVerb,
  SubjectKind,
} from './types';

export interface MutationLogRow {
  id: string;
  peek_id: string;
  turn_id: string;
  emitted_at: string;
  verb: string;
  subject_kind: string;
  subject_id: string | null;
  subject_title_snapshot: string | null;
  tool_input: Record<string, unknown>;
  tool_output: Record<string, unknown>;
  changed_ids: string[];
  summary: string;
  chip_color: string | null;
  inverse: MutationInverse | null;
  scrape_cost_cents: number | null;
  image_gen_cost_cents: number | null;
  llm_input_tokens: number | null;
  llm_output_tokens: number | null;
}

export function entryToRow(entry: MutationLogEntry): MutationLogRow {
  return {
    id: entry.id,
    peek_id: entry.peekId,
    turn_id: entry.turnId,
    emitted_at: entry.emittedAt,
    verb: entry.verb,
    subject_kind: entry.subjectKind,
    subject_id: entry.subjectId,
    subject_title_snapshot: entry.subjectTitleSnapshot,
    tool_input: entry.toolInput,
    tool_output: entry.toolOutput,
    changed_ids: entry.changedIds,
    summary: entry.summary,
    chip_color: entry.chipColor,
    inverse: entry.inverse,
    scrape_cost_cents: entry.scrapeCostCents,
    image_gen_cost_cents: entry.imageGenCostCents,
    llm_input_tokens: entry.llmInputTokens,
    llm_output_tokens: entry.llmOutputTokens,
  };
}

export function rowToEntry(row: MutationLogRow): MutationLogEntry {
  return {
    id: row.id,
    peekId: row.peek_id,
    turnId: row.turn_id,
    emittedAt: row.emitted_at,
    verb: row.verb as MutationVerb,
    subjectKind: row.subject_kind as SubjectKind,
    subjectId: row.subject_id ?? null,
    subjectTitleSnapshot: row.subject_title_snapshot ?? null,
    toolInput: row.tool_input ?? {},
    toolOutput: row.tool_output ?? {},
    changedIds: row.changed_ids ?? [],
    summary: row.summary,
    chipColor: (row.chip_color as ChipColor | null) ?? null,
    inverse: row.inverse ?? null,
    scrapeCostCents: row.scrape_cost_cents ?? null,
    imageGenCostCents: row.image_gen_cost_cents ?? null,
    llmInputTokens: row.llm_input_tokens ?? null,
    llmOutputTokens: row.llm_output_tokens ?? null,
  };
}
