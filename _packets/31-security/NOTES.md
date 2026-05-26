# Packet 31 — security hardening (notes)

Branch `claude/packet-31-security`. Build green (`APP_URL=http://localhost:3000 npm run build`).

## Env vars that MUST be on Netlify before merge

| Var | Required for | Behaviour if missing |
|---|---|---|
| `GUEST_CLAIM_TOKEN_SECRET` (>=32 chars) | recipient HMAC | `app/g/[slug]` throws 503; `/api/pick` returns 503 |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | rate limit, webhook idempotency, anon Redis counter | rate limit defaults ALLOW with warn; idempotency defaults firstSeen=true (no de-dup); anon falls back to DB count |
| `APP_URL` | origin allowlist | build fails (already required) |

`GUEST_CLAIM_TOKEN_SECRET` zod was kept `.optional().min(32)` rather than required-in-production because `next build` evaluates env at module-load and there's no prod-build-time secret. Fail-closed is now enforced at `signRecipient()` callsites: `lib/security/recipient.ts` throws `GuestSecretMissingError`, and `app/g/[slug]/page.tsx` + `app/api/pick/route.ts` catch it and respond 503. The previous `unsigned:${sessionId}` fallback is GONE.

## Rate-limit numbers (in `lib/rate-limit/redis.ts`)

| Limiter | Window | Limit | Key | Limit type |
|---|---|---|---|---|
| `chatPerUser` | 1 min | 60 | userId | sliding |
| `chatPerIp` | 1 min | 40 | ip | sliding |
| `chatAnon` | 1 day | 5 | `ip:sessionId` | fixed |
| `uploadPerUser` | 1 h | 30 | userId or `ip:sessionId` | sliding |
| `scrapePerUser` | 1 h | 60 | userId | sliding |
| `picksPerSession` | 1 h | 100 | recipient signature | sliding |
| `shareSendPerUser` | 1 h | 20 | userId | sliding |
| `checkoutPerUser` | 1 h | 10 | userId | sliding |

All limiters fail-open if Redis is unreachable, with a warn log. The one exception — `GUEST_CLAIM_TOKEN_SECRET` — fails closed.

## Anon turn metering tightening

Primary counter is now Redis-backed via `incrementAnonymousTurn(sessionId, ip)` (key `anon:turn:{ip}:{sessionId}`, TTL 24h). The DB count via `events` rows stays as audit trail (fallback when Redis is unavailable). Both `ip` AND `sessionId` must match for the same anon to be tracked — clients can no longer reset by sending a fresh `sessionId`.

## Service-role audit (per route)

Routes still using `getSupabaseService()` and rationale:

| Route | Why service-role | Safe to downscope? |
|---|---|---|
| `/api/chat` | reads anonymous draft peeks (no Clerk JWT for anon path) | No — anon path needs to write rows on user's behalf |
| `/api/pick` | recipients are anon; pick rows scoped by HMAC, RLS would need a JWT custom claim approach | No — anon insert/update |
| `/api/checkout` | reads peek by id where curator owns; could use `createSupabaseServer()` once RLS policies for curator-owned peeks exist | Future packet — curator-scoped RLS not in 0006 |
| `/api/scrape` | writes `events` insert with arbitrary `user_id` | No — service-level cache writes |
| `/api/upload` | writes via storage SDK (storage RLS separate) | No — storage upload bypass |
| `/api/share/send` | reads peek + writes event row | No — touches `events` with elevated payload |
| `/api/stripe/webhook` | webhook, no user context | Correct |
| `/api/webhooks/clerk` | webhook | Correct |
| `/api/webhooks/skimlinks` | webhook | Correct |
| `/app/build/**` server pages | reads peek by curator_id with explicit equality check | Future packet — `createSupabaseServer()` w/ Clerk JWT template `supabase` once peek-owner RLS policy lands |
| `/app/g/[slug]` server page | recipient view of published peeks | Could switch to `createSupabaseServer()` post-0006 since policy now allows anon SELECT on published peeks — leaving on service-role for the metadata lookup (also reads draft peeks for `AlmostReady`) |

**Finding:** the build pages (`/build/[peekId]`, `/build/page.tsx`, `/build/[peekId]/publish/**`) and `/g/[slug]` are reasonable candidates to migrate to `createSupabaseServer()` in a follow-up packet, once a curator-scoped peek RLS policy exists. Not done here because (a) the Clerk JWT template `supabase` integration was set up but the live token payload's `sub` claim format hasn't been verified against `curator_id`, and (b) the recipient page intentionally needs to see draft peeks to render `AlmostReady`. Service-role bypasses RLS so all current flows continue working; the RLS enable from 0005 is defense-in-depth against direct REST traffic.

## RLS policies (migration `0006_rls_policies.sql`)

Applied via `npm run db:migrate` or via Supabase MCP. Idempotent (drops policies before recreating).

1. Revokes INSERT/UPDATE/DELETE/SELECT from `anon, authenticated` on all peek_v2 tables + revokes default privileges (closes the schema-exposure grants from migration `0002`).
2. Grants SELECT back only on `peeks`, `cards`, `variant_groups`, `picks` — the four tables the Realtime client subscribes to.
3. Adds RLS policies on those four tables: anon/authenticated can SELECT rows belonging to peeks with status in `('published','claimed')`.

