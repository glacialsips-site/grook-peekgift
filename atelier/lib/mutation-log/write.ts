/**
 * Edge-safe mutation-log writer. Runs inside the dispatch wrapper on the Netlify
 * Edge chat route, so it goes through the fetch-based Supabase service-role
 * client (`lib/db-edge`) — no `node:`, no Drizzle driver. The insert is a tiny
 * single-row payload, well under the Edge burst limit.
 */
import { getSupabaseEdge } from '@/lib/db-edge/client';
import { inverseOf } from './inverse';
import { summarize } from './summary';
import {
  chipColorFor,
  subjectKindFor,
  type MutationLogEntry,
  type MutationSubject,
  type MutationVerb,
} from './types';
import { ulid } from './ulid';
import { entryToRow } from './wire';

export interface BuildMutationLogParams {
  peekId: string;
  turnId: string;
  verb: MutationVerb;
  /** card/group id; omit for singleton subjects. */
  subjectId?: string | null;
  /** card/group title at mutation time (survives later renames). */
  subjectTitleSnapshot?: string | null;
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown>;
  /** node ids the renderer should chip in the diff-mark pane. */
  changedIds?: string[];
  scrapeCostCents?: number | null;
  imageGenCostCents?: number | null;
  llmInputTokens?: number | null;
  llmOutputTokens?: number | null;
  /** test/replay override; defaults to now. */
  emittedAt?: string;
  /** test override; defaults to a fresh ulid. */
  id?: string;
}

/**
 * Assemble a complete `MutationLogEntry` from what dispatch already knows.
 * `subjectKind`, `chipColor`, `summary`, and `inverse` are all derived here so
 * the tool handlers never have to compute them. Pure aside from `ulid()` and
 * `Date.now()`.
 */
export function buildMutationLogEntry(p: BuildMutationLogParams): MutationLogEntry {
  const subjectKind = subjectKindFor(p.verb);
  const subject: MutationSubject = {
    kind: subjectKind,
    id: p.subjectId ?? null,
    titleSnapshot: p.subjectTitleSnapshot ?? null,
  };
  return {
    id: p.id ?? ulid(),
    peekId: p.peekId,
    turnId: p.turnId,
    emittedAt: p.emittedAt ?? new Date().toISOString(),
    verb: p.verb,
    subjectKind,
    subjectId: p.subjectId ?? null,
    subjectTitleSnapshot: p.subjectTitleSnapshot ?? null,
    toolInput: p.toolInput,
    toolOutput: p.toolOutput,
    changedIds: p.changedIds ?? [],
    summary: summarize(p.verb, subject, p.toolInput, p.toolOutput),
    chipColor: chipColorFor(p.verb),
    inverse: inverseOf(p.verb, p.toolInput, p.toolOutput),
    scrapeCostCents: p.scrapeCostCents ?? null,
    imageGenCostCents: p.imageGenCostCents ?? null,
    llmInputTokens: p.llmInputTokens ?? null,
    llmOutputTokens: p.llmOutputTokens ?? null,
  };
}

/** Persist one fully-formed entry. Throws on any DB error (no silent loss). */
export async function writeMutationLog(entry: MutationLogEntry): Promise<void> {
  const { error } = await getSupabaseEdge()
    .from('peek_mutation_log')
    .insert(entryToRow(entry));
  if (error) throw new Error('db_mutation_log_insert: ' + error.message);
}

/**
 * Build + persist in one call; returns the entry so the caller can also stream
 * it to the client as a diff-mark without re-reading the DB. This is the path
 * the BRIEF 04 dispatch wrapper uses on each successful tool call.
 */
export async function recordMutation(
  params: BuildMutationLogParams,
): Promise<MutationLogEntry> {
  const entry = buildMutationLogEntry(params);
  await writeMutationLog(entry);
  return entry;
}
