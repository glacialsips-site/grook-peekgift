# ASSET MAP — the gold, by capability (harvested across all 147 branches)

The point of this file: you are NOT missing code. Across the branches there is a
production-grade implementation of nearly every capability the product needs. The
problem has never been "can't build it" — it's that the work is **spread across ~4
competing architectures and was never assembled into one closed loop.** This map says,
for each capability, WHERE the best version lives, so it can be assembled or cleanly
re-used in a rewrite.

## The architectures (the thrash, in order)
1. **packet-01…40 (05-25)** → fully ABSORBED into the atelier line. Original bootstrap. No standalone value.
2. **atelier line (05-28→29)** — single Next.js app under `atelier/`. The MOST COMPLETE, deployed line.
   - `atelier-integration` (dec5312) = packet-absorbed base.
   - `intelligent-brahmagupta-WsoSb` = the integrated FEATURE tip (Stripe, usage, security, anon, moderation, landing).
   - `peek-clean` (033a64b, 05-29) = atelier HEAD +37 commits: the GRAMMAR ENGINE + spine + multi-vertical refactor. Cleanest tree. The true frontier of this line.
   - feeder branches: `bold-ride`, `research/depth-layer-ux`, `lt/*`.
3. **jolly-mccarthy (05-31)** — vibe-harmony OKLCH (keep) + vibe-genome/resolve generator (drop).
4. **gallant-planck (06-02)** — event-sourced monorepo: `packages/core` Zod `PeekDocument` + neverthrow `decide/apply` + 17 tests; closes renderer gaps. The "robust" line.
5. **studio → clean-slate (06-03/04)** — the FREEFORM-HTML pivot: monorepo `apps/web`+`packages/core`, Claude writes the page as HTML in a sandboxed iframe (the SEAT-zip magic). Newest/cleanest, BUT trimmed away much of the atelier backend (rules/security/moderation/scrape).
6. **gallant-shannon (06-04)** — a "grook" mobile chat UI shell + `clerk-safe` fail-soft auth.

## Verified live reality (Chapter-0 ground truth)
- Netlify deploy READY at vnext.peek.gift. Supabase live: **50 peeks, 380 chat msgs, 0 picks, 0 payments — the loop has never closed.**
- Only revenue ever = the **legacy Vite app** (31+ charges); vNext = $0; the live Stripe webhook still points at legacy.
- vNext `PAY_MODE` defaults to `mock` → publishes for free. Sentry dead (no DSN). CI red (last runs on atelier-integration).

## THE ASSET INVENTORY (capability → best source `branch:path` → note)

### Chat / streaming brain
- `feat-sse-peek-update-live-preview:atelier/lib/anthropic/streaming.ts` + `chat.ts` + `app/api/chat/route.ts` — normalized SSE streaming generator + agent tool-loop + production SSE route. The streaming spine.
- `wave1-chat-infra` — AbortSignal→safeClose client-disconnect cleanup.
- `wave1-chat-history-toolblocks` — preserves `tool_use` blocks in assistant history (required for valid multi-turn tool calls).
- `feat-curator-tools-batch:atelier/lib/anthropic/progress-block.ts` — injects authoritative live peek-state each iteration (state discipline). Top nugget.
- `feat-curator-tools-batch` TOOL_REGISTRY self-registering tool pattern (zod+JSON schema+handler+desc per tool).

### System prompt + voice/persona engine
- `feat-prompt-rewrite-and-voice:atelier/lib/anthropic/system-prompt.ts` — strongest persona prompt: banned-phrases, 7-dial voice engine (warmth/humor/pace/formality/emoji/vocab/length), calibration scenarios, occasion recipes. Static block `cache_control: ephemeral` + dynamic suffix.
- `fix-prompt-state-and-silent-failure` — state-discipline / silent-failure ("never narrate upstream failures; pivot naturally") / voice-enforcement sections.
- NOTE: "voice" = tone dials, NOT mic input. Mic/STT is aspirational (only a `MicButton` UI shell exists on `gallant-shannon`).

