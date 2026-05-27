# Packet 31 — Security hardening

- **Worker:** cc-on-web
- **Branch:** `claude/packet-31-security`
- **Depends on (sequencing):** `atelier-integration`
- **Imports from siblings:** `@/lib/env`, Upstash Redis SDKs
- **Validation:** `cd atelier && npm install && npm run build` green. Plus manual: `curl -X POST` on `/api/chat` 100 times in a second from one IP should get 429 after the configured limit.
- **Target paths:** `atelier/lib/env.ts`, `atelier/lib/security/**` (new), `atelier/lib/rate-limit/**` (new), `atelier/app/g/[slug]/page.tsx`, `atelier/app/api/pick/route.ts`, `atelier/app/api/chat/route.ts`, `atelier/app/api/upload/route.ts`, `atelier/app/api/scrape/route.ts`, `atelier/app/api/share/send/route.ts`, every webhook route, `atelier/next.config.mjs` or new `middleware.ts` style headers config (add to `proxy.ts`).

## Context

Eight security issues to close. **Orchestrator note (pre-dispatch):** issue #0 — RLS was off on all 11 `peek_v2` tables — was fixed via migration `0005_enable_rls_default_deny.sql` applied to live DB before this packet dispatched. RLS is now ON + FORCED on every table; service-role bypasses RLS so server routes keep working; anon/authenticated direct REST writes are blocked (no policies = default deny). See `_packets/ORCHESTRATOR-NOTES.md` finding 1.

This packet still needs to add per-table policies for whichever client-side reads are intended (Supabase Realtime channels, anon recipient view, etc.). Audit what currently uses the publishable-key client (`lib/supabase/browser.ts` callers) and write the minimum policies that preserve those flows; everything else stays locked down.

1. **HMAC fallback fails open.** `app/g/[slug]/page.tsx` + `app/api/pick/route.ts` sign recipient sessions as `unsigned:<sessionId>` when `GUEST_CLAIM_TOKEN_SECRET` is missing. Should require the secret and refuse to serve without it. Make `GUEST_CLAIM_TOKEN_SECRET` REQUIRED in `lib/env.ts` (not `.optional()`).
2. **No rate limiting.** Upstash Redis SDKs are in `package.json` from packet 01 but never wired. Anyone could DoS `/api/chat` and burn through Anthropic credit. Wire `@upstash/ratelimit`.
3. **Anon turn metering is bypassable.** `/api/chat` counts `events` rows by `sessionId`. Client controls `sessionId`. Tighten to IP + sessionId combo OR move to Redis-backed counter that's authoritative.
4. **No CSP headers.** Add Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
5. **No webhook idempotency keys.** Stripe, Clerk, Skimlinks each have their own retry semantics; we need an idempotency table OR Redis set keyed on the provider's event id to no-op repeat events within a TTL.
6. **Service-role over-privilege.** Some routes use service-role where the user's Clerk-JWT scoped client would do (and respect RLS). Audit + downscope where safe. With RLS now on, this is more important — RLS only matters if some routes stop using service-role.
7. **CORS / origin allowlist.** Custom API routes that aren't webhooks should reject cross-origin POSTs from non-allowed domains.
8. **Webhook secret existence is silently warned** in some places, errors-500 in others — standardize: all webhook handlers refuse to start (500) if their signing key is missing.
9. **RLS policies for client-side reads.** Audit `lib/supabase/browser.ts` callers (Realtime channels especially). Add minimal `CREATE POLICY` statements as a new migration `0006_rls_policies.sql` (Drizzle migration) for the rows that legitimately need anon/authenticated visibility. Anything not explicitly policied stays default-denied — that's correct.
10. **Schema-exposure grants are overscoped.** Migration `0002_schema_exposure.sql` granted `SELECT, INSERT, UPDATE, DELETE` on all peek_v2 tables to `anon, authenticated`. RLS gates the actual data, but defense-in-depth says revoke writes to anon and only grant the verbs each role actually needs. Include in `0006_rls_policies.sql` migration.

## Deliver

### `atelier/lib/rate-limit/redis.ts` (new)

```ts
import 'server-only';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { env } from '@/lib/env';

let _redis: Redis | null = null;
function redis(): Redis | null {
  if (_redis) return _redis;
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null;
  _redis = new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN });
  return _redis;
}

export const limiters = {
  chatPerUser: () => redis() ? new Ratelimit({ redis: redis()!, limiter: Ratelimit.slidingWindow(60, '1 m'), prefix: 'rl:chat:user' }) : null,
  chatPerIp: () => redis() ? new Ratelimit({ redis: redis()!, limiter: Ratelimit.slidingWindow(20, '1 m'), prefix: 'rl:chat:ip' }) : null,
  chatAnon: () => redis() ? new Ratelimit({ redis: redis()!, limiter: Ratelimit.fixedWindow(5, '1 d'), prefix: 'rl:chat:anon' }) : null,
  uploadPerUser: () => redis() ? new Ratelimit({ redis: redis()!, limiter: Ratelimit.slidingWindow(30, '1 h'), prefix: 'rl:upload' }) : null,
  scrapePerUser: () => redis() ? new Ratelimit({ redis: redis()!, limiter: Ratelimit.slidingWindow(60, '1 h'), prefix: 'rl:scrape' }) : null,
  picksPerSession: () => redis() ? new Ratelimit({ redis: redis()!, limiter: Ratelimit.slidingWindow(100, '1 h'), prefix: 'rl:pick' }) : null,
  shareSendPerUser: () => redis() ? new Ratelimit({ redis: redis()!, limiter: Ratelimit.slidingWindow(20, '1 h'), prefix: 'rl:share' }) : null,
};

export async function enforceRateLimit(
  limiter: Ratelimit | null,
  key: string,
): Promise<{ ok: boolean; reset?: number; remaining?: number }> {
  if (!limiter) return { ok: true };
  const r = await limiter.limit(key);
  return { ok: r.success, reset: r.reset, remaining: r.remaining };
}
```

