# STATE — live build status

_Last updated: 2026-05-25 by cloud worker (post batch 1 dispatch)_

## READ FIRST — Worker feedback for next batch drafter

The cloud worker (cc-on-web) just landed packets 01-06. Hard-earned signal you NEED before drafting batch 2 (07-16). Read all of this, then update the packet templates accordingly.

### 1. We have no integration target.

Six packet branches sit on `origin/claude/packet-NN-*`. `modest-cray` (this branch) has the orchestration files but NO `atelier/`. `origin/HEAD` points at `claude/youthful-ramanujan-ovHXp` — the legacy scrap. There is no `main`, no `atelier-integration`, no deploy branch. Netlify's deploy target is undefined right now.

**Decide before batch 2:** where do packets merge? Recommended path: land an `atelier-integration` branch that merges 01 → 02 → 03 → 04 → 05 → 06 in order. That becomes the working trunk for batch 2. Promote to a `main` or `production` branch once stable. Until that lands, batch 2 packets that need to import from multiple sibling deliverables cannot validate standalone.

### 2. `npm run build` validation breaks the moment a packet imports a sibling's file.

Packet 06's webhook imports `@/lib/supabase/service` (packet 04's territory). On the standalone packet-06 branch, that file doesn't exist, so `npm run build` fails. Worker workaround: inline-stub the Supabase client inside the route file, with a NOTE to swap at merge. This is fragile and won't scale.

