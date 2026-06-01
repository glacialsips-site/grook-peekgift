import { logger } from '@/lib/logger';

export interface RetryOptions {
  attempts?: number;
  baseMs?: number;
  maxMs?: number;
  factor?: number;
  jitter?: boolean;
  retryOn?: (err: unknown) => boolean;
  signal?: AbortSignal;
  label: string;
}

interface ResolvedOptions extends Required<Omit<RetryOptions, 'signal'>> {
  signal?: AbortSignal;
}

const DEFAULTS: Omit<ResolvedOptions, 'label' | 'signal'> = {
  attempts: 3,
  baseMs: 250,
  maxMs: 5_000,
  factor: 2,
  jitter: true,
  retryOn: defaultRetryOn,
};

export function defaultRetryOn(err: unknown): boolean {
  if (!err) return false;
  const status = extractHttpStatus(err);
  if (status !== null) {
    if (status === 408 || status === 425 || status === 429) return true;
    if (status >= 500 && status < 600) return true;
    return false;
  }
  if (err instanceof Error) {
    const name = err.name;
    if (name === 'AbortError') return false;
    const message = err.message.toLowerCase();
    if (
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('etimedout') ||
      message.includes('socket hang up') ||
      message.includes('network') ||
      message.includes('fetch failed') ||
      message.includes('timeout')
    ) {
      return true;
    }
  }
  return false;
}

function extractHttpStatus(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null;
  const candidate = err as { status?: unknown; statusCode?: unknown };
  const raw = candidate.status ?? candidate.statusCode;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  return null;
}

function extractRetryAfterMs(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null;
  const headers = (err as { headers?: unknown }).headers;
  if (!headers || typeof headers !== 'object') return null;
  let raw: string | undefined;
  const h = headers as Record<string, unknown> & {
    get?: (k: string) => string | null;
  };
  if (typeof h.get === 'function') {
    const value = h.get('retry-after') ?? h.get('Retry-After');
    if (typeof value === 'string') raw = value;
  } else {
    const value = h['retry-after'] ?? h['Retry-After'];
    if (typeof value === 'string') raw = value;
  }
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const dateMs = Date.parse(raw);
  if (Number.isFinite(dateMs)) {
    const delta = dateMs - Date.now();
    if (delta > 0) return delta;
  }
  return null;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions,
): Promise<T> {
  const o: ResolvedOptions = { ...DEFAULTS, ...opts };
  let lastErr: unknown;
  for (let attempt = 1; attempt <= o.attempts; attempt++) {
    if (o.signal?.aborted) {
      throw new Error('aborted');
    }
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === o.attempts || !o.retryOn(err)) throw err;
      const retryAfter = extractRetryAfterMs(err);
      const backoff = Math.min(
        o.maxMs,
        o.baseMs * Math.pow(o.factor, attempt - 1),
      );
      const base = retryAfter !== null ? Math.min(retryAfter, o.maxMs) : backoff;
      const jittered = o.jitter ? base * (1 + Math.random()) : base;
      const wait = Math.round(Math.min(o.maxMs, jittered));
      logger.warn('retry', {
        label: o.label,
        attempt,
        delay_ms: wait,
        err: err instanceof Error ? err.message : String(err),
      });
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}
