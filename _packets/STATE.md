# STATE — live build status

_Last updated: 2026-05-25 by cloud worker (post packet 18 + Stripe live wiring)_

## READ FIRST — packet 18 done, site live, Stripe live, push-to-deploy wired

`https://peek-gift-vnext.netlify.app/` is serving the atelier app end-to-end. Branch `atelier-integration` head: `5830742` ish (whatever the latest is after the proxy.ts fix). All batch 2B is integrated. Packet 18 (deploy-fix) merged with three real fixes baked in:

1. **`<ClerkProvider>` added to `app/layout.tsx`** — was missing; packet 06 had deferred it to an "integration packet" that never landed; signed-in routes throw `useSession can only be used within <ClerkProvider>` without it.
2. **`peek_v2` PostgREST schema-exposure migration** (`atelier/db/migrations/0002_schema_exposure.sql`) — adds `peek_v2` to `pgrst.db_schemas` GUC + all role grants + default privileges. Idempotent. Already applied on the live DB via SQL during this session; future fresh DBs / branches will get it via `db:migrate`.
3. **`proxy.ts` public-routes list** — added `/api/stripe/(.*)` and `/api/pick(.*)`. Stripe webhooks + recipient picks use signature/HMAC auth, not Clerk sessions; gating them via `clerkMiddleware` rewrites them to 404 for unauthenticated callers.

### Stripe / Tax: now LIVE

