# BUGS — peek.gift vNext bug ledger

_Compiled 2026-05-26 by 8 parallel cross-cutting code agents + orchestrator verification. Trunk `atelier-integration` @ `03dc7c2`. Site live at `peek-gift-vnext.netlify.app`. Zero real users have driven it yet — these are LATENT bugs that will surface the moment one does._

## How to read this

Each finding has: `[ID] severity | scope | file:line — what breaks — what fixes it`
- **severity**: BLOCK (flow halts for user) / MAJOR (silent fail / wrong data / cost burn) / MINOR (smell / polish)
- **scope**: A=code patch / B=migration or env / C=needs architectural decision / D=already-debunked-agent-claim
- **source**: agent number (1=auth, 2=chat, 3=tools, 4=vibe, 5=recipient, 6=publish, 7=external, 8=infra) or `OWN` for orchestrator verification

Verified-wrong agent claims (debunked, do not act on):
- Agent 1 said `proxy.ts` isn't recognized as middleware in Next 16. **WRONG** — live deploy returns `x-clerk-auth-reason` headers, packet 07 explicitly did the rename per Next 16 convention.
- Agent 1 said `@clerk/nextjs/legacy` doesn't resolve in 7.4.1. **WRONG** — file at `dist/types/legacy.d.ts` re-exports `useSignIn/useSignUp` from `@clerk/react/legacy`; typecheck + build both green.
- Agent 3 said `events.kind` is a strict enum that would throw on `palette_extract_scheduled`. **WRONG** — `db/schema/events.ts:21` is `text('kind').notNull()`, free-form.
- Agent 7 said inngest 4.4.0 doesn't export `eventType`, `staticSchema`, `cron`. **WRONG** — all three are in the package's `index.d.ts`.

---

## CRITICAL — fix before any user touches the site

### Security holes that let an attacker break the model

| ID | Sev | Scope | File:line | What breaks | Fix |
|----|-----|-------|-----------|-------------|-----|
| B01 | BLOCK | A | `app/api/pick/route.ts:65,70` (agent 5) | **`recipientSessionId` taken from REQUEST BODY, not the signed cookie.** Anyone with a peek slug can POST `/api/pick` with any victim's session id and overwrite their picks, notes, beg-messages. Total impersonation. | Read sessionId from signed cookie via `verifyRecipient()`, ignore body field entirely. |
| B02 | BLOCK | A | `app/api/pick/route.ts:108` (agent 5) | No server check of `card.is_locked` / `unlock_rule.kind === 'beg'`. UI demands a beg message; API accepts pick without one. | Fetch card, enforce beg-message requirement when locked. |
| B03 | BLOCK | A | `app/api/pick/route.ts:110-174` + `db/schema/picks.ts` (agent 5) | No `pick_all` enforcement server-side; no unique constraint on `(peek_id, card_id, recipient_signature)` → race-condition duplicate rows. | Add uniqueIndex; enforce variant-group mode on the route. |

### Things that break or 5xx the moment a user tries

