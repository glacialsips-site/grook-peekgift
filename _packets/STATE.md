# STATE — live build status

_Last updated: 2026-05-25 by cloud worker (post batch-2A dispatch)_

## READ FIRST — Worker feedback from batch 2A (before drafting next batch)

Batch 2A landed 07, 10, 11, 12 (08, 09, 13 explicitly deferred by user). All four branches pushed, each typecheck+build green standalone. Things the next-batch drafter NEEDS to know:

### Schema-fix packet is now blocking three flows. Draft it next.

Three independent gaps in `db/schema/peeks.ts` surfaced across packets 10, 11, 12:

1. **`peeks.curator_id` is `NOT NULL`** → anonymous-curator flow can't write a draft Peek. Packet 12 redirects anon users to sign-in as a workaround. Packet 10 wrote the access-check code to handle null curator + `metadata.anonymous_session_id` but it fails closed until the schema lights up.
2. **`peeks.metadata` jsonb column doesn't exist** → packet 10's anon access predicate (`metadata->>'anonymous_session_id' = sessionId`) and packet 12's anon draft creation both reference it. Add as `jsonb default '{}' not null`.
3. **`peeks.vibe` is typed as `{ palette: string[], font_pairing: string }`** but packets 11 + 12 + 05's `<PeekVibeProvider>` all use the richer `{ palette: { bg, surface, ink, accent, accent2? }, font_pairing: { display, body }, tone, mood_words, motion }` shape. Packet 11 casts via `as unknown as Vibe` since jsonb is permissive. Relax the type to a proper schema match.

All three fit one packet: a Drizzle migration + schema-file edit. Sequencing: must land before integration if you want any of 10/11/12's anon paths to function. Doesn't block sign-in flow.

### Other notable signals

- **`.gitignore` foot-gun.** `atelier/.gitignore` (from packet 01) has `build/` which globs and masks `app/build/` and `components/build/`. Packet 12 worked around with `!app/build/`, `!components/build/`, `!lib/peek/` negations. Cleaner long-term: change `atelier/.gitignore`'s `build/` → `/build/` (root-only). Schedule as a one-line cleanup or fold into the next foundation tweak.
- **`chatTurn` helper doesn't expose tool outputs.** Packet 10 had to bypass `chatTurn` and re-implement the agent loop inline so the SSE stream could emit `tool_result` events to the client. Worth refactoring `chatTurn` (packet 03) to accept an `onToolResult` callback, then packet 10 can use it. Otherwise the inline loop and `chatTurn` will drift.
- **`SseEvent` union is defined twice.** Once in `app/api/chat/schema.ts` (packet 10) and once in `lib/peek/types.ts` (packet 12) because packet 12's client can't import server-only schema. Move to a shared `lib/chat/sse-types.ts` (no `server-only` import) and both sides re-export. Small follow-up packet.
- **fal.ai endpoint shape is assumed.** Packet 11's `generate_hero_image` calls `https://fal.run/fal-ai/flux/schnell` with `image_size: 'landscape_16_9' | …` and expects `{ images: [{ url, content_type }] }`. Worker hasn't verified against current fal docs. Packet 14 (image gen pipeline) should confirm + harden.
- **Image upload, chat history persistence, mobile slide-up preview** were cut from packet 12 for scope. The file-picker is a stub; chat history is local state only (Peek doc is the durable surface); the preview is a binary chat/preview pill instead of a slide-up sheet. Worth a separate "12-followup" packet OR fold into 13/14.
- **camelCase ↔ snake_case mapping** lives ad-hoc in `lib/peek/realtime.ts` and `app/build/[peekId]/page.tsx`. A central mapper (or just standardizing on one casing) would reduce drift.

## Where we are

- **Trunk:** `atelier-integration` (this branch). Build green end-to-end as of `e387927` (batch 2A merged + gitignore fix).
- **Packets 01-12 + 07 integrated.** 7 routes compile: `/`, `/api/chat`, `/api/webhooks/clerk`, `/build`, `/build/[peekId]`, `/sign-in/[[...rest]]`, `/sign-up/[[...rest]]`. No deprecation warnings.
- **Batch 2B drafted and dispatched**: 13 (schema fix — unblocks anon flow), 14 (recipient view + picks), 15 (Stripe checkout), 16 (share + OG + email), 17 (chat plumbing cleanup).
- **Netlify** still points at the legacy site. Promotion of `atelier-integration` → deploy target = orchestrator task, done after batch 2B lands.

