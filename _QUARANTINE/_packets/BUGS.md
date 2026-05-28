# BUGS — peek.gift vNext bug ledger

_Recompiled 2026-05-27. Trunk `atelier-integration` @ `cbbab1d`. Site live at `peek-gift-vnext.netlify.app`. This is the operational source of truth — scan it in 60 seconds, know what's actionable. Wave 1 packets are in flight closing out the IN-PROGRESS-WAVE1 list (parallel sessions; do not redispatch). The carry-forward STILL OPEN set is the basis for next-wave priorities._

## How to read this

Each finding: `[ID] severity | scope | file:line — what breaks — what fixes it`
- **severity**: BLOCK (flow halts for user) / MAJOR (silent fail / wrong data / cost burn) / MINOR (smell / polish)
- **scope**: A=code patch / B=migration or env / C=needs architectural decision

---

## FIXED since prior compilation (03dc7c2 → cbbab1d)

These verified-FIXED on current trunk; do not redispatch. Evidence column cites current-trunk file:line.

| ID | What was broken | Evidence on trunk |
|----|-----------------|-------------------|
| B01 | `recipientSessionId` taken from request body, not signed cookie — total impersonation | `app/api/pick/route.ts` now uses `readRecipientSessionFromCookies()`; body field ignored |
| B02 | No server check of `card.is_locked` / `unlock_rule.kind === 'beg'` | `app/api/pick/route.ts:132-168` enforces beg / requires_picks / date_after / event lock rules |
| B17 | Cinematic-reveal timer phase order math broken (note before name) | `components/recipient/cinematic-reveal.tsx:38-40` math correct; phase order hero → name → note → cards → done |
| M17 | Dynamic-import string-join hack for `evolveVibe` in `generate_hero_image` | Now a static import; the prior BUGS.md entry was STALE — see ANTI-FINDINGS |
| M26 | `AlmostReady` rendered on `claimed` peeks → recipient sees spinner instead of reveal | `app/g/[slug]/page.tsx:161-163` renders reveal for both `published` AND `claimed` |
| MIN | `TOAST_REMOVE_DELAY = 1000000` ms | `components/ui/use-toast.ts:9` is now `4000` |

---

## IN-PROGRESS-WAVE1 (do NOT redispatch — parallel sessions own these)

Fourteen items currently being fixed in parallel Wave 1 packets. Verify on return; do not re-add to dispatch.

| ID | Sev | File:line | What breaks |
|----|-----|-----------|-------------|
| B04 | BLOCK | `package.json:73` | `node-vibrant` in `devDependencies` → Netlify prod build skips it → hero palette extraction `MODULE_NOT_FOUND` |
| B05 | BLOCK | `app/layout.tsx` + `components/providers.tsx` | `<Providers>` never imported → QueryClient/theme/PostHog/toast all silently broken |
| B06 | BLOCK | `components/ui/toaster.tsx` mount sites | `<Toaster />` only mounted in `recipient-view.tsx` → curator surface toasts go into the void |
| B07 | BLOCK | `lib/supabase/browser.ts:9-13` | Browser Supabase client missing `db: { schema: 'peek_v2' }` → realtime + browser fetch hit `public.*` (no tables) |
| B08 | BLOCK | live DB | No migration adds `peek_v2.picks` to `supabase_realtime` publication → realtime delivers nothing |
| B09 | BLOCK | `app/build/[peekId]/publish/share/page.tsx:85` | Redirects to non-existent `/publish/checkout` route → 404 on non-published peek |
| B11 | BLOCK | `components/build/chat-pane.tsx:338-347` | Client strips `tool_use` blocks from history → model loses tool memory; tool-only last turn → Anthropic 400 |
| B12 | BLOCK | `lib/anthropic/chat.ts:52` + `app/api/chat/route.ts:189-194` | `systemPromptOptions` never passed from route → curator-name + peek-summary always "(unknown)" / "(empty)" |
| B13 | BLOCK | `lib/anthropic/tools/add_card.ts` + `add_variant_group.ts` | `position` read-then-increment; parallel tool_use blocks collide silently |
| B14 | BLOCK | `app/api/stripe/webhook/route.ts:66-69` | Only handles `checkout.session.completed`; Link/ACH/Klarna fire `async_payment_succeeded` → curator stuck on spinner |
| M07 | MAJOR | `app/api/chat/route.ts:266-271` + `chat.ts:85-91` | `turn_end` fires per inner-loop iteration, not per user turn → cursor flickers across multi-tool turns |
| M09 | MAJOR | `app/api/chat/route.ts` + `chat.ts` | No `AbortSignal` plumbed → tab close → server streams + runs tools for full 300s → Anthropic/Browserbase/fal.ai cost burn |
| M18 | MAJOR | `lib/vibe/evolve.ts:79-87` | `classifyTone()` writes enum value into `vibe.tone`, but presets write descriptive prose → field collision |
| M19 | MAJOR | `app/build/page.tsx:22-28` | New peeks insert `vibe: {}` — no preset, no palette, no tone seed → unbranded preview until `set_vibe` fires |