| ID | Sev | Scope | File:line | What breaks | Fix |
|----|-----|-------|-----------|-------------|-----|
| B04 | BLOCK | A | `package.json:73` (agent 4, verified OWN) | **`node-vibrant` is in `devDependencies`.** Netlify builds with `--production` (or `NODE_ENV=production`) won't install it → `import { Vibrant } from 'node-vibrant/node'` throws `MODULE_NOT_FOUND`. Hero palette extraction silently dies in prod. | Move to `dependencies`. One line. |
| B05 | BLOCK | A | `app/layout.tsx:84-106` + `components/providers.tsx` (agents 1, 4, 8, OWN) | **`<Providers>` is dead code.** Never imported. `useQuery`, `useTheme`, `usePostHog`, `useToast` all silently broken across the curator surface. Every child component using those hooks throws "No QueryClient set" or returns undefined. | Wrap `{children}` in `<Providers>` inside the body. |
| B06 | BLOCK | A | `components/ui/toaster.tsx` mount sites (agent 8) | `<Toaster />` is mounted only inside `recipient-view.tsx`. Build pages call `useToast()` → state dispatches go into the void; no toast ever shows on build/auth/checkout surfaces. | Mount `<Toaster />` inside root layout after fixing B05. |
| B07 | BLOCK | A | `lib/supabase/browser.ts:9-13` (agent 5) | Browser Supabase client missing `db: { schema: 'peek_v2' }`. Every realtime channel + browser fetch hits `public.*` (which doesn't have our tables) → silent failure. UI never refreshes after a pick. | Add `db: { schema: 'peek_v2' }` to client config. |
| B08 | BLOCK | B | Live DB / no migration (agent 5) | No migration adds `peek_v2.picks` to `supabase_realtime` publication. Realtime channel won't deliver any events. | Migration: `ALTER PUBLICATION supabase_realtime ADD TABLE peek_v2.picks; ALTER TABLE peek_v2.picks REPLICA IDENTITY FULL;` |
| B09 | BLOCK | A | `app/build/[peekId]/publish/share/page.tsx:85` (agent 6) | Redirects to `/build/[peekId]/publish/checkout` — route doesn't exist. Curator visits `/publish/share` on a non-published peek → 404. | Redirect to `/publish` instead. |
| B10 | BLOCK | A | `app/api/chat/route.ts:217-233` + `lib/anthropic/chat.ts` (agent 2) | Assistant turn persisted ONLY on `next.done` happy-path. Stream error mid-flight → user sees streamed reply, reload loses it. Also: user message persist errors swallowed, same data loss. | Persist user message after Zod parse but before invoking stream; persist assistant content from `chatTurn` even on error path. Surface persist failures as SSE error events. |
| B11 | BLOCK | A | `components/build/chat-pane.tsx:338-347` (agent 2) | Client `apiHistoryRef` strips tool_use blocks from prior turns. Next request sends assistant text only. Model loses tool memory. If last turn was tool-only (no narration), `content: []` is sent → Anthropic 400. | Send full content array including tool_use blocks. |
| B12 | BLOCK | A | `lib/anthropic/chat.ts:52` + `app/api/chat/route.ts:189-194` (agent 2) | `systemPromptOptions` never passed from route. Curator-name + peek-summary are always default "(unknown)" / "(empty)". Model has zero per-turn context outside the history array. | Build options from peek row + Clerk user; pass into `chatTurn`. |
| B13 | BLOCK | A | `lib/anthropic/tools/add_card.ts:106-149` + `add_variant_group.ts:43-49` (agent 3) | `position` is read-then-increment. Two parallel `tool_use` blocks in same Anthropic response → both insert at same position. No unique constraint. Cards collide silently → renders + reorders break. | Replace with `INSERT … SELECT COALESCE(MAX(position),-1)+1 FROM cards WHERE peek_id=$1` in a single statement. Add `uniqueIndex` on `(peek_id, position)`. |
| B14 | BLOCK | A | `app/api/stripe/webhook/route.ts:66-69` (agent 6) | Webhook only handles `checkout.session.completed`. Stripe sends `checkout.session.async_payment_succeeded` for Link/ACH/Klarna. Route 200-acks them and never flips status. Curator stuck on spinner forever. | Subscribe + handle `async_payment_succeeded` (idempotent with same status-flip code path). Also add `async_payment_failed` → status='draft', surface to user. |
| B15 | BLOCK | A | `app/api/stripe/webhook/route.ts:55-62` + `lib/security/idempotency.ts:16` (agents 6, 8) | Idempotency fails OPEN when Redis missing — `firstSeen: true` returned. Stripe retry storm → duplicate `publish` analytics, duplicate emails, double-fulfill if extended later. | Either (a) make Upstash hard-required for prod (fail-closed on missing), or (b) keep open but enforce status short-circuit on every event-type branch. Plus actually set Upstash env on Netlify. |
| B16 | BLOCK | A | `lib/anthropic/tools/mark_ready_for_publish.ts:13-32` (agent 3) | No state-machine check. Re-fires `peek_marked_ready` event regardless of current status; re-surfaces paywall on already-published peek. No precondition validation (recipient / vibe / hero / note / ≥1 card). Pure trust-the-model. | Guard with status enum check + precondition assertions; idempotently no-op if already ready/published. |
| B17 | BLOCK | A | `components/recipient/cinematic-reveal.tsx:46-65` (agent 5) | Timer sequence is mathematically broken: `nameDelayMs` < `heroMs` in all motion modes, so the `note` setter runs BEFORE the `name` setter. The "for {recipient_name}" flourish never renders. The product's wow-moment animation skips the recipient's name entirely. | Recompute delays so phase order is hero → name → note → cards → done. |
| B18 | BLOCK | A | `app/api/posthog/[...path]/route.ts:19-27` (agent 8) | PostHog reverse proxy strips `x-forwarded-for`, `cf-connecting-ip`, cookies, `referer`. Every event arrives with Netlify edge IP → wrong geo, broken session-recording cookies. | Forward those headers; whitelist instead of blacklist. |

---

## MAJOR — fix soon, degrades or silently misbehaves

| ID | Sev | Scope | File:line | What breaks | Fix |
|----|-----|-------|-----------|-------------|-----|
| M01 | MAJOR | A | `app/api/checkout/route.ts:114-127` (agent 6) | `adaptive_pricing: { enabled: true }` not set on Checkout Session despite STATE saying it's on. International curators pay USD. | Add the field. STATE.md says adaptive pricing on the account is already activated. |
| M02 | MAJOR | A | `app/api/checkout/route.ts:121` (agent 6, AUDIT) | `cancel_url` returns curator to `/build/[peekId]` with zero signal they cancelled. | Append `?checkout=cancelled`; chat-pane toasts on detect. |
| M03 | MAJOR | A | `app/api/share/send/route.tsx:24-32` (agent 6) | `destination: z.string().min(3)` flat. SMS gets phone-like garbage; email gets non-emails — Twilio/Resend reject downstream with ugly errors. | Discriminated union on `channel`. |
| M04 | MAJOR | A | `app/api/share/send/route.tsx:64-70` + `components/build/share-sheet.tsx:72-78` (agent 6) | `share_initiated` fires both server-side and client-side for SMS/email → double-counted; other channels only client-side. Analytics will lie. | Pick one side. Recommend client-only fire (consistent across all channels). |
| M05 | MAJOR | A | `app/api/chat/route.ts:99-118` (agent 2, AUDIT) | Anon turn cap keyed on client-controlled `sessionId` (localStorage). Clear storage → fresh 5 turns. Race on parallel POSTs → off-by-one + multiple users-per-IP. | Per-IP bucket via Upstash (already imported); compose with sessionId for fingerprint. |
| M06 | MAJOR | A | `lib/anthropic/chat.ts:68,147` (agent 2, AUDIT) | `MAX_TOOL_ITERATIONS=10` silently returns. UI cursor clears via `turn_end`; user sees half-built peek, no warning. | Append a synthetic `is_error: true` tool_result with "tool budget hit" + emit a `notice` SSE event. |
| M07 | MAJOR | A | `app/api/chat/route.ts:266-271` + `chat.ts:85-91` (agent 2, AUDIT) | `turn_end` fires per inner-loop iteration, not per user turn. Multi-tool turn → cursor disappears between iterations, comes back, etc. | Emit `turn_end` only once at outermost loop boundary. |
| M08 | MAJOR | A | `app/api/chat/route.ts` + `lib/anthropic/chat.ts:49` (agent 2) | Client-supplied `model` accepted with `z.string().min(1)`, passed straight to Anthropic. No allowlist. Cost exfil + arbitrary model selection. | Allowlist enum: sonnet-4.6 / opus-4.7. Default sonnet. |
| M09 | MAJOR | A | `app/api/chat/route.ts` + `chat.ts` (agent 2) | No `AbortSignal` plumbed from request to SDK stream. Tab close → server keeps streaming + running tools for full maxDuration=300s. Anthropic + Browserbase + fal.ai cost burn. | Plumb `req.signal` into `anthropic.messages.stream({ signal })` and the outer loop. |
| M10 | MAJOR | A | `app/api/chat/route.ts:218-220` (agent 2) | Multi-tool turn persists multiple assistant rows per turn (one per inner iteration). On reload, recipient sees N split bubbles. | Coalesce into a single assistant row per user turn (concatenate `content` arrays from same iteration boundary). |
| M11 | MAJOR | A | `lib/inngest/client.ts` + `nudge-relationships.ts` (agent 7 — but BUILD GREEN) | Inngest `eventType` / `staticSchema` / `cron` confirmed to exist in v4.4.0. **However**: every Inngest send call is wrapped in `try {} catch {}` that only logs → if real failures happen (env unset, signing-key wrong) we won't know. | Surface inngest send failures via logger.error + Sentry breadcrumb, not silent warn. |
| M12 | MAJOR | A | `lib/scrape/pipeline.ts` (agent 7) | No Jina fallback exists despite spec. Browserbase + ZenRows both fail → user gets generic `scrape_failed`. | Add Jina Reader fallback as third tier. |
| M13 | MAJOR | C | `lib/scrape/browserbase.ts:108-131` (agent 7, STATE flagged) | `POST /v1/sessions/{id}/page` is not a documented Browserbase endpoint. Every call 404s, pipeline falls through to ZenRows. We're paying for Browserbase sessions we don't use. | Either (a) get the real endpoint from Browserbase docs / support, or (b) drop Browserbase entirely until we need stateful scraping. Architectural call. |
| M14 | MAJOR | C | `app/api/webhooks/skimlinks/route.ts:47,52-58` (agent 7, STATE flagged) | Skimlinks webhook signature format guessed. First real revenue webhook likely 401s + revenue rows lost. | Need actual Skimlinks docs once account is provisioned. Defer until that point. |
| M15 | MAJOR | A | `lib/jobs/webhook-logger.ts:13-17` (agent 7, AUDIT) | Stripe + Clerk full payloads written to `webhook_log.payload` jsonb. PII (email, billing address) in plaintext forever. | Redact: hash emails, strip address, keep only id/type/created. |
| M16 | MAJOR | A | `lib/jobs/scrape-worker.ts:26-37` (agent 7, AUDIT) | On success, only updates card fields. Doesn't re-wrap affiliate URL with `peekId:cardId` per STATE batch-3 note. Click attribution stays peek-level. | Call `wrapAffiliateLink({peekId, cardId})` post-update. |
| M17 | MAJOR | A | `lib/anthropic/tools/generate_hero_image.ts:12-24` (agent 3, 4, AUDIT) | Dynamic-import string-join workaround (`['@','lib','vibe','evolve'].join('/')`) STILL present after packet 21 merged. `evolveVibe` available as static import everywhere else. Silent no-op via swallow-all catch. | Replace with static `import { scheduleEvolveVibe } from '@/lib/vibe/evolve';`. Drop the COMMENTS.md entry. |
| M18 | MAJOR | A | `lib/vibe/evolve.ts:79-87` (agent 4) | `classifyTone()` writes the enum value (`"playful"`) into `vibe.tone`, but `set_vibe` / presets write descriptive prose (`"breezy, winking, a little silly"`). Note-classify clobbers rich tone with a single word. Field collision. | Classifier output → `vibe.preset` (the field intended for it). |
| M19 | MAJOR | A | `app/build/page.tsx:22-28` (agent 4) | New peeks insert `vibe: {}`. No preset, no palette, no tone seed. Preview is unbranded until `set_vibe` fires. | Seed with `DEFAULT_VIBE` or derive from set_recipient first turn. |
| M20 | MAJOR | A | `app/api/webhooks/clerk/route.ts:67-69` (agent 1) | `user.created` with no primary email returns 200 + skips DB write. First `/build` insert FK-violates on `curator_id`. | Either (a) wait for `user.updated` with primary email, or (b) insert row anyway with email=null. |
| M21 | MAJOR | A | `lib/supabase/{server,service,browser}.ts` (agent 8) | Bang-asserts `env.NEXT_PUBLIC_SUPABASE_URL!` etc. on env vars declared `.optional()`. Missing var → undefined error, not env-validation error. | Tighten `lib/env.ts` to require these for prod (already required for build but not at runtime read). |
| M22 | MAJOR | B | Netlify env vars (orchestrator) | `UPSTASH_REDIS_REST_URL` + `_TOKEN` not set on Netlify. Rate-limit + idempotency fall OPEN (warn-and-allow). Both packet 31 features no-op in prod. | Provision Upstash account + add env vars. Per CLAUDE.md PROD-PARALLEL: do not create new account proactively — surface to user. |
| M23 | MAJOR | A | `next.config.mjs` CSP (agent 8) | `connect-src` missing `https://*.posthog.com`, `https://*.ingest.sentry.io` (tunnelRoute mitigates Sentry, but PostHog session replay would break). | Widen connect-src whitelist. |
| M24 | MAJOR | A | `lib/anthropic/tools/scrape_url.ts:46-67` (agent 3) | Placeholder card defaults to `position: 0` — collides with whatever's already there. Doesn't trigger `scheduleEvolveVibe`. | Compute next position; schedule evolve after insert. |
| M25 | MAJOR | A | `lib/anthropic/tools/reorder_cards.ts:37-46` (agent 3) | N sequential updates with no transaction. Mid-flight failure leaves corrupt ordering. | Single `UPDATE … FROM (VALUES …)` or wrap in `db.transaction`. |
| M26 | MAJOR | A | `app/g/[slug]/page.tsx:170-172` (agent 5) | `AlmostReady` rendered for any non-`published` status, including `claimed`. Recipient who's already opened sees "being prepared" spinner. | Render reveal for both `published` AND `claimed`. |

---

## MINOR — polish, smell, paper-cuts

(Excerpted; full list in agent reports)

- `components/ui/use-toast.ts:9` — `TOAST_REMOVE_DELAY = 1000000` ms. Set to `4000`. (AUDIT, agent 8)
- `app/build/page.tsx:7-9` — 12-hex slug + no retry on unique-violation. Lift to 16+ chars + retry-on-409. (AUDIT, agent 1)
- README claims Next 15 + Tailwind v3. (AUDIT)
- `app/api/upload/route.ts:22-28` — HEIC/HEIF in allowed set but Anthropic can't render. Strip or transcode. (AUDIT)
- `lib/peek/types.ts:1-86` — Vibe shape duplicate of db/schema Vibe, missing `preset` + `signal_source_history` fields. Re-export from schema. (AUDIT, agent 4)
- `lib/peek/types.ts:83` — `DEFAULT_VIBE.tone = 'warm'` not in classifier enum. (agent 4)
- `lib/vibe/classify-tone.ts:28-33` — fires unboundedly on every `set_note` call. No debounce. (agent 4)
- `lib/affiliate/{skimlinks,sovrn}.ts` — wrap URLs use stale endpoints (`skimresources.com`, `viglink.com`). Real Skimlinks uses `go.redirectingat.com`. (agent 7)
- `lib/jobs/nudge-relationships.ts:49-67` — year-arithmetic can overshoot at calendar boundary. (agent 7)
- `proxy.ts:13` — `/api/og/(.*)` allow-listed but route doesn't exist. Stale. (agent 8)
- `lib/retry/withRetry.ts:109` — comment says "jitter" but formula is `base * (1 + Math.random())` (range `[base, 2×base]`), not full-jitter. (agent 8)
- Multiple hero-URL CSS injection sites (`cinematic-reveal`, `hero`, `product-card`, `activity-card`, `aspirational-card`, `gag-card`). Encode-then-inject. (agent 5)
- ReactMarkdown `note-block.tsx:60` — no `urlTransform`. Verify react-markdown 9.x default-blocks javascript: URLs. (agent 5)
- `app/api/checkout/route.ts:79` + `webhook/route.ts:104` — `share_url` built with `env.APP_URL` (currently `peek-gift-vnext.netlify.app`). When DNS cuts over to `peek.gift`, published peeks' `share_url` in DB still points at sandbox. Build lazily. (agent 6)
- `instrumentation-client.ts` PostHog `capture_pageview: 'history_change'` — needs PostHogProvider mounted (blocked by B05). (agent 8)
- `components/build/share-sheet.tsx` — sms/email href schemes silently no-op on desktop. (agent 6)
- `components/auth/custom-sign-up-form.tsx:170` — `<div id="clerk-captcha" />` only renders on first step; Turnstile-required flows may stall. (agent 1)
- `app/api/webhooks/clerk/route.ts:71-79` — `user.deleted` hard-deletes, cascades FK nukes peeks/cards/picks/events. Soft-delete or "deactivated" flag. (AUDIT)
- ~22 hand-rolled `as XxxRow` casts across Supabase consumers — packet 30 was supposed to derive types from Drizzle; needs review. (AUDIT)

---

## ALSO — unrelated finding from the verification build

- `@sentry/nextjs disableLogger` is deprecated in current `@sentry/nextjs@10.x`. Use `webpack.treeshake.removeDebugLogging`. Build warning, not error. Quick patch in `next.config.mjs`.

---

## What's NOT broken (anti-findings, agents checked)

- `proxy.ts` IS the Next 16 middleware convention — works, deploy proves it (`x-clerk-auth-reason` headers present).
- `@clerk/nextjs/legacy` resolves via `dist/types/legacy.d.ts` re-export from `@clerk/react/legacy`.
- Inngest 4.4.0 DOES export `eventType`, `staticSchema`, `cron`.
- `signRecipient()` fail-open is GONE (packet 31 made it throw); `trySign` exists but isn't called by routes — good.
- Stripe webhook signature validation uses `stripe.webhooks.constructEvent` correctly.
- Svix verification on Clerk webhook is canonical.
- `prefers-reduced-motion` respected in cinematic-reveal (just sequenced wrong — see B17).
- OG image has `revalidate = 3600` per packet 34.
- Per-segment `error.tsx` exists for `/build` and `/g/[slug]`.
- RLS migrations 0005 + 0006 applied to live DB. Service-role bypasses; anon can read published/claimed via policy.

---

## Recommended fix sequencing

**Wave 1 — security + import-time blockers** (these are show-stoppers; should land before anyone uses the site)
B01, B02, B03 (pick API + locked-card + variant-group enforcement on server) — one packet
B04 (node-vibrant → deps) — trivial
B05, B06 (Providers + Toaster mount) — one trivial packet
B07, B08 (browser supabase schema + realtime publication migration) — one packet

**Wave 2 — chat flow correctness** (the core experience)
B10, B11, B12 (history persistence + tool-block in client history + system-prompt-context) — one packet
B13 (add_card position race + uniqueIndex) — one packet
B17 (cinematic-reveal timer sequence) — trivial

**Wave 3 — checkout + webhooks**
B09 (publish/share redirect) — one line
B14 (Stripe async payment events) — one packet
B15 (idempotency fail-closed decision) — needs env vars set or arch decision
B16 (mark_ready preconditions) — one packet
B18 (PostHog proxy header passthrough) — one packet

**Wave 4 — MAJOR sweep**
M01-M26 in 2-3 grouped packets by file/area.

**Wave 5 — MINOR sweep**
All minors in one cleanup packet.

---

## Verification status

- ✅ I personally read: `app/layout.tsx`, `components/providers.tsx`, `proxy.ts`, `db/schema/events.ts`, `lib/inngest/client.ts`, atelier package.json, tsconfig.json, partial `app/api/chat/route.ts`, `lib/chat/session.ts` excerpts.
- ✅ I personally verified via `npm install` + filesystem: `@clerk/nextjs/legacy` resolves (re-export chain), Inngest exports exist, `events.kind` is `text` not enum.
- ✅ Live deploy probed via curl: Clerk middleware active, Supabase REST 200s, Stripe webhook 400s on bad sig.
- ⚠️ NOT verified at runtime: every BLOCK and MAJOR finding from agents is structural code analysis. A live driven flow would surface additional bugs.

