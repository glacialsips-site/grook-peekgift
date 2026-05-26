import 'server-only';
import { getSupabaseService } from '@/lib/supabase/service';
import { getRedis } from '@/lib/rate-limit/redis';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'chat/session' });

export const ANON_TURN_CAP = 5;
const ANON_TTL_SECONDS = 60 * 60 * 24;

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
      log.error('recordEvent failed', {
        kind: input.kind,
        peekId: input.peekId,
        error: error.message,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('recordEvent threw', {
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
    log.error('assertPeekAccess query failed', {
      peekId: opts.peekId,
      error: error.message,
    });
    return { ok: false, reason: 'not_found' };
  }

  if (!data) {
    return { ok: false, reason: 'not_found' };
  }

  if (opts.userId) {
    if (data.curator_id && data.curator_id === opts.userId) {
      return { ok: true };
    }
    return { ok: false, reason: 'forbidden' };
  }

  if (data.curator_id) {
    return { ok: false, reason: 'forbidden' };
  }

  const metadata = data.metadata ?? {};
  const anonymousSessionId = metadata['anonymous_session_id'];
  if (
    typeof anonymousSessionId === 'string' &&
    anonymousSessionId === opts.sessionId
  ) {
    return { ok: true };
  }

  return { ok: false, reason: 'forbidden' };
}

async function dbAnonCount(sessionId: string): Promise<number> {
  const db = getSupabaseService();
  const { count, error } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('kind', 'chat_turn')
    .is('user_id', null);
  if (error) {
    log.error('dbAnonCount failed', {
      sessionId,
      error: error.message,
    });
    return 0;
  }
  return count ?? 0;
}

function anonKey(ip: string, sessionId: string): string {
  return `anon:turn:${ip}:${sessionId}`;
}

export async function anonymousTurnCount(
  sessionId: string,
  ip?: string,
): Promise<number> {
  if (ip) {
    const redis = getRedis();
    if (redis) {
      try {
        const raw = await redis.get<number | string>(anonKey(ip, sessionId));
        if (raw != null) {
          const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10);
          if (Number.isFinite(n)) return n;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.warn('redis anonCount read failed', {
          sessionId,
          message,
        });
      }
    }
  }
  return dbAnonCount(sessionId);
}

export async function incrementAnonymousTurn(
  sessionId: string,
  ip: string,
): Promise<number> {
  const redis = getRedis();
  if (!redis) return dbAnonCount(sessionId);
  try {
    const key = anonKey(ip, sessionId);
    const next = await redis.incr(key);
    if (next === 1) {
      await redis.expire(key, ANON_TTL_SECONDS);
    }
    return next;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn('redis incr failed, falling back to DB', {
      sessionId,
      message,
    });
    return dbAnonCount(sessionId);
  }
}

export function anonymousTurnExceeded(count: number): boolean {
  return count >= ANON_TURN_CAP;
}
