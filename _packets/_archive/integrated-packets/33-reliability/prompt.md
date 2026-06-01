# Packet 33 — Reliability (error boundaries + structured logging + retry/backoff + graceful fallbacks)

- **Worker:** cc-on-web
- **Branch:** `claude/packet-33-reliability`
- **Depends on (sequencing):** `atelier-integration`
- **Imports from siblings:** none new; touches many existing files
- **Validation:** `cd atelier && npm install && npm run build` green. Manual: hit a URL that intentionally throws (we'll seed one); confirm error boundary catches and renders our error UI instead of blank screen.
- **Target paths:** `atelier/app/error.tsx` (new), `atelier/app/global-error.tsx` (new), `atelier/app/g/[slug]/error.tsx` (new), `atelier/app/build/error.tsx` (new), `atelier/components/error-boundary.tsx` (new), `atelier/lib/logger/**` (new), `atelier/lib/retry/**` (new), every external-API call site in `lib/scrape/`, `lib/image-gen/`, `lib/affiliate/`, `lib/email/`, `lib/anthropic/observability.ts`, `lib/stripe/`, etc.

## Context

Three reliability holes:

1. **No React error boundaries.** Any uncaught exception in a render or effect = blank screen. Next.js convention is `error.tsx` per segment + `global-error.tsx` at root.
2. **`console.error` everywhere.** No structured logging. No log levels. Production logs are noise. Should standardize via a tiny logger (no big deps — wrap `console` with level + JSON + ctx).
3. **No retry/backoff on external API calls.** fal.ai polling, Browserbase / ZenRows scrape, Resend email, Twilio SMS, Skimlinks/Sovrn redirects (no — they're synchronous wraps), Stripe API calls (Stripe SDK does retry but verify), Inngest event sends, Supabase storage uploads. Any transient blip surfaces to user.

## Deliver

### `atelier/lib/logger/index.ts` (new)

Tiny pino-style structured logger that uses `console.log` under the hood (no external deps). Levels: `debug | info | warn | error`. JSON output. Adds a context object per call. Exports `logger.child({ component: '...' })` for scoped logging.

```ts
type Level = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Level[] = ['debug', 'info', 'warn', 'error'];
const MIN_LEVEL: Level = (process.env.LOG_LEVEL as Level) ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function shouldLog(level: Level): boolean {
  return ORDER.indexOf(level) >= ORDER.indexOf(MIN_LEVEL);
}

function emit(level: Level, msg: string, ctx?: Record<string, unknown>) {
  if (!shouldLog(level)) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...ctx });
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}

export interface Logger {
  debug(msg: string, ctx?: Record<string, unknown>): void;
  info(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, ctx?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

function makeLogger(bindings: Record<string, unknown> = {}): Logger {
  return {
    debug: (msg, ctx) => emit('debug', msg, { ...bindings, ...ctx }),
    info: (msg, ctx) => emit('info', msg, { ...bindings, ...ctx }),
    warn: (msg, ctx) => emit('warn', msg, { ...bindings, ...ctx }),
    error: (msg, ctx) => emit('error', msg, { ...bindings, ...ctx }),
    child: (extra) => makeLogger({ ...bindings, ...extra }),
  };
}

export const logger: Logger = makeLogger();
```

Replace ALL `console.error(...)` and most `console.log(...)` across `atelier/` with `logger.warn`/`logger.error`/`logger.info` calls including context (peekId, userId, requestId where available). Keep `console.error` ONLY at top-of-file warnings (e.g. "ANTHROPIC_API_KEY missing" at module load — those run before logger imports cleanly).

### `atelier/lib/retry/withRetry.ts` (new)

```ts
import { logger } from '@/lib/logger';

export interface RetryOptions {
  attempts?: number;       // total tries including first
  baseMs?: number;         // initial delay
  maxMs?: number;          // delay cap
  factor?: number;         // multiplier per attempt
  jitter?: boolean;        // add 0-100% random
  retryOn?: (err: unknown) => boolean;  // default: anything (returns true)
  signal?: AbortSignal;
  label: string;           // for logs
}

const DEFAULTS = { attempts: 3, baseMs: 250, maxMs: 5_000, factor: 2, jitter: true, retryOn: () => true };

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  const o = { ...DEFAULTS, ...opts };
  let lastErr: unknown;
  for (let attempt = 1; attempt <= o.attempts; attempt++) {
    if (o.signal?.aborted) throw new Error('aborted');
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === o.attempts || !o.retryOn(err)) throw err;
      const delay = Math.min(o.maxMs, o.baseMs * Math.pow(o.factor, attempt - 1));
      const jittered = o.jitter ? delay * (1 + Math.random()) : delay;
      logger.warn('retry', { label: o.label, attempt, delay: Math.round(jittered), err: String(err) });
      await new Promise((r) => setTimeout(r, jittered));
    }
  }
  throw lastErr;
}
```

### Wrap external calls in `withRetry`

- `lib/scrape/browserbase.ts` — wrap the fetch
- `lib/scrape/zenrows.ts` — wrap the fetch
- `lib/scrape/extract.ts` — wrap the Anthropic call
- `lib/image-gen/fal.ts` — wrap submit + each poll fetch (poll loop already has its own retry semantics; the wrapper is for transient 5xx on submit / final fetch)
- `lib/image-gen/rehost.ts` — wrap the fetch (download + upload)
- `lib/email/send.ts` — wrap the Resend SDK call
- `app/api/share/send/route.ts` — wrap the Twilio send if present
- `lib/inngest/client.ts` — Inngest SDK already retries; verify and document
- `lib/anthropic/observability.ts` (and any direct `anthropic.messages.*` callers) — Anthropic SDK has retry config; set to 3 attempts via constructor option in `lib/anthropic/client.ts`
- `lib/supabase/storage.ts` — wrap upload + remove + getPublicUrl

Each `withRetry` config tuned to the service: scrape/image-gen 3 attempts; email 5; storage 4.

`retryOn` filter: don't retry 4xx (client error), DO retry network errors / 5xx / 429 with proper backoff respecting `Retry-After`.

### Error boundaries

`atelier/app/global-error.tsx` (new): Next.js requires this to be a Client Component that wraps `<html><body>...</body></html>`. Renders a "Something went wrong" page with a `<button onClick={reset}>` retry and a "Back to home" link. Pull in the logger to log the error. No CSS framework deps (it runs even when global CSS fails).

`atelier/app/error.tsx` (new — segment-level): renders inside the layout. "Something broke" + retry + tiny stack trace in dev mode only.

`atelier/app/g/[slug]/error.tsx` (new): "We couldn't open this Peek" tailored copy + "go home" link.

`atelier/app/build/error.tsx` (new): "Build session hiccup" tailored copy + retry button.

`atelier/components/error-boundary.tsx` (new): a generic `<ErrorBoundary fallback={...}>` Class component for wrapping any client island that's prone to errors (chat pane during streaming, preview pane during realtime). Use it around `<ChatPane>` and `<PreviewPane>` in `<BuildSurface>`. Renders fallback UI inline (not page-killing).

### Catch swallows audit

Grep for `catch {` (empty catch) and `catch (e) {` blocks across `atelier/`. Each one either:
- Logs at warn or error level with context (preferred); or
- Is documented in `_packets/COMMENTS.md` with WHY the swallow is intentional (only acceptable for `try/finally` cleanup, fire-and-forget telemetry).

### Graceful fallbacks

- Chat API: if Anthropic returns 5xx after retries, emit a `{kind: 'error'}` SSE event with friendly message ("we're having trouble connecting to the AI; try again in a moment") AND a `Retry-After: 30` header. Don't 500.
- Scrape: if all providers fail, return `{ ok: false, error: 'scrape_unavailable' }` with friendly message. Card already placeholder; UI surfaces a "couldn't pull this product, want to add details manually?" path (UI side already handles this if 14's `aspirational-card` has the right state — verify).
- Image gen: if fal.ai is down, return `{ ok: false, error: 'image_gen_unavailable' }`; chat tool falls through to "use a stock image or describe what you want, I'll grab one" prompt.
- Realtime: client subscribes with reconnect-with-backoff (Supabase Realtime client already does this; verify and tune).

## Constraints

- TS strict.
- All `withRetry` wrappers add ≤200ms median overhead in happy path.
- Logger has zero runtime config besides `LOG_LEVEL` env var (default `info` in prod).
- Error boundaries do NOT swallow errors silently — they log + show fallback. Sentry hook in packet 34 will pick up reported errors.
- Don't modify `package.json` (no new deps).
- Use subagents: one for retry wrappers across services, one for error boundaries, one for logger refactor (the biggest grep job).

## Reply format

Branch `claude/packet-33-reliability`, commit `packet 33: reliability — boundaries + logger + retry`, push. NOTES.md with: count of `console.error` calls migrated, count of external calls wrapped, count of empty catches re-justified.
