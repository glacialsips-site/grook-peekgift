# STATE — live build status

_Last updated: 2026-05-25 by orchestrator_

## Build target

`/atelier/` inside this repo. Existing app at root = scrap, untouched.

## Build principles (read first, apply everywhere)

- **Always latest stable.** Every dep ships at its current latest. No version pinning for "compatibility." No `--legacy-peer-deps`. No `.npmrc` workarounds. If two libs disagree on peer versions, **bump both to latest** — newer of the two almost always solves it. If genuinely stuck, file a follow-up packet rather than pinning back.
- **Newest patterns over familiar ones.** Tailwind v4 over v3, React 19 server components default, Next 16 conventions, ES2024+ syntax. The point of this rebuild is to be ahead, not safe.
- **No backwards-compat shims.** No `// removed for X` placeholders, no kept-around-just-in-case exports, no fallback paths for old runtimes.
- **Failures fix forward.** If a worker hits a wall, the fix is to upgrade or rewrite, not to downgrade or hedge.

## Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 App Router + React 19 + TS strict | Stack the user asked for; matches `app/` convention |
| Styling | Tailwind v4 (latest) + shadcn/ui v4-compatible + Radix + Framer Motion | Adaptive theming requirement |
| Auth | Clerk | Production keys already wired at `accounts.peek.gift` |
| DB | Supabase Postgres + Drizzle ORM + pgvector | Schema `peek_v2` already exists |
| AI | Anthropic SDK — streaming + tool use + prompt caching + vision | Core product |
| Payments | Stripe — Payment Element, Tax, Adaptive Pricing (already on), Link, local methods | Live keys exist |
| Email | Resend | Live key, `info@peek.gift` verified sender |
| SMS / WA | Twilio (+ WhatsApp Business via Twilio) | Need to add — keys not yet wired |
| Scraping | Browserbase primary, ZenRows fallback, Jina Reader for long-tail markdown | Keys exist for first two |
| Image gen | fal.ai (Flux) | Cheap + fast |
| Background jobs | Inngest | Durable webhooks + scheduled nudges |
| Cache / rate-limit | Upstash Redis | Per-user AI cost control |
| Analytics | PostHog (autocapture + replay + flags + LLM observability) + own `events` table | Single source of truth |
| Errors | Sentry | Re-add (was ripped out in disaster) |
| Affiliate (outbound) | Skimlinks or Sovrn (TBD on accounts) | One integration, 25k+ retailers |
| Affiliate (inbound creator) | Tolt or Rewardful (TBD on accounts) | Stripe-native |
| Host | Netlify (already paid Pro, full MCP control here) | Avoid migration cost; solve build-cache pain once |

## Packet graph

| # | Title | Worker | Depends on | Status |
|---|---|---|---|---|
| 01 | Foundation — Next.js + TS + Tailwind + env loader | cc-on-web | none | **READY TO DISPATCH** |
| 02 | DB — Drizzle schema + migrations for `peek_v2` | cc-on-web | 01 | drafted |
| 03 | Anthropic — client wrapper + tool definitions skeleton | cc-on-web | 01 | drafted |
| 04 | Supabase clients — server/browser/service-role + RLS helpers | cc-on-web | 01 | drafted |
| 05 | UI primitives — shadcn/ui base + theme provider + adaptive Vibe renderer | cc-on-web | 01 | drafted |
| 06 | Clerk integration — provider, middleware, sign-in/up routes, JWT template doc | cc-on-web | 01 | drafted |

After 02-06 land, next batch: 07 chat API + streaming, 08 chat UI + live preview, 09 pricing/checkout, 10 share/OG, 11 recipient view, 12 group co-curation, 13 affiliate link layer, 14 analytics instrumentation, 15 Inngest jobs, 16 social outbound.

## Open architectural questions (won't block packets 01-06)

- Affiliate network choice (Skimlinks vs Sovrn) — pending user account
- Creator affiliate platform (Tolt vs Rewardful) — pending
- Anonymous metering threshold (default: 5 turns or first publish)
- Group Peek payment model (default: organizer-pays MVP)

## Things the orchestrator owes the user

- None right now. Dispatch packet 01 when ready.

## Container restart recovery

If you're a fresh orchestrator session reading this:
1. `git fetch --all` to see worker branches.
2. Check this file for packet statuses.
3. Validate any merged work — `cd atelier && npm install && npm run build`.
4. Continue from the next "READY TO DISPATCH" packet.