---

## STILL OPEN (carry-forward — next-wave candidates)

### BLOCK / data-loss

| ID | Sev | Scope | File:line | What breaks | Fix |
|----|-----|-------|-----------|-------------|-----|
| B10 | BLOCK | A | `app/api/chat/route.ts:217-233` + `lib/anthropic/chat.ts` | **PARTIAL: user message persist now fixed**; mid-stream assistant content STILL lost on error. Stream error mid-flight → user sees streamed reply, reload loses it. | Persist assistant content from `chatTurn` on the error path. Surface persist failures as SSE error events. |
| B15 | BLOCK | A | `app/api/stripe/webhook/route.ts:55-62` + `lib/security/idempotency.ts:16` | Idempotency fails OPEN when Redis missing — `firstSeen: true` returned. Stripe retry storm → duplicate analytics + emails. | (a) make Upstash hard-required for prod, or (b) enforce status short-circuit on every event-type branch. Plus actually set Upstash env on Netlify (see M22). |
| B16 | BLOCK | A | `lib/anthropic/tools/mark_ready_for_publish.ts:13-32` | No state-machine check. Re-fires `peek_marked_ready` regardless of current status; re-surfaces paywall on already-published peek. No precondition assertion (recipient / vibe / hero / note / ≥1 card). | Guard with status enum check + precondition assertions; idempotent no-op if already ready/published. |
| B18 | BLOCK | A | `app/api/posthog/[...path]/route.ts:19-27` | PostHog proxy strips `x-forwarded-for`, `cf-connecting-ip`, cookies, `referer` → wrong geo, broken session-recording cookies. | Forward those headers; whitelist instead of blacklist. |

### MAJOR

| ID | Sev | Scope | File:line | What breaks | Fix |
|----|-----|-------|-----------|-------------|-----|
| M03 | MAJOR | A | `app/api/share/send/route.tsx:24-32` | `destination: z.string().min(3)` flat → SMS gets phone-like garbage, email gets non-emails; Twilio/Resend reject downstream. | Discriminated union on `channel`. |
| M04 | MAJOR | A | `app/api/share/send/route.tsx:64-70` + `components/build/share-sheet.tsx:72-78` | `share_initiated` fires both server-side AND client-side for SMS/email → double-counted; other channels client-only. | Pick one side. Recommend client-only fire (consistent across all channels). |
| M08 | MAJOR | A | `app/api/chat/route.ts` + `lib/anthropic/chat.ts:49` | Client-supplied `model` accepted with `z.string().min(1)`, passed straight to Anthropic. No allowlist → cost exfil + arbitrary model selection. | Allowlist enum: sonnet-4.6 / opus-4.7. Default sonnet. |
| M10 | MAJOR | A | `app/api/chat/route.ts:218-220` | Multi-tool turn persists N assistant rows (one per inner iteration). On reload, recipient sees N split bubbles. | Coalesce into a single assistant row per user turn (concatenate `content` arrays from same iteration boundary). |
| M11 | MAJOR | A | `lib/inngest/client.ts` + `nudge-relationships.ts` | Every Inngest send wrapped in `try {} catch {}` that only logs → real failures (env unset, signing-key wrong) silent. | Surface send failures via `logger.error` + Sentry breadcrumb. |
| M15 | MAJOR | A | `lib/jobs/webhook-logger.ts:13-17` | Full Stripe + Clerk payloads written to `webhook_log.payload` jsonb. PII (email, billing address) in plaintext forever. | Redact: hash emails, strip address, keep only id/type/created. |
| M16 | MAJOR | A | `lib/jobs/scrape-worker.ts:26-37` | On success, only updates card fields. Doesn't re-wrap affiliate URL with `peekId:cardId` per STATE batch-3 note. Click attribution stuck peek-level. | Call `wrapAffiliateLink({peekId, cardId})` post-update. |
| M20 | MAJOR | A | `app/api/webhooks/clerk/route.ts:67-69` | `user.created` with no primary email returns 200 + skips DB write → first `/build` insert FK-violates on `curator_id`. | (a) wait for `user.updated` with primary email, or (b) insert row with email=null. |
| M21 | MAJOR | A | `lib/supabase/{server,service,browser}.ts` | Bang-asserts `env.NEXT_PUBLIC_SUPABASE_URL!` on env vars declared `.optional()` → missing var → undefined error, not env-validation error. | Tighten `lib/env.ts` to require these for prod runtime read. |
| M22 | MAJOR | B | Netlify env vars | `UPSTASH_REDIS_REST_URL` + `_TOKEN` not set on Netlify → rate-limit + idempotency fall OPEN (warn-and-allow). Both packet 31 features no-op in prod. | **Per CLAUDE.md PROD-PARALLEL: surface to user; do not provision account proactively.** Once user OKs, add creds via Netlify MCP. |
| M23 | MAJOR | A | `next.config.mjs` CSP | `connect-src` missing `https://*.posthog.com`, `https://*.ingest.sentry.io` — PostHog session replay would break (tunnelRoute mitigates Sentry). | Widen connect-src whitelist. |
| M24 | MAJOR | A | `lib/anthropic/tools/scrape_url.ts:46-67` | Placeholder card defaults to `position: 0` → collides with existing cards. Doesn't trigger `scheduleEvolveVibe`. | Compute next position; schedule evolve after insert. |
| M25 | MAJOR | A | `lib/anthropic/tools/reorder_cards.ts:37-46` | N sequential updates with no transaction. Mid-flight failure leaves corrupt ordering. | Single `UPDATE … FROM (VALUES …)` or wrap in `db.transaction`. |

