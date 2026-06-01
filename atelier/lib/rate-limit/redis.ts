import 'server-only';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { env } from '@/lib/env';

let _redis: Redis | null = null;

function redis(): Redis | null {
  if (_redis) return _redis;
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null;
  _redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
  return _redis;
}

export function getRedis(): Redis | null {
  return redis();
}

type LimiterFactory = () => Ratelimit | null;

function makeLimiter(builder: (r: Redis) => Ratelimit): LimiterFactory {
  let cached: Ratelimit | null = null;
  return () => {
    if (cached) return cached;
    const r = redis();
    if (!r) return null;
    cached = builder(r);
    return cached;
  };
}

export const limiters = {
  chatPerUser: makeLimiter(
    (r) =>
      new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(60, '1 m'),
        prefix: 'rl:chat:user',
        analytics: false,
      }),
  ),
  chatPerIp: makeLimiter(
    (r) =>
      new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(40, '1 m'),
        prefix: 'rl:chat:ip',
        analytics: false,
      }),
  ),
  chatAnon: makeLimiter(
    (r) =>
      new Ratelimit({
        redis: r,
        limiter: Ratelimit.fixedWindow(5, '1 d'),
        prefix: 'rl:chat:anon',
        analytics: false,
      }),
  ),
  uploadPerUser: makeLimiter(
    (r) =>
      new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(30, '1 h'),
        prefix: 'rl:upload',
        analytics: false,
      }),
  ),
  scrapePerUser: makeLimiter(
    (r) =>
      new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(60, '1 h'),
        prefix: 'rl:scrape',
        analytics: false,
      }),
  ),
  picksPerSession: makeLimiter(
    (r) =>
      new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(100, '1 h'),
        prefix: 'rl:pick',
        analytics: false,
      }),
  ),
  shareSendPerUser: makeLimiter(
    (r) =>
      new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(20, '1 h'),
        prefix: 'rl:share',
        analytics: false,
      }),
  ),
  checkoutPerUser: makeLimiter(
    (r) =>
      new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(10, '1 h'),
        prefix: 'rl:checkout',
        analytics: false,
      }),
  ),
};

export interface RateLimitVerdict {
  ok: boolean;
  reset?: number;
  remaining?: number;
  limit?: number;
}

export async function enforceRateLimit(
  limiter: Ratelimit | null,
  key: string,
): Promise<RateLimitVerdict> {
  if (!limiter) {
    if (env.NODE_ENV === 'production') {
      console.warn('[rate-limit] limiter unavailable, allowing', { key });
    }
    return { ok: true };
  }
  try {
    const r = await limiter.limit(key);
    return {
      ok: r.success,
      reset: r.reset,
      remaining: r.remaining,
      limit: r.limit,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[rate-limit] limiter threw, allowing', { key, message });
    return { ok: true };
  }
}

export function rateLimitResponse(verdict: RateLimitVerdict): Response {
  const retryAfterSec =
    verdict.reset != null
      ? Math.max(1, Math.ceil((verdict.reset - Date.now()) / 1000))
      : 60;
  const headers: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
    'retry-after': String(retryAfterSec),
  };
  if (verdict.limit != null) {
    headers['x-ratelimit-limit'] = String(verdict.limit);
  }
  if (verdict.remaining != null) {
    headers['x-ratelimit-remaining'] = String(verdict.remaining);
  }
  if (verdict.reset != null) {
    headers['x-ratelimit-reset'] = String(Math.ceil(verdict.reset / 1000));
  }
  return new Response(
    JSON.stringify({
      error: 'rate_limited',
      retry_after_seconds: retryAfterSec,
    }),
    { status: 429, headers },
  );
}