## Build target

`/atelier/` inside this repo. Existing app at repo root = scrap, untouched. Promote `atelier-integration` to `main` when stable for prod cutover.

## Build principles (read first, apply everywhere)

- **Always latest stable.** Every dep ships at its current latest. No version pinning for "compatibility." No `--legacy-peer-deps`. If two libs disagree on peer versions, bump both to latest. If genuinely stuck, file a follow-up packet rather than pinning back.
- **Newest patterns over familiar ones.** Tailwind v4 over v3, React 19 server components default, Next 16 conventions, ES2024+ syntax. Be ahead, not safe.
- **No backwards-compat shims.** No `// removed for X` placeholders, no kept-around-just-in-case exports, no fallback paths for old runtimes.
- **Failures fix forward.** If a worker hits a wall, the fix is to upgrade or rewrite, not to downgrade or hedge.
- **Code only — no narrative comments.** Comments explain a non-obvious WHY or they don't exist. Every comment that does land must be logged in `_packets/COMMENTS.md` so stale ones can be audited.
- **Progressive everywhere.** The product is mostly-zero user input. The chat agent never asks for one big batch of fields — it picks up signal continuously and updates the document continuously. The preview is *always* live. The vibe engine is *not one-shot* — it re-evaluates on every new signal (first 2 turns → hero image upload → first card → note tone → final touches). The orchestrator's job is to ensure every packet that touches user-facing flow respects this principle.

## Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16 App Router + React 19.2 + TS 6 strict | Latest stable; matches `app/` |
| Routing helper | `proxy.ts` (Next 16) — rename in packet 07 | `middleware.ts` deprecated in Next 16 |
| Styling | Tailwind v4 (CSS-first, `@theme inline`, `@tailwindcss/postcss`) + shadcn/ui v4-compatible + Radix + Framer Motion | Adaptive theming requirement |
| Auth | Clerk 7 | Production keys already wired at `accounts.peek.gift` |
| DB | Supabase Postgres + Drizzle ORM 0.45 + pgvector | Schema `peek_v2` already exists |
| AI | Anthropic SDK 0.98 — streaming + tool use + prompt caching (GA, no beta header) + vision + extended thinking | Core product |
| Payments | Stripe 22 — Payment Element, Tax, Adaptive Pricing (on), Link, local methods | Live keys exist |
| Email | Resend 6 | Live key, `info@peek.gift` verified |
| SMS / WA | Twilio 6 + WhatsApp Business via Twilio | Keys not yet wired |
| Scraping | Browserbase primary, ZenRows fallback, Jina Reader for long-tail markdown | Keys exist for first two |
| Image gen | fal.ai (Flux) | Cheap + fast |
| Background jobs | Inngest 4 | Durable webhooks + scheduled nudges |
| Cache / rate-limit | Upstash Redis | Per-user AI cost control |
| Analytics | PostHog (autocapture + replay + flags + LLM observability) + own `events` table | Single source of truth |
| Errors | Sentry 10 — packet 08 | Re-add (was ripped out in disaster) |
| Affiliate (outbound) | Skimlinks or Sovrn (TBD on accounts) | One integration, 25k+ retailers |
| Affiliate (inbound creator) | Tolt or Rewardful (TBD on accounts) | Stripe-native |
| Host | Netlify (Pro, full MCP control) | Avoid migration cost; solve build-cache pain once |

## Currently installed (atelier/, batch 1 — refresh after each batch)