- `PAY_MODE=live` on Netlify (no longer mock).
- New webhook endpoint `we_1Tb7PhCEKPUsVee1Jz6Kcxkb` → `https://peek-gift-vnext.netlify.app/api/stripe/webhook`, listening on `checkout.session.completed`. Signing secret in Netlify as `STRIPE_WEBHOOK_SECRET` (production + previews + dev + branch-deploy contexts, secret). Legacy webhook `we_1TRbB2CEKPUsVee1Qh084LCz` → `peek.gift/api/payment-webhook` left untouched.
- Stripe Tax was **already active** on the account (default tax code `txcd_10000000`, head office in NJ). The `automatic_tax: { enabled: true }` flip from earlier session works at runtime — no separate activation needed. Stripe Adaptive Pricing also already on.
- Stripe webhook endpoint, env var, and code-level `automatic_tax` are all wired via direct API calls (Stripe MCP doesn't expose webhook ops, but `api.stripe.com` is reachable with the live `STRIPE_SECRET_KEY`).

### Supabase keys: now on modern format

- `SUPABASE_SERVICE_ROLE_KEY` on Netlify is now a fresh `sb_secret_*` (not the legacy JWT). Created in Supabase Dashboard, set via Netlify API with per-context values (Netlify rejects `is_secret: true` + `context: all`; need explicit production/deploy-preview/branch-deploy/dev).
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` already on `sb_publishable_*` format.
- Legacy JWT keys still active on the project because the **legacy `peek.gift` Vite site uses them**. Do NOT click "Disable JWT-based API keys" until the legacy site is decommissioned / cut over.

### Netlify push-to-deploy: working via GitHub Actions + build hook

- Netlify GitHub App is NOT installed (user's Netlify account only has Google OAuth, not GitHub OAuth — `installation_id: null` on the site). Repo is linked via deploy key only (`deploy_key_id: 6a14c8849db1b236675f107f`, public key added to GitHub repo as a deploy key).
- Push-to-deploy wired through a workaround: `.github/workflows/netlify-deploy.yml` calls Netlify build hook `https://api.netlify.com/build_hooks/6a14cf135c167288ad60f6a9?trigger_branch=atelier-integration` on every push to `atelier-integration`. Verified end-to-end.
- If the user wants the canonical Netlify GitHub App path later, they can install it at `https://github.com/apps/netlify/installations/new` and the Actions workflow becomes a no-op (build hook still works as a backup).

### What's deployed (11 routes)

`/`, `/api/chat`, `/api/checkout`, `/api/pick`, `/api/share/send`, `/api/stripe/webhook`, `/api/webhooks/clerk`, `/build`, `/build/[peekId]`, `/build/[peekId]/publish`, `/build/[peekId]/publish/share`, `/g/[slug]`, `/g/[slug]/opengraph-image`, `/sign-in/[[...rest]]`, `/sign-up/[[...rest]]`. `proxy.ts` (Next 16) deprecation-warning-free.

### Smoke (all green)

| Route | Status | Notes |
|---|---|---|
| `/` | 200 | atelier landing |
| `/sign-up` | 200 | Clerk SignUp renders |
| `/sign-in` | 200 | Clerk SignIn renders |
| `/api/chat` POST unauth | 404 (via Clerk `auth.protect` rewrite) | redirects browsers to sign-in |
| `/api/checkout` POST unauth | 404 (Clerk rewrite) | same |
| `/g/[slug]` unknown slug | 404 (`notFound()`) | was 500 before schema-exposure fix |
| `/api/webhooks/clerk` no sig | 400 "missing svix headers" | Svix sig validation working |
| `/api/stripe/webhook` no sig | 400 "missing signature" | Stripe sig validation working |
| `/api/stripe/webhook` bad sig | 400 "invalid signature: No signatures found matching..." | Stripe SDK validates against real secret |

### Suggested follow-up packets (carryovers + new from this session)

In priority order:

1. **20 — image upload + chat history persistence + mobile slide-up preview** (originally cut from packet 12 for scope). This is what unblocks the actual user flow end-to-end. Highest priority for real product.
2. **18-followup-A — `app/build/[peekId]/page.tsx:68` `as Vibe` cast removal** (packet 17 couldn't reach it). One-line code touch.
3. **18-followup-B — `publish-cta.tsx` relocation** from `app/build/[peekId]/publish/` to `components/build/` (packet 15 colocation deviation).
4. **21 — Vibe engine** progressive palette extraction from hero + tone classifier.
5. **22 — fal.ai image gen pipeline harden** — verify endpoint shape, full flow including upload to Supabase Storage.
6. **23 — Group co-curation** — collaborators API + invite-link flow + role-gated tools.
7. **24 — Affiliate link layer** — Skimlinks/Sovrn outbound wrap + `affiliate_revenue` webhook.
8. **25 — Analytics instrumentation** — PostHog server+client + LLM observability + own events writer.
9. **26 — Inngest functions** — birthday/anniversary nudges + scrape queue + retry policies.
10. **27 — Social outbound** — Ayrshare/Buffer adapter + generated reels job.
11. **29 — Share-sheet brand-icon polish** — replace inline SVGs once a brand-icon dep is added.
12. **30 — Single-fire `turn_end` SSE event** — currently fires per inner-loop iteration.
13. **08 — Sentry re-add** — deferred until runtime traffic exists (live now, can land any time).

### Stripe Dashboard nice-to-have (not required)

Set product `prod_UZzXnuYuX4ud15` tax_code from default `txcd_10000000` ("General — Service") to `txcd_10103001` ("Digital services — general") for cleaner per-jurisdiction handling. Dashboard → Products. Optional.

### peek.gift cutover plan (when ready)

Three edits and you're cut over:

1. Add `peek.gift` as a custom domain on this Netlify site (Dashboard → Domain management). Same site, no rebuild.
2. Update existing Clerk webhook URL from `peek-gift-vnext.netlify.app/api/webhooks/clerk` to `peek.gift/api/webhooks/clerk` (single field; signing secret stays).
3. Update Stripe webhook `we_1Tb7PhCEKPUsVee1Jz6Kcxkb` URL from `peek-gift-vnext.netlify.app/api/stripe/webhook` to `peek.gift/api/stripe/webhook` (single field; signing secret stays).
4. Update `APP_URL` env var on Netlify from `https://peek-gift-vnext.netlify.app` to `https://peek.gift`.
5. Once legacy peek-gift Vite site is fully decommissioned (no longer serving anyone), THEN you can click "Disable JWT-based API keys" in Supabase Dashboard to drop the legacy auth path.

### Integration gotchas to land cleanly

1. **`atelier/app/g/[slug]/page.tsx` merge.** Packet 14 owns the recipient-view body; packet 16 wrote a stub with `generateMetadata` + a `return null` default export. **Merge**: take 14's `page.tsx` verbatim, prepend 16's `generateMetadata` export and its `import type { Metadata } from 'next';`, discard 16's stub default. Pure file-merge, no cross-imports.
2. **Vibe cast cleanup is INCOMPLETE.** Packet 17 removed casts only at the two sites in its declared target paths (`lib/anthropic/tools/set_vibe.ts`, `lib/anthropic/tools/update_vibe.ts`) — and even those are still pending packet 13's merge, since 17 ran in parallel and didn't see the new `Vibe` type. After 13 merges, the orchestrator (or a 1-line follow-up packet) should drop the casts at all three sites:
   - `lib/anthropic/tools/set_vibe.ts:195`
   - `lib/anthropic/tools/update_vibe.ts:83`
   - **`app/build/[peekId]/page.tsx:68`** ← outside packet 17's target paths; needs its own touch
3. **Lucide 1.x dropped brand icons** (Facebook / X / etc.) — packet 16 inlined small SVGs in `components/build/share-sheet.tsx`. Not a deviation, just FYI: any future packet that wants brand glyphs follows the same inline-SVG pattern.
4. **Worktree-isolation leak root-caused.** Packet 15's agent confirmed: when agents use absolute paths (`/home/user/grook-peekgift/atelier/...`) instead of paths relative to `pwd`, writes land in the parent repo AND the worktree. Packet 15 self-cleaned; packet 13 didn't. **Future agent briefs should explicitly forbid absolute paths**, or the harness should rewrite them. The leaks NEVER affect the agent's own branch (the worktree commit is authoritative) — they only pollute the orchestrator's main worktree, which the orchestrator must wipe before pushing.

### Smaller signals

- **`turn_end` SSE event fires once per inner agent-loop iteration**, not once per user turn — true both in the old inline loop and in the new `chatTurn`-driven route (packet 17). Multi-tool turns emit multiple `turn_end`s. Client (packet 12 chat-pane) treats each as a flush; consider folding to single-fire at outermost loop boundary in a future polish packet.
- **`chatTurn` swallows stream errors after yielding the `error` event** — route can rely on the error being yielded once, no double-handling needed.
- **Stripe `automatic_tax` is OFF** (packet 15). Re-enable after Stripe Tax registration completes; one-line config flip on the Checkout Session create.
- **`publish-cta.tsx` was colocated under `app/build/[peekId]/publish/`** instead of `components/build/` (packet 15) because of the orchestrator's narrowed target paths. Trivial relocate at integration if you want it under `components/build/`.
- **Cinematic reveal motion** (packet 14) scales by `vibe.motion`: still 0.6×, soft 1×, lively 1.25×. Note typewriter only fires for notes ≤280 chars (long notes fade in instead).
- **`pick_all` variant groups** (packet 14) show as "Included" in the UI but the API still accepts opt-in/out — keeps state consistent if a card is moved out of a `pick_all` group later.
- **Activity counter-propose + beg-message persistence** (packet 14): counter-propose reuses `picks.recipient_note`; beg reuses `picks.beg_message`. Both per spec.
- **HMAC fallback** when `GUEST_CLAIM_TOKEN_SECRET` is missing (packet 14): emits `unsigned:<sessionId>` signature, no warn (env var is `.optional()` in `lib/env.ts`). Set the secret in production env so signatures are real.

### Suggested follow-up packets after 2B integrates

- **18 (small) — Vibe cast cleanup at `app/build/[peekId]/page.tsx:68`** + any other stragglers post-13.
- **19 (small) — `publish-cta.tsx` relocation** to `components/build/` if desired.
- **20 (already in plan per old STATE) — image upload + chat history persistence + mobile slide-up preview** that were cut from packet 12.
- **21 — share-sheet brand-icon polish**: lucide icons missing for FB/X; today's solution is inline SVG; if/when a brand-icon dep is added, swap.
- **22 — Stripe Tax + Adaptive Pricing** finalize once Stripe Tax registration is set up.
- **08 (Sentry), 09 (Netlify deploy)** still on the deferred list per user.

## Where we are

- **Trunk:** `atelier-integration`. Build green end-to-end as of `76ef5fb`. 15 routes compile: `/`, `/api/chat`, `/api/checkout`, `/api/pick`, `/api/share/send`, `/api/stripe/webhook`, `/api/webhooks/clerk`, `/build`, `/build/[peekId]`, `/build/[peekId]/publish`, `/build/[peekId]/publish/share`, `/g/[slug]`, `/g/-/opengraph-image`, `/sign-in/[[...rest]]`, `/sign-up/[[...rest]]`.
- **Packets 01-17 integrated.** Batches 1, 2A, 2B all merged.
- **Live `peek_v2` DB schema rebuilt** via Supabase MCP to match our Drizzle schema (`DROP SCHEMA peek_v2 CASCADE` on the previous disaster-attempt tables, then applied consolidated init = packet 02 + packet 13 changes combined). Production `public` schema (118 drafts / 60 gifts / 55 gift_items powering peek.gift) untouched.
- **Netlify** still points at the legacy Vite site (public schema). Promotion of `atelier-integration` → deploy target = orchestrator task, after a smoke test pass.

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

### Batch 2B — DONE (pushed, awaiting integration)

| # | Title | Branch | Sha | Notes |
|---|---|---|---|---|
| 13 | Schema fix (nullable `curator_id` + `metadata` jsonb + Vibe type) | `claude/packet-13-schema-fix` | `4c90636` | New migration `0001_powerful_venom.sql`; zero generate-noise; build green 8 routes |
| 14 | Recipient view `/g/[slug]` + picks API | `claude/packet-14-recipient-view` | `b1857ee`+`7b01964` | 11-component recipient surface + cinematic reveal scaled by `vibe.motion` + variant-group pick semantics + HMAC-signed recipient cookie; build green |
| 15 | Stripe checkout: publish gate + webhook + mock-mode | `claude/packet-15-checkout` | `60b40ed` | Stripe pinned to `apiVersion: '2026-04-22.dahlia'`; **`automatic_tax: { enabled: true }`** + `tax_id_collection`, `billing_address_collection: 'auto'`, `customer_creation: 'always'` — requires Dashboard prereqs (see "Stripe Dashboard owner-tasks" below); webhook idempotent; mock-mode bypasses Stripe; build green |
| 28 | ~~Stripe Tax + Adaptive Pricing finalize~~ | — | code-side now done in 15 (`60b40ed`); only Dashboard config remains (see below) |
| 16 | Share + OG + email | `claude/packet-16-share-og` | `0e1309d` | Next 16 `opengraph-image.tsx` convention; share-sheet with native-share + per-platform deep links; Resend wrapper + 2 templates; lucide brand icons inlined; build green |
| 17 | Chat plumbing cleanup (shared `SseEvent` + `chatTurn(onToolResult)` + Vibe cast cleanup) | `claude/packet-17-chat-cleanup` | `0bc9beb` | Inline agent loop replaced with `chatTurn()`-driven SSE; build green; Vibe cast cleanup partial (2/3 sites — needs follow-up post-13) |

### Future packets (not yet drafted)

| # | Title | Notes |
|---|---|---|
| 08 | Sentry re-add | Deferred per user — wait until runtime traffic exists |
| 09 | Netlify deploy plumbing | Orchestrator owns; via MCP after chat is e2e |
| 18 (small) | Vibe cast cleanup at `app/build/[peekId]/page.tsx:68` + any other stragglers post-13 integration | Trivial — 1 file |
| 19 (small) | `publish-cta.tsx` relocate `app/build/[peekId]/publish/` → `components/build/` | Trivial |
| 20 | Image upload + chat history persistence + mobile slide-up preview (cut from 12 for scope) | Significant UI |
| 21 | Vibe engine: progressive palette extraction from hero + tone classifier | `update_vibe` verb already wired |
| 22 | fal.ai image gen pipeline harden (verify endpoint shape; full flow incl. upload to Supabase Storage) | packet 11 stubbed it |
| 23 | Group co-curation: collaborators API + invite-link flow + role-gated tools | packets 02, 04, 11 |
| 24 | Affiliate link layer: Skimlinks/Sovrn outbound wrap + `affiliate_revenue` webhook | packet 02 schema, env |
| 25 | Analytics instrumentation: PostHog server+client + LLM observability + own events writer | packets 02, 04 |
| 26 | Inngest functions: birthday/anniversary nudges + scrape queue + retry policies | packets 02, 04 |
| 27 | Social outbound: Ayrshare/Buffer adapter + generated reels job | packet 26 |
| 29 | Share-sheet brand-icon polish (replace inline SVGs once a brand-icon dep is added) | trivial |
| 30 | Single-fire `turn_end` SSE event (currently fires per inner-loop iteration) | minor polish |

## Open architectural questions (won't block batch 2)

- Affiliate network choice (Skimlinks vs Sovrn) — pending user account creation
- Creator affiliate platform (Tolt vs Rewardful) — pending
- Anonymous metering threshold (default: 5 turns or first publish action)
- Group Peek payment model (default: organizer-pays MVP; split-the-bill in v1.1)
- Voice notes on Peek page (defer to v1.1 unless user wants in MVP)

## Things the orchestrator owes

- **Integrate batch 2B** in order: **13 first** (schema migration unblocks anon + Vibe type), then 17 (chat cleanup — drops 2 of 3 Vibe casts), then 14, 15, 16 in any order. Special merge step at `app/g/[slug]/page.tsx`: take packet 14's full body, prepend packet 16's `generateMetadata` export + `import type { Metadata } from 'next';`, discard 16's stub default export. Run `cd atelier && npm install && npm run build` after each merge.
- **Apply migration `0001_powerful_venom.sql` to Supabase `peek_v2`** via MCP after packet 13 integrates. Without this the runtime anon flow stays blocked even though the code compiles.
- **Drop the third Vibe cast** at `app/build/[peekId]/page.tsx:68` (packet 17 couldn't reach it). Either fold into integration or schedule as packet 18 (small).
- **Netlify**: switch `peek-gift-vnext` site's base dir to `atelier/`, sync env vars from production `peek-gift` site via MCP, set up branch-deploy for `atelier-integration`. Required before live SSE chat / Stripe live mode can be exercised.

## Stripe Dashboard owner-tasks (cannot be done from this session — MCP doesn't expose Account/Tax)

Packet 15 (commit `60b40ed`) now passes `automatic_tax: { enabled: true }` + `tax_id_collection: { enabled: true }` to `checkout.sessions.create`. Before going live (or even before any `PAY_MODE=live` test) the Stripe account needs:

1. **Stripe Tax activated.** Dashboard → Tax → Settings → Activate. If inactive, Session creation will throw `automatic_tax requires Stripe Tax to be activated on your account`.
2. **Business profile complete.** Dashboard → Settings → Business → Public details + Tax details:
   - Legal entity type (sole prop / LLC / S-corp / etc.)
   - Business tax ID (EIN or SSN-as-sole-prop)
   - MCC: a digital-services code (suggest `5734` Computer Software Stores or `5817` Digital Goods — see Tax mapping in Dashboard for which one Tax treats correctly)
3. **Default tax code on `prod_UZzXnuYuX4ud15`.** Dashboard → Products → peek.gift vNext — Standard → Tax → set a code. For a downloadable/online service: `txcd_10103001` (Digital services — general) is typical for the $12 publish gate. Alternatively make the price `tax_behavior: 'exclusive'` so $12 is the pre-tax amount (preferred for compliance; Adaptive Pricing handles currency).
4. **Origin address registered.** Dashboard → Tax → Registrations → add the home/business state-of-origin (and any other states where you've hit the economic-nexus threshold). Without at least one registration, Tax computes $0 — won't error, but won't collect.

If activating Tax in production is going to take longer than the chat flow is going to take to test end-to-end, flip back to `automatic_tax: { enabled: false }` temporarily — single-line revert on the packet-15 branch. `PAY_MODE=mock` bypasses everything Stripe-side so dev/test still works regardless.

MCP-side limitation: the Stripe MCP in this remote-execution env whitelists only Customer / Invoice / Subscription / Refund / PaymentIntent / Dispute / Product / Price / Coupon / PaymentLink / PromotionCode / Balance — Account, Tax Settings, Tax Registrations, and Business Profile aren't exposed, so the orchestrator (or user) must do all four items above through the Dashboard.

## Container restart recovery

1. `git fetch --all`. Trunk = `atelier-integration`.
2. Read this file fully — especially "Build principles" and "Currently installed."
3. `cd atelier && npm install && npm run build` — must pass.
4. Continue from the next batch-2 packet in DRAFTING state.
