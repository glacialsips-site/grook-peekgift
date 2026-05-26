import 'server-only';
import { getRedis } from '@/lib/rate-limit/redis';

const TTL_SECONDS = 60 * 60 * 24;

export interface IdempotencyResult {
  firstSeen: boolean;
}

export async function checkIdempotency(opts: {
  source: 'stripe' | 'clerk' | 'skimlinks';
  eventId: string;
  ttlSeconds?: number;
}): Promise<IdempotencyResult> {
  const redis = getRedis();
  if (!redis) return { firstSeen: true };
  const key = `idemp:${opts.source}:${opts.eventId}`;
  try {
    const ttl = opts.ttlSeconds ?? TTL_SECONDS;
    const result = await redis.set(key, '1', { ex: ttl, nx: true });
    return { firstSeen: result === 'OK' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[idempotency] redis threw, allowing event', {
      source: opts.source,
      eventId: opts.eventId,
      message,
    });
    return { firstSeen: true };
  }
}