### Prompt caching (≈90% input savings)
- `feat-prompt-cache-hit-rate` (5ead551) — KEY: a <1024-token static block falls under Anthropic's ephemeral-cache floor → zero cache reads. Fix: pad static block to ~1.5–2k tokens + a SECOND breakpoint `cache_control: ephemeral` on the LAST tool. Verified via `observability.ts` `cache_read_input_tokens`.

### Rules engine (the defensible core) — COMPLETE, server-side
- `feat-rules-engine-and-pick-security:atelier/app/api/pick/route.ts` — full enforcement: card↔peek ownership, taunt(unpickable), 4 unlock kinds (beg/date_after/event/requires_picks w/ dependency check), published-gate, variant-group semantics (pick_one evicts siblings, pick_all cascades), distinct error codes. (Hardened further on `intelligent-brahmagupta`.)
- `…:atelier/db/schema/cards.ts` — discriminated `UnlockRule` union + variant_groups selection types. The rules data model.
- GAP: the one-shot `set_rules_template.ts` chat tool is a STUB (`not_implemented_yet`); rules are composed via the (working) add_variant_group/update_card/lock tools.

### Security layer (zero-trust) — production-grade
- `feat-rules-engine-and-pick-security` / `intelligent-brahmagupta` / `feat/reveal-magazine-cover`:
  - `atelier/lib/security/recipient.ts` — HMAC-signed recipient session cookie, `timingSafeEqual`, fail-closed. **Anon recipient identity without Clerk.**
  - `lib/security/origin.ts` (CSRF allowlist), `lib/security/idempotency.ts` (Redis SET-nx; ⚠️ B15: fails OPEN if Redis missing → Stripe-retry dupes — fix to fail-closed for payments), `lib/security/client-ip.ts`, `lib/rate-limit/redis.ts` (Upstash limiters, all endpoints).
- `wave1-5-css-url-escape:atelier/lib/security/css-url.ts` — CSS-injection/XSS guard on scraped image URLs. CARRY.
- `bugfix-client-env-leak:atelier/lib/env-client.ts` + `wave1-5-env-tightening` — client/server env split so server zod never enters client bundle.

### Moderation (launch gate)
- `feat-content-moderation-haiku:atelier/lib/anthropic/moderation.ts` — Haiku, prompt-cached, injection-hardened, 10 categories, per-field calibration, fail-open, telemetry. CAVEAT: text-only (no image moderation).

### Ingestion — the "add anything" hub
- `feat-scrape-cascade-and-image-fallback:atelier/lib/scrape/pipeline.ts` — 4-tier Browserbase→ZenRows→Jina→Anthropic web_fetch, 45s timeout, always returns a `degraded` stub (never throws).
- `feat/scrape-jsonld-preflight:atelier/lib/scrape/extract.ts` — `parseJsonLdProduct` zero-cost JSON-LD path BEFORE any LLM call. Prefer this version.
- `feat-image-upload-pipeline:atelier/app/api/upload/route.ts` + `lib/image-gen/rehost.ts` + `fal.ts` — upload + rehost + Flux client.
- `feat-hero-image-quality-recovery:atelier/lib/anthropic/tools/generate_hero_image.ts` — vibe-enriched Flux hero gen, immediate CDN url + background rehost, fail-soft fallback.
- `fix-palette-extraction-quality-guard:atelier/lib/vibe/palette-quality.ts` — WCAG/L-spread/saturation gate; `extract-palette.ts` returns null→preset on reject. (`wave1-node-vibrant-deps`: move node-vibrant to deps.)

### Notification (money loop) — WIRED (fires from pick route, the correct trigger)
- `feat-curator-pick-notification:atelier/lib/email/notify-curator-picks.ts` + `lib/email/send.ts` (Resend + withRetry) + `templates/curator-picks-notification.tsx`. Dedup once-per-recipient-session via `events` row.