Tune the numbers per the user's volume comfort — these defaults are conservative.

### Wire into each route

`/api/chat`:
- For signed-in: `enforceRateLimit(limiters.chatPerUser(), userId)` AND `enforceRateLimit(limiters.chatPerIp(), ip)`
- For anon: `enforceRateLimit(limiters.chatAnon(), `${ip}:${sessionId}`)`
- 429 with `Retry-After` header on rejection.

`/api/upload`: `limiters.uploadPerUser()` keyed by userId or by ip if anon.
`/api/scrape`: `limiters.scrapePerUser()`.
`/api/pick`: `limiters.picksPerSession()` keyed by recipient signature.
`/api/share/send`: `limiters.shareSendPerUser()`.

Helper `getClientIp(req)` that reads `x-forwarded-for` (Netlify sets it), falls back to `cf-connecting-ip` or `x-real-ip`, never trusts a header without one of those names.

### Anon metering tightening

`anonymousTurnCount` in `lib/chat/session.ts`: keep the DB-backed count as durable record, but **enforce** via Redis-backed counter as primary. DB count becomes audit trail. The Redis key is `${ip}:${sessionId}` — both must match to be the same anon user.

### HMAC fail-closed

`lib/env.ts`: change `GUEST_CLAIM_TOKEN_SECRET: z.string().optional()` to `z.string().min(32)`. If missing in prod, the route 500s clearly instead of falling back to unsigned. Tell the orchestrator to set the env var via Netlify MCP BEFORE this packet merges (orchestrator instruction in NOTES.md).

`app/g/[slug]/page.tsx` and `app/api/pick/route.ts`: remove the `unsigned:<sessionId>` fallback branch. If `env.GUEST_CLAIM_TOKEN_SECRET` is absent at runtime, throw 503.

### Webhook idempotency

`lib/security/idempotency.ts` (new):

```ts
import 'server-only';
import { Redis } from '@upstash/redis';
import { env } from '@/lib/env';

const TTL_SECONDS = 60 * 60 * 24; // 24 hours

export async function checkIdempotency(opts: { source: 'stripe' | 'clerk' | 'skimlinks'; eventId: string }): Promise<{ firstSeen: boolean }> {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return { firstSeen: true };
  const redis = new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN });
  const key = `idemp:${opts.source}:${opts.eventId}`;
  const set = await redis.set(key, '1', { ex: TTL_SECONDS, nx: true });
  return { firstSeen: set === 'OK' };
}
```

Use in Stripe webhook (key on `event.id`), Clerk webhook (key on svix-id header), Skimlinks (key on `transaction_id`). If not firstSeen, 200 OK noop.

### Security headers

Add a `headers()` export to `next.config.mjs` OR layer onto `proxy.ts` response:

```js
{
  source: '/(.*)',
  headers: [
    { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.peek.gift https://*.clerk.accounts.dev https://us.i.posthog.com https://us-assets.i.posthog.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' https://clerk.peek.gift https://*.clerk.accounts.dev https://api.stripe.com https://*.supabase.co wss://*.supabase.co https://us.i.posthog.com https://api.anthropic.com; frame-src https://challenges.cloudflare.com https://clerk.peek.gift https://js.stripe.com; worker-src 'self' blob:; font-src 'self' data:;" },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  ],
}
```

Tune the CSP allowlist against actual third-party origins (Clerk, Stripe, Supabase Realtime, PostHog, fal.ai for images, Browserbase/ZenRows, Skimlinks redirect domain, Resend dashboard if any client calls).

### Origin allowlist for state-changing routes

POST/PUT/DELETE routes (not webhooks, those are signature-authed) should verify `Origin` or `Referer` header matches `env.APP_URL`. Reject 403 otherwise. Webhook routes are excluded — they're signature-authed and come from trusted external systems with no Origin header.

### Service-role audit

For each route currently using `getSupabaseService()`:
- If the route already has `requireUserId()` and the write is scoped to that user's rows → consider using `createSupabaseServer()` instead so RLS is enforced.
- If the write is webhook-triggered or admin-scoped → service-role is correct, document why.

Spot-check at least: `/api/checkout`, `/api/pick`, `/api/chat`, `/api/upload`, `/api/share/send`. Note findings in NOTES.md even if you don't change all of them in this packet.

### Webhook configuration consistency

All webhook handlers (`/api/webhooks/clerk`, `/api/stripe/webhook`, `/api/webhooks/skimlinks`): if their signing secret env var is missing, 500 `webhook not configured`. Don't allow silent no-op behavior anywhere.

## Constraints

- TS strict.
- Rate-limit failure (Redis unreachable) defaults to ALLOW with a warning log — graceful degrade so a Redis blip doesn't kill the site. Document in NOTES.
- `GUEST_CLAIM_TOKEN_SECRET` is the one exception — that one fails closed.
- Do not modify `package.json` (`@upstash/redis` + `@upstash/ratelimit` already installed).
- Use subagents per concern: one for rate-limit wiring across routes, one for headers/CSP, one for webhook idempotency, one for HMAC fail-closed + env tighten.

## Reply format

Branch `claude/packet-31-security`, commit `packet 31: security hardening`, push. NOTES.md with: which env vars must be set on Netlify before merge (especially Upstash + GUEST_CLAIM_TOKEN_SECRET); rate-limit numbers chosen; service-role audit findings.
