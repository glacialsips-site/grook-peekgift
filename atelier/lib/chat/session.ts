import 'server-only';
import { getSupabaseService } from '@/lib/supabase/service';

export const ANON_TURN_CAP = 5;

export interface RecordEventInput {
  peekId: string;
  userId: string | null;
  sessionId: string;
  kind: string;
  payload?: Record<string, unknown>;
}

export async function recordEvent(input: RecordEventInput): Promise<void> {
  try {
    const db = getSupabaseService();
    const { error } = await db.from('events').insert({
      peek_id: input.peekId,
      user_id: input.userId,
      session_id: input.sessionId,
      kind: input.kind,
      payload: input.payload ?? {},
    });
    if (error) {
      console.error('[chat/session] recordEvent failed', {
        kind: input.kind,
        peekId: input.peekId,
        error: error.message,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[chat/session] recordEvent threw', {
      kind: input.kind,
      peekId: input.peekId,
      error: message,
    });
  }
}

export type PeekAccessResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'forbidden' };

export interface PeekAccessInput {
  peekId: string;
  userId: string | null;
  sessionId: string;
}

interface PeekRow {
  curator_id: string | null;
  metadata: Record<string, unknown> | null;
}

export async function assertPeekAccess(
  opts: PeekAccessInput,
): Promise<PeekAccessResult> {
  const db = getSupabaseService();
  const { data, error } = await db
    .from('peeks')
    .select('curator_id, metadata')
    .eq('id', opts.peekId)
    .maybeSingle();

  if (error) {
    console.error('[chat/session] assertPeekAccess query failed', {
      peekId: opts.peekId,
      error: error.message,
    });
    return { ok: false, reason: 'not_found' };
  }

  if (!data) {
    return { ok: false, reason: 'not_found' };
  }

  const row = data as PeekRow;

  if (opts.userId) {
    if (row.curator_id && row.curator_id === opts.userId) {
      return { ok: true };
    }
    return { ok: false, reason: 'forbidden' };
  }

  if (row.curator_id) {
    return { ok: false, reason: 'forbidden' };
  }

  const metadata = row.metadata ?? {};
  const anonymousSessionId = metadata['anonymous_session_id'];
  if (
    typeof anonymousSessionId === 'string' &&
    anonymousSessionId === opts.sessionId
  ) {
    return { ok: true };
  }

  return { ok: false, reason: 'forbidden' };
}

export async function anonymousTurnCount(sessionId: string): Promise<number> {
  const db = getSupabaseService();
  const { count, error } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('kind', 'chat_turn')
    .is('user_id', null);
  if (error) {
    console.error('[chat/session] anonymousTurnCount failed', {
      sessionId,
      error: error.message,
    });
    return 0;
  }
  return count ?? 0;
}

export function anonymousTurnExceeded(count: number): boolean {
  return count >= ANON_TURN_CAP;
}