### MAJOR — needs architectural call / external info

| ID | Sev | Scope | File:line | What breaks | Fix |
|----|-----|-------|-----------|-------------|-----|
| M13 | MAJOR | C | `lib/scrape/browserbase.ts:108-131` | `POST /v1/sessions/{id}/page` not a documented Browserbase endpoint. Every call 404s; pipeline falls through to ZenRows. Paying for unused sessions. | (a) get real endpoint from docs/support, or (b) drop Browserbase until stateful scraping needed. |
| M14 | MAJOR | C | `app/api/webhooks/skimlinks/route.ts:47,52-58` | Skimlinks webhook signature format guessed → first real revenue webhook likely 401s + revenue rows lost. | Need actual Skimlinks docs once account provisioned. Defer until then. |

### MINOR — polish, smell, paper-cuts

- `app/build/page.tsx:7-9` — 12-hex slug + no retry on unique-violation. Lift to 16+ chars + retry-on-409.
- README claims Next 15 + Tailwind v3 (actually Next 16 + Tailwind v4).
- `app/api/upload/route.ts:22-28` — HEIC/HEIF in allowed set but Anthropic can't render. Strip or transcode.
- `lib/peek/types.ts:1-86` — Vibe shape duplicate of db/schema Vibe, missing `preset` + `signal_source_history` fields. Re-export from schema.
- `lib/peek/types.ts:83` — `DEFAULT_VIBE.tone = 'warm'` not in classifier enum.
- `lib/vibe/classify-tone.ts:28-33` — fires unboundedly on every `set_note` call. No debounce.
- `lib/affiliate/{skimlinks,sovrn}.ts` — wrap URLs use stale endpoints (`skimresources.com`, `viglink.com`). Real Skimlinks uses `go.redirectingat.com`.
- `lib/jobs/nudge-relationships.ts:49-67` — year-arithmetic can overshoot at calendar boundary.
- `proxy.ts:13` — `/api/og/(.*)` allow-listed but route doesn't exist. Stale.
- `lib/retry/withRetry.ts:109` — comment says "jitter" but formula is `base * (1 + Math.random())` (range `[base, 2×base]`), not full-jitter.
- Multiple hero-URL CSS injection sites (`cinematic-reveal`, `hero`, `product-card`, `activity-card`, `aspirational-card`, `gag-card`). Encode-then-inject.
- `note-block.tsx:60` — no `urlTransform` on ReactMarkdown. Verify react-markdown 9.x default-blocks `javascript:` URLs.
- `app/api/checkout/route.ts:79` + `webhook/route.ts:104` — `share_url` built with `env.APP_URL` at write time. When DNS cuts to `peek.gift`, published peeks' `share_url` in DB still points at sandbox. Build lazily.
- `instrumentation-client.ts` PostHog `capture_pageview: 'history_change'` — needs PostHogProvider mounted (was blocked by B05; verify once Wave 1 lands).
- `components/build/share-sheet.tsx` — sms/email href schemes silently no-op on desktop.
- `components/auth/custom-sign-up-form.tsx:170` — `<div id="clerk-captcha" />` only renders on first step; Turnstile-required flows may stall.
- `app/api/webhooks/clerk/route.ts:71-79` — `user.deleted` hard-deletes, cascades FK nukes peeks/cards/picks/events. Soft-delete or "deactivated" flag.
- ~22 hand-rolled `as XxxRow` casts across Supabase consumers — packet 30 was supposed to derive types from Drizzle; needs review.
- `app/api/checkout/route.ts:114-127` (M01 carryover) — `adaptive_pricing: { enabled: true }` not set on Checkout Session despite STATE saying it's on. International curators pay USD. Add the field.
- `app/api/checkout/route.ts:121` (M02 carryover) — `cancel_url` returns curator to `/build/[peekId]` with zero signal they cancelled. Append `?checkout=cancelled`; chat-pane toasts on detect.
- `app/api/chat/route.ts:99-118` (M05 carryover) — anon turn cap keyed on client-controlled `sessionId` (localStorage). Clear storage → fresh 5 turns. Per-IP bucket via Upstash; compose with sessionId.
- `lib/anthropic/chat.ts:68,147` (M06 carryover) — `MAX_TOOL_ITERATIONS=10` silently returns. UI cursor clears via `turn_end`; user sees half-built peek, no warning. Append synthetic `is_error: true` tool_result + emit `notice` SSE event.
- `lib/scrape/pipeline.ts` (M12 carryover) — no Jina fallback exists despite spec. Add Jina Reader as third tier.
- `@sentry/nextjs disableLogger` deprecated in `@sentry/nextjs@10.x`. Use `webpack.treeshake.removeDebugLogging`. Build warning, not error.