**Two viable fixes for batch 2:**
- **Drop validation to `npm run typecheck`** for packets that declare cross-packet imports in their prompt header (most packets only need typecheck anyway — the build assertion was the user's blanket override).
- **OR sequence the batch.** Land the integration branch (item 1), then dispatch batch 2 packets serially OR in groups that share a base merged commit.

### 3. Desktop Opus is drafting packet prompts against stale SDK versions.

Packet 01's verbatim `package.json` locked `next@15.1.3` + `@clerk/nextjs@^6.34` — those are peer-incompatible per npm (Clerk 6.34 wants Next ^15.2.3+). Worker bumped everything to latest after explicit user override. Concrete drift in subsequent packets:

- **Packet 03** drafted against `@anthropic-ai/sdk@^0.65` (current is `^0.98`). API moved: `Anthropic.Tool['input_schema']` → `Anthropic.Tool.InputSchema`; the `'anthropic-beta': 'prompt-caching-2024-07-31'` header is dead (GA); streaming events restructured (use `MessageStream` with `.on('streamEvent' | 'text' | 'thinking' | 'inputJson' | 'finalMessage' | 'error' | 'abort' | 'end')`).
- **Packet 04** drafted against `@supabase/ssr@^0.6.1` (current `^0.10.3`) — cookie adapter is now `getAll`/`setAll` (packet code matched by luck).
- **Packet 05** assumed Tailwind v3 syntax (`@tailwind base/components/utilities` + JS config). v4 is `@import "tailwindcss"` + `@theme inline { … }` + `@tailwindcss/postcss`.
- **Packet 06** drafted against Clerk 6 — Clerk 7 mostly compatible (`clerkMiddleware`, `createRouteMatcher`, `auth()`, `currentUser`, `<SignIn/>`, `<SignUp/>` all still exported), but the orchestrator can't know that without checking.

**Fix:** keep the "Currently installed (batch 1)" table below up to date after each batch lands. Before drafting a new packet, the orchestrator (or desktop Opus) checks the table for actual installed versions and adapts the example code to that surface.

### 4. STATE.md dep graph is incomplete — must list import-time deps, not just sequencing.

Packet 06's metadata says "depends on 01" but its webhook code imports `@/lib/supabase/service` (a packet-04 file). The "depends on" line as drafted means **sequencing dep only**; it doesn't capture **import-time** deps. For batch 2: every packet header must include a `**Imports from siblings:**` line listing any `@/lib/*` paths it pulls in from other packets. The orchestrator uses this to decide merge order AND validation strictness.

### 5. Agent worktree isolation is unreliable.

Agent tool `isolation: "worktree"` worked correctly for packets 04 & 05 (writes stayed in `.claude/worktrees/agent-XXX/`). Packets 02, 03, 06 leaked files into the parent worktree before settling into their own branches. Packet 03's agent noticed and self-cleaned before committing. Mitigation in batch 2: brief every agent to `pwd && echo $PWD` and verify it ends with `.claude/worktrees/agent-…` before writing a single file.

### 6. `package.json is locked` is too rigid.

Packet 01's constraint "later packets are forbidden from modifying `package.json` to keep merges conflict-free" leaves no escape hatch when a real new dep is needed. Add a "deps-bump" packet slot between batches that ONLY edits `package.json` so workers don't have to inline-vendor or skip features.

### 7. Next 16 deprecates `middleware.ts` in favor of `proxy.ts`.

Worker kept `middleware.ts` per packet 06 spec, but Next 16 prints a deprecation warning at build. Schedule a one-line rename packet (or fold into the integration branch) before batch 2 lands.

### 8. Sentry re-add is still on the locked decisions table but not packeted yet.

Needs its own packet: `instrumentation-client.ts` + `instrumentation-server.ts` + tunnel route + Netlify env wiring (DSN, auth token). Worker can do it.

### Currently installed (batch 1, atelier/ — refresh after each batch)

| Package | Installed | Notes |
|---|---|---|
| next | 16.2.6 | turbopack default; `middleware.ts` deprecated → `proxy.ts` |
| react / react-dom | 19.2.6 | `ref` is a regular prop; `forwardRef` still works |
| typescript | 6.0.3 | latest |
| tailwindcss | 4.3.0 | v4 — CSS-first, `@theme inline`, `@tailwindcss/postcss` |
| @tailwindcss/postcss | 4.3.0 | use in postcss.config.mjs |
| @anthropic-ai/sdk | 0.98.0 | `Tool.InputSchema`; prompt caching GA; `MessageStream` event API |
| @clerk/nextjs | 7.4.1 | requires next ≥15.2.8; APIs match Clerk 6.x docs |
| @supabase/ssr | 0.10.3 | `getAll`/`setAll` cookie adapter |
| @supabase/supabase-js | 2.106.2 | `client.from(...)` only; `.schema('peek_v2').from(...)` chaining absent; use `db: { schema: 'peek_v2' }` config |
| drizzle-orm | 0.45.2 | indexes via array-callback: `(t) => [index(...).on(...)]`; `bigserial({ mode: 'bigint' })` |
| drizzle-kit | 0.31.10 | `generate` works without DATABASE_URL (or with stub) |
| zod | 4.4.3 | `.flatten().fieldErrors` still works |
| stripe | 22.1.1 | |
| twilio | 6.0.2 | |
| resend | 6.12.3 | |
| inngest | 4.4.0 | |
| @sentry/nextjs | 10.53.1 | needs next ≥16.0.10 (met) |
| posthog-js / posthog-node | 1.376.0 / 5.35.1 | |
| tailwind-merge | 3.6.0 | `twMerge` API unchanged |
| @vercel/og | 0.11.1 | |
| svix | 1.94.0 | webhook signature verify unchanged |
| zustand | 5.0.13 | |
| framer-motion | 12.40.0 | |
| dotenv | 17.4.2 | |

`autoprefixer` removed — vendor-prefixing is bundled into `@tailwindcss/postcss` for v4.

---

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
| Framework | Next.js 16 App Router + React 19.2 + TS 6 strict | Latest stable; matches `app/` convention |
| Styling | Tailwind v4 (latest) + shadcn/ui v4-compatible + Radix + Framer Motion | Adaptive theming requirement |
| Auth | Clerk 7 | Production keys already wired at `accounts.peek.gift` |
| DB | Supabase Postgres + Drizzle ORM 0.45 + pgvector | Schema `peek_v2` already exists |
| AI | Anthropic SDK 0.98 — streaming + tool use + prompt caching + vision | Core product |
| Payments | Stripe — Payment Element, Tax, Adaptive Pricing (already on), Link, local methods | Live keys exist |
| Email | Resend | Live key, `info@peek.gift` verified sender |
| SMS / WA | Twilio (+ WhatsApp Business via Twilio) | Need to add — keys not yet wired |
| Scraping | Browserbase primary, ZenRows fallback, Jina Reader for long-tail markdown | Keys exist for first two |
| Image gen | fal.ai (Flux) | Cheap + fast |
| Background jobs | Inngest | Durable webhooks + scheduled nudges |
| Cache / rate-limit | Upstash Redis | Per-user AI cost control |
| Analytics | PostHog (autocapture + replay + flags + LLM observability) + own `events` table | Single source of truth |
| Errors | Sentry | Re-add (was ripped out in disaster) — **packet pending** |
| Affiliate (outbound) | Skimlinks or Sovrn (TBD on accounts) | One integration, 25k+ retailers |
| Affiliate (inbound creator) | Tolt or Rewardful (TBD on accounts) | Stripe-native |
| Host | Netlify (already paid Pro, full MCP control here) | Avoid migration cost; solve build-cache pain once |

## Packet graph

| # | Title | Worker | Depends on | Imports from siblings | Status |
|---|---|---|---|---|---|
| 01 | Foundation — Next.js 16 + TS 6 + Tailwind v4 + env loader | cc-on-web | none | — | **DONE** (branch `claude/packet-01-foundation` @ `b779fe1`, build green) |
| 02 | DB — Drizzle schema + migrations for `peek_v2` | cc-on-web | 01 | — | **DONE** (branch `claude/packet-02-schema` @ `8ba023a`, drizzle-kit check + build green) |
| 03 | Anthropic — client wrapper + tool registry skeleton | cc-on-web | 01 | — | **DONE** (branch `claude/packet-03-anthropic` @ `9954669`, build green) |
| 04 | Supabase clients — server/browser/service-role | cc-on-web | 01 | — | **DONE** (branch `claude/packet-04-supabase` @ `b8c6322`, build green) |
| 05 | UI primitives — shadcn/ui v4 base + theme + Vibe renderer | cc-on-web | 01 | — | **DONE** (branch `claude/packet-05-ui` @ `080f455`, build green) |
| 06 | Clerk — middleware, sign routes, webhook handler | cc-on-web | 01, **04** (imports `@/lib/supabase/service` — inlined stub in branch; swap at merge) | `@/lib/supabase/service` | **DONE** (branch `claude/packet-06-clerk` @ `97f75db`, build green with inline stub) |

After 01-06 are integrated into an `atelier-integration` branch (TBD by orchestrator), next batch: 07 chat API + streaming, 08 chat UI + live preview, 09 pricing/checkout, 10 share/OG, 11 recipient view, 12 group co-curation, 13 affiliate link layer, 14 analytics instrumentation, 15 Inngest jobs, 16 social outbound. Plus **deps-bump-N** packet between batches if needed, plus **Sentry re-add** packet, plus **middleware→proxy rename** packet.

## Notable per-packet deviations (for orchestrator at merge time)

**Packet 01:**
- Bumped every dep from packet-as-written to latest stable per user override. `Next 15.1.3 → 16.2.6`, `Clerk 6.34 → 7.4.1`, `Tailwind v3 → v4`, `TS 5.7 → 6.0.3`, etc. See "Currently installed" table above.
- Added `turbopack: { root: __dirname }` to `next.config.mjs` — Next 16 detects the parent repo's `package-lock.json` and treats the root as workspace root if not pinned.
- Next 16's build step auto-rewrote `tsconfig.json`: `jsx: "preserve"` → `"react-jsx"` and added `.next/dev/types/**/*.ts` to `include`. Kept the auto-edits.
- Removed `autoprefixer` (bundled into `@tailwindcss/postcss` for v4).

**Packet 02:**
- Added `db/schema/_schema.ts` exporting `peekV2 = pgSchema('peek_v2')` so per-table files can import without barrel cycles. Re-exported from `index.ts`.
- Drizzle 0.45 indexes use array-callback form: `(t) => [index(...).on(...)]` (object form warns).
- `bigserial` for `events.id` uses `mode: 'bigint'`.
- All jsonb defaults `.notNull()`. Booleans `.notNull().default(false)`.
- Generated migration committed; `db:migrate` NOT run (per packet).

**Packet 03:**
- Dropped `defaultHeaders: { 'anthropic-beta': 'prompt-caching-2024-07-31' }` — prompt caching is GA on SDK 0.98, `cache_control: { type: 'ephemeral' }` on blocks is sufficient.
- `Anthropic.Tool['input_schema']` → `Anthropic.Tool.InputSchema` (namespaced).
- Streaming bridge: SDK's `MessageStream` typed events drained into AsyncGenerator via queue+resolver. Events used: `streamEvent`, `text`, `thinking`, `inputJson`, `finalMessage`, `error`, `abort`, `end`.
- `chat.ts` loops on `stop_reason === 'tool_use'` up to 10 iterations, batches all tool_use blocks into one tool_result user message per loop.
- System prompt is a real ~530-word witty-best-friend persona (not placeholder).
- `client.ts` warns at import on missing key; throws via `assertAnthropicConfigured()` at first call.

**Packet 04:**
- Added `import 'server-only';` to `server.ts` (packet's inline code omitted it; higher-level constraint said all server modules must have it).
- Dropped unused `type CookieOptions` import.
- No other deviations — supabase-ssr 0.10 + Clerk 7 APIs matched packet code exactly.

**Packet 05:**
- Used canonical shadcn `forwardRef` patterns despite React 19 making `ref` a regular prop (kept for shadcn copy-paste compatibility).
- Tailwind v4's `@theme inline` in `app/globals.css` (from packet 01) maps shadcn tokens (`bg-background`, `border-input`, etc.) — no theme config changes needed.

**Packet 06:**
- **Inlined the Supabase service client** inside `app/api/webhooks/clerk/route.ts` because `@/lib/supabase/service` doesn't exist standalone. Uses `db: { schema: 'peek_v2' }` config + plain `.from('users')` (the spec's `.schema('peek_v2').from(...)` chaining isn't in supabase-js v2 typings). **At merge into atelier-integration, swap to `import { getSupabaseService } from '@/lib/supabase/service'` and delete the inline factory.**
- Webhook now returns HTTP 500 on Supabase errors instead of silently 200ing — surfaces issues via Clerk's webhook retry/dashboard.
- Kept `middleware.ts` per spec; Next 16 prints a deprecation warning recommending `proxy.ts` — schedule a rename packet.
- Clerk 6 → 7: no source changes needed.

## Open architectural questions (won't block batch 2 once item 1 above is decided)

- Affiliate network choice (Skimlinks vs Sovrn) — pending user account
- Creator affiliate platform (Tolt vs Rewardful) — pending
- Anonymous metering threshold (default: 5 turns or first publish)
- Group Peek payment model (default: organizer-pays MVP)

## Things the orchestrator owes the user

- Decide the integration-branch story (see worker feedback item 1 above) before drafting batch 2.
- Schedule Sentry re-add + middleware→proxy rename packets.

## Container restart recovery

If you're a fresh orchestrator session reading this:
1. `git fetch --all` to see worker branches.
2. Read the "Worker feedback" section above. It's the only thing that prevents repeating mistakes.
3. Check the packet graph for statuses.
4. Validate any merged work — `cd atelier && npm install && npm run build`.
5. Continue from the next "READY TO DISPATCH" packet (after item 1 in worker feedback is resolved).