Result: anon hitting `/rest/v1/peek_v2/users` (or `relationships`, `events`, etc.) directly gets nothing. Anon hitting `/rest/v1/peek_v2/peeks` gets only published rows. Realtime subscriptions in `lib/peek/realtime.ts`, `components/recipient/realtime.ts`, `app/build/[peekId]/publish/publish-status.tsx` continue to work for the published recipient flow. The publish-status page subscribing pre-publish will get its first updates only after the row flips to published, which matches the actual UX (status flip is what we're polling for).

`users`, `relationships`, `events`, `affiliate_revenue`, `chat_messages`, `webhook_log`, `peek_collaborators` are now fully locked from client traffic. Service-role bypasses RLS so server routes continue working.

## CSP / security headers

Added via `next.config.mjs#headers()` for all routes:
- CSP: explicit allowlist for Clerk (`*.clerk.com`, `*.clerk.accounts.dev`, `clerk.peek.gift`), Stripe (`js.stripe.com`, `api.stripe.com`, `hooks.stripe.com`, `checkout.stripe.com`), Supabase (`*.supabase.co` HTTP + WSS for Realtime), PostHog (`us.i.posthog.com`, `us-assets.i.posthog.com`), Anthropic (`api.anthropic.com`), fal.ai (`api.fal.ai`, `cdn.fal.media`), Browserbase, ZenRows, Cloudflare Turnstile (`challenges.cloudflare.com`).
- `'unsafe-inline' 'unsafe-eval'` on script-src — Next 16 + Turbopack still requires this for hydration scripts; standard for App Router. Tightening to nonce-based CSP is a future packet.
- HSTS (2 years, includeSubDomains, preload), X-Content-Type-Options=nosniff, X-Frame-Options=DENY, Referrer-Policy=strict-origin-when-cross-origin, Permissions-Policy disabling camera/mic/geo/FLoC.
- `frame-ancestors 'none'` overlaps with X-Frame-Options for double defense.

If a third-party integration breaks at runtime (e.g., a new analytics script or affiliate redirect domain), add its origin to the relevant CSP directive — most likely `connect-src` or `script-src`.

## Webhook idempotency

`lib/security/idempotency.ts` uses Redis SET NX with 24h TTL. Wired into Stripe (`event.id`), Clerk (`svix-id`), Skimlinks (`transaction_id`). If Redis is unavailable: behaviour is firstSeen=true (no de-dup) with a console warn — the underlying handlers (Stripe code already short-circuits on `peek.status === 'published'`; Skimlinks already uses `upsert(..., { onConflict: 'external_txn_id' })`; Clerk's user upsert is idempotent on `clerk_user_id`) all remain safe under replay, so this is defence-in-depth, not the only line.

## Origin allowlist

`lib/security/origin.ts#isOriginAllowed(req)` — checks `Origin` (preferred) or `Referer` header against `APP_URL` (and `localhost:3000` in dev). Applied to ALL state-changing routes: `/api/chat`, `/api/checkout`, `/api/pick` POST + DELETE, `/api/scrape`, `/api/share/send`, `/api/upload`. NOT applied to webhook routes (signature-authed; external systems don't send Origin).

Returns 403 `{"error":"forbidden_origin"}` when the header is present but doesn't match. If both Origin and Referer are missing (some legitimate edge cases like server-to-server calls from same origin), the request is rejected — this is intentional, all known browser flows send at least one.

## Webhook configuration consistency

All three webhook routes (Stripe, Clerk, Skimlinks) now 500 with a clear message if their signing secret env var is missing. Already the case for Stripe + Clerk; verified Skimlinks does too.

## Things deliberately deferred

1. **CSP nonces.** Replacing `'unsafe-inline'` + `'unsafe-eval'` with nonce-based CSP is a follow-up packet (requires Next 16 + Turbopack nonce wiring). The current CSP still mitigates XSS vectors via origin restriction.
2. **Curator-scoped RLS.** Need Clerk JWT template `supabase` validated against the live `curator_id` shape before writing peek-owner policies. Once that's verified, build pages can migrate to `createSupabaseServer()`.
3. **Pick anon writes via direct REST.** Picks are still written via `/api/pick` (service-role). If we ever want to remove the API route in favor of direct anon REST writes, we'd need a JWT-scoped policy on the recipient signature — out of scope for 31.
4. **Drizzle-kit regen of 0006.** This packet hand-wrote the SQL since drizzle-kit doesn't generate grant/policy DDL. The `_journal.json` entry was appended manually. Future schema changes will need orchestrator to either preserve 0006 or fold its DDL into the next generated migration.

## File touch summary

- New: `lib/rate-limit/redis.ts`, `lib/security/client-ip.ts`, `lib/security/recipient.ts`, `lib/security/origin.ts`, `lib/security/idempotency.ts`, `db/migrations/0006_rls_policies.sql`, `db/migrations/meta/0006_snapshot.json`
- Modified: `lib/env.ts`, `lib/chat/session.ts`, `next.config.mjs`, `app/g/[slug]/page.tsx`, `app/api/chat/route.ts`, `app/api/pick/route.ts`, `app/api/upload/route.ts`, `app/api/scrape/route.ts`, `app/api/share/send/route.tsx`, `app/api/checkout/route.ts`, `app/api/stripe/webhook/route.ts`, `app/api/webhooks/clerk/route.ts`, `app/api/webhooks/skimlinks/route.ts`, `db/migrations/meta/_journal.json`