| Package | Installed | Notes |
|---|---|---|
| next | 16.2.6 | turbopack default; **`middleware.ts` deprecated → `proxy.ts`** |
| react / react-dom | 19.2.6 | `ref` is a regular prop; `forwardRef` still works |
| typescript | 6.0.3 | latest |
| tailwindcss | 4.3.0 | CSS-first, `@theme inline`, `@tailwindcss/postcss` |
| @tailwindcss/postcss | 4.3.0 | use in `postcss.config.mjs` |
| @anthropic-ai/sdk | 0.98.0 | `Anthropic.Tool.InputSchema`; prompt caching GA; `MessageStream` events: `streamEvent` / `text` / `thinking` / `inputJson` / `finalMessage` / `error` / `abort` / `end` |
| @clerk/nextjs | 7.4.1 | requires next ≥15.2.8; APIs match Clerk 6 docs |
| @supabase/ssr | 0.10.3 | `getAll`/`setAll` cookie adapter |
| @supabase/supabase-js | 2.106.2 | use `db: { schema: 'peek_v2' }` config + plain `.from(...)` (`.schema('peek_v2').from(...)` chaining not typed) |
| drizzle-orm | 0.45.2 | indexes via array-callback `(t) => [index(...).on(...)]`; `bigserial({ mode: 'bigint' })` |
| drizzle-kit | 0.31.10 | `generate` works without DATABASE_URL |
| zod | 4.4.3 | `.flatten().fieldErrors` still works |
| stripe | 22.1.1 | |
| twilio | 6.0.2 | |
| resend | 6.12.3 | |
| inngest | 4.4.0 | |
| @sentry/nextjs | 10.53.1 | needs next ≥16.0.10 (met) |
| posthog-js / posthog-node | 1.376.0 / 5.35.1 | |
| tailwind-merge | 3.6.0 | |
| @vercel/og | 0.11.1 | |
| svix | 1.94.0 | |
| zustand | 5.0.13 | |
| framer-motion | 12.40.0 | |
| dotenv | 17.4.2 | |

`autoprefixer` removed (bundled into `@tailwindcss/postcss`).

## Packet graph

### Batch 1 — DONE

| # | Title | Branch | Sha | Notes |
|---|---|---|---|---|
| 01 | Foundation | `claude/packet-01-foundation` | `b779fe1` | Latest deps; Next 16; build green |
| 02 | DB schema | `claude/packet-02-schema` | `8ba023a` | Drizzle 0.45 array-callback indexes; bigserial bigint; migration generated, not applied |
| 03 | Anthropic | `claude/packet-03-anthropic` | `9954669` | SDK 0.98 namespaced types; MessageStream → AsyncGenerator; 530-word system prompt |
| 04 | Supabase | `claude/packet-04-supabase` | `b8c6322` | server/browser/service; `server-only` enforced; integration added `db: { schema: 'peek_v2' }` |
| 05 | UI primitives | `claude/packet-05-ui` | `080f455` | shadcn v4 + `@theme inline`; classic `forwardRef` for copy-paste compatibility |
| 06 | Clerk | `claude/packet-06-clerk` | `97f75db` | Inline stub replaced at integration with `@/lib/supabase/service` import |

### Batch 2A — DONE (pushed, awaiting integration)

