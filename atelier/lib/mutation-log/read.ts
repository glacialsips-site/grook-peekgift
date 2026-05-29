/**
 * Mutation-log reader for the depth-layer diff-mark pane. Returns entries in
 * chronological order (oldest → newest); ULID ids sort by emit time, so ordering
 * by `id` is identical to ordering by `emitted_at` but tie-break-free.
 *
 * SECURITY: this uses the service-role client and does NOT itself authorize the
 * caller. It must only be invoked from an authenticated server action that has
 * already confirmed the caller owns the parent peek (scope by `curator_id`).
 * There is intentionally no curator-facing RLS read policy on the table.
 */
import { getSupabaseEdge } from '@/lib/db-edge/client';
import type { MutationLogEntry } from './types';
import { rowToEntry, type MutationLogRow } from './wire';

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

export interface ReadMutationLogOptions {
  /** max rows (default 200, hard-capped at 500 to bound the payload). */
  limit?: number;
  /** ULID cursor — return only entries strictly AFTER this id (for poll/resume). */
  since?: string;
}

export async function readMutationLogForPeek(
  peekId: string,
  opts: ReadMutationLogOptions = {},
): Promise<MutationLogEntry[]> {
  const limit = Math.min(Math.max(1, opts.limit ?? DEFAULT_LIMIT), MAX_LIMIT);

  let query = getSupabaseEdge()
    .from('peek_mutation_log')
    .select('*')
    .eq('peek_id', peekId);

  if (opts.since) query = query.gt('id', opts.since);

  const { data, error } = await query.order('id', { ascending: true }).limit(limit);
  if (error) throw new Error('db_mutation_log_read: ' + error.message);

  return ((data as MutationLogRow[] | null) ?? []).map(rowToEntry);
}