### Design / vibe engine — see CONFLICT RESOLUTION below
- Grammar engine (`bold-ride`/`research/depth-layer-ux`/`peek-clean`): `atelier/lib/vibe/grammar/{oklch,engine,presets,grammar,schema,css-vars,bridge}.ts` — OKLCH contrast-derive-until-AA, `generateAndRepair` + `SAFE_DEFAULT` "never-broken" guarantee, 40 presets + 22-occasion taxonomy, adversarially fuzz-tested. + `_packets/SPINE/skills/occasion-templates/*.md` (10 playbooks).
- Runtime theming (`patch-gabagool`/`feat/vibe-css-vars`): `atelier/components/peek-vibe-provider.tsx` — Vibe→CSS-vars live morph. KEEP.
- `jolly-mccarthy:packages/vibe-harmony` — OKLCH color math (culori) as accessibility safety-net. KEEP. Its `vibe-resolve`/`vibe-genome` generator — DROP.

### Cinematic reveal (the "gift moment")
- `feat/reveal-magazine-cover:atelier/lib/reveal/phases.ts` — pure, deterministic, fully-tested phase planner (hero→name→occasion→note→cards→done, vibe.motion multiplier, reduced-motion aware). + `components/recipient/cinematic-reveal.tsx` (framer-motion choreography) + card components (`card-deck`, `product/gag/aspirational/activity` cards, `note-block`, `beg-sheet`). The hardest-won, most rewrite-survivable asset.

### Usage metering / tiers / admin (billing brain)
- `feat-usage-ledger-peek-id:atelier/lib/usage/{cost,throttle,record,tier,tiers,tier-config}.ts` + `db/migrations/0008+0009` + `db/schema/usage.ts` — per-vendor + cache-aware Anthropic cost math, ledger-summed fail-open throttle, 8 tiers, indexed schema. + `atelier/app/admin/*` dashboard (`requireAdmin`).

### Anon → auth deferral + claim (a hard flow the owner did NOT call "easy")
- `feat-anon-flow-deferred-auth:atelier/lib/auth/server.ts` (anon-session cookie) + `app/build/[peekId]/page.tsx` (atomic claim-on-first-authed-visit) + `lib/chat/session.ts` (ANON_TURN_CAP=5) + SSE `tier_limit_reached`/`anon_signup_required` wall.
- `fix/anon-flow-blockers:atelier/app/api/chat/route.ts` `classifyUpstreamError()` + the only unit TESTS for this flow.

### Bookends (owner says "easy, later" — but the assets exist)
- Landing: `feat-landing-page-rich:atelier/components/landing/*` (hero, showcase w/ 3 themed mock cards, how-it-works, why-different, final-cta) + `app/layout.tsx` 6-font setup.
- Auth: atelier custom headless Clerk (brahmagupta/affectionate-tesla) + `wave1-5-clerk-no-email:app/api/webhooks/clerk/route.ts` (svix verify + idempotent + null-email handling) + `gallant-shannon:lib/clerk-safe.ts` (fail-soft wrappers).

### Checkout (the money) — best parts, scattered
- `feat-stripe-embedded-checkout` — embedded Checkout Session with FULL i18n: `adaptive_pricing`, `automatic_tax`, `tax_id_collection`, Address Element, promo codes. = "every non-sanctioned country," basically done. Webhook only handles `checkout.session.completed`.
- `wave1-stripe-async-payments` — best webhook: adds `async_payment_succeeded/failed` + reverts peek to draft on failure.
- `intelligent-brahmagupta:atelier/lib/stripe/*` — coupon validation, customer, appearance, browser.

### Optional architecture pieces
- Event-sourcing core: `gallant-planck:packages/core` (Zod doc + decide/apply + 17 tests). Adopt only if you want maker-checker undo/replay.
- Edge-safe primitives: `lt/edge-plumbing:atelier/lib/anthropic-edge/*` + `lib/db-edge/*`.
- Curator memory: `memory-nav-test-001:atelier/db/schema/curator_memory.ts` + `0013`.
- Multi-vertical/brand: `proof/config-swap` + `feat/brand-config:atelier/components/renderer/page-state.ts` (PageBrand block) — one engine, two verticals (gift + GlacialSips), PROVEN.
- Generic retry: `atelier/lib/retry/withRetry.ts` — status-aware, Retry-After, backoff+jitter, AbortSignal. Grab first.