| # | Title | Branch | Notes |
|---|---|---|---|
| 07 | Rename `middleware.ts` → `proxy.ts` (Next 16) | `claude/packet-07-proxy-rename` | Pure rename; build green, deprecation warning gone (route table shows `ƒ Proxy (Middleware)`) |
| 10 | Chat API route (`/api/chat`): streaming Claude + tool-use loop | `claude/packet-10-chat-api` | Typecheck + build both green; SSE format `event: <kind>\ndata: <SseEvent JSON>\n\n`; inline tool loop (not `chatTurn`) so `tool_result` events emit; anon path blocked on schema-fix |
| 11 | Tool implementations (13 verbs) | `claude/packet-11-tools` | All 13 verbs registered: `set_recipient`, `set_vibe`, `update_vibe`, `set_hero_image`, `generate_hero_image`, `set_note`, `add_variant_group`, `add_card`, `remove_card`, `reorder_cards`, `scrape_url`, `mark_ready_for_publish` (+ existing `ping`); typecheck + build green; vibe shape mismatch worked around via jsonb cast |
| 12 | Chat UI shell + live preview pane (mobile-first) | `claude/packet-12-chat-ui` | All 7 files; manual SSE parser (EventSource can't POST); typecheck + build green; image upload + chat history persistence + slide-up sheet cut for scope (see worker feedback) |

### Batch 2B — DEFERRED / DRAFTING

| # | Title | Imports from siblings | Status |
|---|---|---|---|
| 08 | Sentry re-add: instrumentation + tunnel + Netlify env wiring | `@/lib/env` | Deferred — wait until runtime traffic exists |
| 09 | Netlify deploy plumbing | none | Orchestrator owns; via MCP after chat works end-to-end |
| 12.5 | **Schema-fix** (NEW — recommended next): `peeks.curator_id` nullable, add `peeks.metadata` jsonb, relax `peeks.vibe` type | none (schema only) | **READY TO DRAFT** — unblocks anon flow + cleans up jsonb casts |
| 12.6 | **chatTurn refactor** (NEW — optional): add `onToolResult` callback so packet 10 can use the helper instead of inline loop | `@/lib/anthropic/chat` | small follow-up |
| 12.7 | **Shared `SseEvent` type** (NEW — optional): move to `lib/chat/sse-types.ts`, both API + UI re-export | none | trivial |
| 13 | Vibe engine: progressive re-evaluation + palette extraction from hero | packet 11 tools, packet 12 UI | Deferred per user — `update_vibe` verb already wired; defer until chat flow runs end-to-end |
| 14 | Image gen via fal.ai Flux + hero image upload pipeline | `@/lib/supabase/storage`, `@/lib/env` | TBD draft |
| 15 | Recipient view `/g/[slug]` + cinematic reveal + picks API | packet 02 schema, packet 04 supabase, packet 05 UI, packet 13 vibe | TBD draft |
| 16 | Stripe checkout: $12 publish gate + webhook → mark `peeks.status = published` | packet 02 schema, packet 04 supabase, `@/lib/env` | TBD draft |
| 17 | Share + OG image generation + Resend confirmation email | `@/lib/env`, `@/lib/supabase`, `@vercel/og` | TBD draft |
| 18 | Group co-curation: collaborators table API + invite-link flow + role-gated tools | packet 02, 04, 11 | TBD draft |
| 19 | Affiliate link layer: Skimlinks/Sovrn outbound wrap + `affiliate_revenue` webhook | packet 02 schema, `@/lib/env` | TBD draft |
| 20 | Analytics instrumentation: PostHog server+client + LLM observability + own events writer | packet 02, 04 | TBD draft |
| 21 | Inngest functions: birthday/anniversary nudges + scrape queue + retry policies | packet 02, packet 04 | TBD draft |
| 22 | Social outbound: Ayrshare/Buffer adapter + generated reels job | packet 21 inngest | TBD draft |

## Open architectural questions (won't block batch 2)

- Affiliate network choice (Skimlinks vs Sovrn) — pending user account creation
- Creator affiliate platform (Tolt vs Rewardful) — pending
- Anonymous metering threshold (default: 5 turns or first publish action)
- Group Peek payment model (default: organizer-pays MVP; split-the-bill in v1.1)
- Voice notes on Peek page (defer to v1.1 unless user wants in MVP)

## Things the orchestrator owes

- **Integrate batch 2A** (07, 10, 11, 12) into `atelier-integration`. Recommended order: 07 (rename — no conflicts) → 11 (tools — registers handlers) → 10 (chat API — consumes registered handlers) → 12 (UI — consumes API). Run `cd atelier && npm install && npm run build` after each merge.
- **Draft + dispatch packet 12.5 (schema-fix).** Three columns to fix in one migration (see Worker feedback section). Worker can execute.
- **Netlify**: switch `peek-gift-vnext` site's base dir to `atelier/`, sync env vars from production `peek-gift` site via MCP, set up branch-deploy for `atelier-integration`.

## Container restart recovery

1. `git fetch --all`. Trunk = `atelier-integration`.
2. Read this file fully — especially "Build principles" and "Currently installed."
3. `cd atelier && npm install && npm run build` — must pass.
4. Continue from the next batch-2 packet in DRAFTING state.