---

## ANTI-FINDINGS — claims that turned out NOT to be bugs

Preserved from prior compilation; do not act on these.

- `proxy.ts` IS the Next 16 middleware convention — works, deploy proves it (`x-clerk-auth-reason` headers present). Agent 1's claim was wrong.
- `@clerk/nextjs/legacy` resolves via `dist/types/legacy.d.ts` re-export from `@clerk/react/legacy`. Typecheck + build green.
- Inngest 4.4.0 DOES export `eventType`, `staticSchema`, `cron`. Agent 7's claim was wrong.
- `events.kind` is `text('kind').notNull()` (free-form), not a strict enum. Agent 3's `palette_extract_scheduled` panic was misplaced.
- `signRecipient()` fail-open is GONE (packet 31 made it throw); `trySign` exists but isn't called by routes — good.
- Stripe webhook signature validation uses `stripe.webhooks.constructEvent` correctly.
- Svix verification on Clerk webhook is canonical.
- `prefers-reduced-motion` respected in `cinematic-reveal`.
- OG image has `revalidate = 3600` per packet 34.
- Per-segment `error.tsx` exists for `/build` and `/g/[slug]`.
- RLS migrations 0005 + 0006 applied to live DB. Service-role bypasses; anon can read published/claimed via policy.
- **NEW (2026-05-27): M17 in prior BUGS.md was STALE.** The dynamic-import string-join hack in `lib/anthropic/tools/generate_hero_image.ts` was already replaced by a static import. Don't dispatch.
- **NEW: B03 was dropped from this compilation.** Re-verify before re-adding: prior claim was no `pick_all` enforcement + no unique constraint on `(peek_id, card_id, recipient_signature)`. Confirm status of variant-group enforcement and unique index in current `app/api/pick/route.ts` + `db/schema/picks.ts` before reopening.

---

## Recommended next wave priorities

Picked for the upcoming Insta ad ramp — these are the items that cost real money, lose real data, or look broken to real users. Pick 5–7 from this list for Wave 2:

1. **B15** — Stripe webhook idempotency fail-OPEN. With ad-driven traffic, retry storms during a Stripe incident → duplicate analytics, duplicate emails, public credibility hit. Combine with **M22** (provision/wire Upstash). One packet.
2. **B16** — `mark_ready_for_publish` no state-machine / no preconditions. Curators can re-trigger paywall on already-published peeks; model can short-circuit publish without recipient/vibe/hero/note/cards. Direct revenue bug.
3. **B18** — PostHog proxy strips client headers → all ad-attribution geo data wrong, session-recording cookies broken. Need this BEFORE the ad ramp or campaign data is unusable.
4. **M08** — chat API model allowlist. Ad-driven traffic + accepting client-supplied model = direct cost exfil. Trivial fix; ship it.
5. **M15** — webhook_log PII redaction. Plaintext email + billing address in DB forever is a compliance landmine once ad traffic brings non-toy users.
6. **M11** — Inngest silent send failures. Once nudge/scrape jobs matter, we need to know when they're failing. Ad ramp will surface this fast and we won't see it.
7. **B10 (residual)** — mid-stream assistant content lost on error. With increased traffic, intermittent stream errors become routine; users will hit reloads and lose curated work.

Hold for Wave 3 (architectural / external-dependent):
- **M13** Browserbase endpoint — needs vendor docs.
- **M14** Skimlinks signature — defer until account provisioned.
- **M20** Clerk `user.created` no-email — edge case; consequences are FK errors, but only on a narrow path.
- **M21** env bang-asserts — true once prod env is consistent; surface for cleanup pass.

Minors: roll into one cleanup packet after Wave 2 lands.