### Spec / intel docs (drive the rewrite)
- `inventory-concepts:_packets/CONCEPT-INVENTORY.md` — file/line WIRED/PARTIAL/STUB/ABSENT map. The single best "what exists" doc.
- `chore/state-update-frank-todo:_packets/SPINE/FRANK-TODO.md` — the owner's own blocker list + intent (affiliates demoted, enable web_search, set Stripe tax_code, apex cutover steps).
- `audit/bugs-wave2:_packets/BUGS-WAVE2.md`, `audit/ui-quality-2026-05-28:…UI-QUALITY-AUDIT…md`, `chore/live-state-smoke-eb1f164-final:…LIVE-STATE-SMOKE.md` — heed these bug lists.
- Preserve the `worktree-agent-a89c9d…:prototypes/mobile-vibe-gallery/` (40 presets rendered on a real phone, self-hosted fonts, screenshots, contrast manifest) — honest mobile design proof.

## Carry-forward bug fixes (real defects; don't reintroduce)
CSS-URL XSS escape · card-position unique index + atomic reorder (`wave1-position-race`+`wave1-5-reorder-atomic`) · `mark_ready` preconditions (`wave1-5-mark-ready-preconditions`) · providers/toaster mount (`wave1-providers-toaster`) · posthog header forwarding (`wave1-5-posthog-headers`) · server-side `tool_result` history strip fix (W08) · idempotency-fail-OPEN→closed for Stripe (B15) · model allowlist on client-supplied model (M08) · Clerk no-email FK fix (M20, = the anon `/build` 500).

## DESIGN-ENGINE CONFLICT — resolution
Two agents disagreed: one said "drop the deterministic grammar engine"; two called it "the moat's heart." Both are right about different halves. RESOLUTION: KEEP the grammar engine's **OKLCH contrast-repair + `generateAndRepair` never-broken safety-net** and its **40-preset library as a SEED PANTRY the model is shown** — DROP only the part where the model is FORCED to pick exclusively from the enumerated presets/knobs (the closed vocabulary = the generic-maker). Net: model authors the vibe FREELY; the grammar layer seeds it and guarantees it's never broken/ugly. (This is exactly what the BUILD-BOOK wanted; the disagreement was vocabulary.)

## SECURITY (flag, not lecture)
Two sets of LIVE keys are in git history: (1) `research/depth-layer-ux:_packets/SPINE/VERIFIED-STATE.md` — `sk_live` Stripe, `sk_live` Clerk, Supabase service-role, `DATABASE_URL`, Anthropic key. (2) `lt/setup-concierge` concierge doc — Netlify admin PAT + fal key. ROTATE these. Do not copy into any new repo.
Also: subagents twice claimed current model ids (`claude-sonnet-4-6`/`-haiku-4-5`/`-opus-4-7`) were "fake" — they are REAL (4.6/4.5 current, 4.7 now legacy → 4.8). Stale-training error; ignore it.

## HORSE RECOMMENDATION (money-first)
You have all the parts. The fastest path to the first dollar is to ride the **most-complete
line (the atelier frontier: `intelligent-brahmagupta` features + `peek-clean` grammar/spine)**
— rules engine + security + moderation + scrape + image + usage + anon + reveal + notification
+ real Stripe are ALL built and deployed (~80%). Assemble the tip, wire the $12 checkout LIVE
(flip PAY_MODE, lift `feat-stripe-embedded-checkout` i18n + `wave1-stripe-async-payments`
webhook), cut the Stripe webhook over from the legacy site, ship. First dollar in days.
Fold the freeform-HTML magic (clean-slate) and the clean monorepo in as v2 AFTER cash flows —
chasing the prettier architecture before the first dollar is the exact pattern that emptied
the bank three times. (Owner to ratify — freeform-vs-structured is his creative call.)
