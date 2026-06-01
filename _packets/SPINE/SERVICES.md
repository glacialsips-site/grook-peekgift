# SERVICES — master inventory of every sub-service, account state, and key location

Single source of truth for: every external service peek.gift uses (or has a concrete path to use), whether the account exists, what env vars hold the keys, where the keys are stored, and current runtime status.

**Trim policy (2026-05-28):** speculative retailer + travel + music + creator-affiliate entries moved to `IDEAS-LATER.md`. This table lists ~10 services peek.gift USES today + ~6 that need keys to unblock Tier 0. If a service isn't in either bucket, it lives in `IDEAS-LATER.md` until Frank flips it on.

**Key storage strategy:** All production keys live as **Netlify env vars on `peek-gift-vnext` site (`932646db-e8be-42f1-a94b-a57bb733e308`)**, scoped per-context (production/branch-deploy/deploy-preview/dev), marked `is_secret: true` where appropriate. Netlify is the canonical vault.

**Status legend:**
- 🟢 LIVE — account exists, keys set, code works
- 🟡 STUB — code wired with graceful no-op (deploy succeeds, feature unavailable until keyed)
- 🔴 BLOCKED — account exists, key missing, feature broken
- ⚪ TBD — no account, signup pending Frank

---

## Master table — what peek.gift USES + what unblocks Tier 0

| # | Service | Purpose | Account | Required env vars | Status | Notes |
|---|---|---|---|---|---|---|
| **1** | **Anthropic** | Curator AI chat, Vision, web_search, Memory, Files API, Skills, Extended Thinking | Peek.Gift org `ebe4a13c…` | `ANTHROPIC_API_KEY` | 🟢 LIVE | Tier 1 rate limit. **Frank action: enable Web Search at platform.claude.com → Settings → Privacy** (unlocks web_search server tool + affiliate_search fallback). |
| **2** | **Clerk** | Auth, sessions, lifecycle webhooks, custom UI (no Clerk branding) | `clerk.peek.gift` instance `ins_3D5VaoJxcxztJvjkHUanDEMdFWG` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` | 🟢 LIVE | Plan doesn't enforce origin allowlist. `<ClerkProvider>` redirect props shipped per `54b7eb8`. Shared with legacy peek.gift site. |
| **3** | **Stripe** | $12 publish-gate checkout, Tax, Adaptive Pricing, webhooks | `acct_1T4xnbCEKPUsVee1` (Frank DeAndino) | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID=price_1TapZICEKPUsVee1ddG4n14M`, `PAY_MODE=live`, `STRIPE_ADAPTIVE_PRICING=on` | 🟢 LIVE | Tax ACTIVE (NJ origin registered). Webhook `we_1Tb7PhCEKPUsVee1Jz6Kcxkb` → `vnext.peek.gift/api/stripe/webhook`. Tax code on product `txcd_10000000` General; `txcd_10103001` Digital is better — minor optimization. |
| **4** | **Supabase** | Postgres (peek_v2 schema), Storage, Realtime, RLS | Project `ewqpujqerdnrkjqlpobo` (us-east-1, Postgres 17.6) | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (pooler), `SUPABASE_STORAGE_BUCKET=peek-v2-assets`, `PEEK_V2_STORAGE_BUCKET=peek-v2-assets` | 🟢 LIVE | RLS enabled on all 13 peek_v2 tables. pgvector AVAILABLE but NOT installed — `CREATE EXTENSION vector;` when semantic-search packet ships. |
| **5** | **Resend** | Transactional email (share notifications, payment receipts) | account-level (Frank's) | `RESEND_API_KEY`, `NOTIFICATIONS_FROM="peek.gift <info@peek.gift>"` | 🟢 LIVE | DKIM for `peek.gift` apex verified. |
| **6** | **ZenRows** | Scrape — handles ~100% of production scrape today | account-level | `ZENROWS_API_KEY` | 🟢 LIVE | Working. Browserbase deferred to `IDEAS-LATER.md` (endpoint broken per BUGS M13; ZenRows covers everything). |
| **7** | **fal.ai** | Image gen (Flux), video gen, LipSync (Tier 1) | account-level (Frank's) | `FAL_KEY` | 🟢 LIVE | **Keyed this session.** Image gen via `lib/image-gen/fal.ts` works on next deploy. |
| **8** | **PostHog** | Analytics, Session Replay, Feature Flags, Experiments, LLM Observability | org `peekgift`, project id `434015` | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com` | 🟢 LIVE | **Keyed this session.** BUGS M23 CSP fix already closed; `next.config.mjs` `connect-src` includes `https://*.posthog.com`. |
| **9** | **Upstash Redis** | Rate-limit, Stripe webhook idempotency, presence | account-level (Frank's) | `UPSTASH_REDIS_REST_URL=https://probable-lemur-138225.upstash.io`, `UPSTASH_REDIS_REST_TOKEN` | 🟢 LIVE | **Keyed this session.** Closes BUGS M22 + B15 once code reads these env vars. |
| **10** | **Netlify** | Deploy host | site `peek-gift-vnext` `932646db-e8be-42f1-a94b-a57bb733e308` | (env vars stored here) | 🟢 LIVE | Primary URL `vnext.peek.gift`. Cutover plan in `CUTOVER.md`. |
| **11** | **Sentry** | Error tracking, performance, source-map upload | org `peekgift` org-id `4511426433646592` (Frank's, confirmed) | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG=peekgift`, `SENTRY_PROJECT=peek-gift-vnext` | 🔴 BLOCKED — account exists, no DSN keyed | Get from Sentry Dashboard → Project Settings → Client Keys (DSN) + Settings → Auth Tokens (with `project:read`, `project:releases`, `org:read`). Code wraps via `withSentryConfig`; runtime no-ops without DSN. |
| **12** | **Twilio** | SMS share, WhatsApp share | TBD | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `TWILIO_WHATSAPP_FROM` | ⚪ TBD | SMS share returns `sms_not_configured` until keyed. WhatsApp sender approval 2-7 day vetting. Voice / Verify / Studio / Lookup / Conversations deferred to `IDEAS-LATER.md`. |
| **13** | **Inngest** | Durable background jobs (nudge-relationships, scrape-worker, webhook-logger) | TBD — app id `peek-gift-vnext` | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | ⚪ TBD | All 3 jobs silently no-op without keys. Signup at inngest.com → app `peek-gift-vnext`. |
| **14** | **Deepgram** | Voice STT (speech → text) for mic mode | TBD — $200 free credit on signup | `DEEPGRAM_API_KEY` | 🟡 STUB → voice mode hidden | Voice mode mic button hidden behind feature flag until keyed. |
| **15** | **ElevenLabs** OR **Cartesia** | Voice TTS (text → speech) for narrator/reveal | TBD | `ELEVENLABS_API_KEY` (or `CARTESIA_API_KEY`) | 🟡 STUB → voice mode hidden | Pick one: ElevenLabs (more voices) or Cartesia (lower latency). |
| **16** | **Skimlinks** | Affiliate outbound URL wrap | TBD — DEMOTED per Frank | `SKIMLINKS_PUBLISHER_ID`, `SKIMLINKS_WEBHOOK_SECRET` | 🟡 STUB → web_search fallback | Frank 2026-05-28: "we don't have affiliates right now." Demoted from Tier 0. `affiliate_search` tool falls back to Anthropic `web_search`. Apply when affiliates matter. |
| **17** | **Sovrn** | Affiliate fallback | TBD — DEMOTED per Frank | `SOVRN_API_KEY` | 🟡 STUB | Same demotion as Skimlinks. |
| **18** | **Google Places** | (DROPPED — Stripe Address Element covers autosuggest) | account-level (Frank's) | `GOOGLE_PLACES_API_KEY`, `VITE_GOOGLE_PLACES_API_KEY` | 🟢 KEYED-NOT-USED (vNext) | Keys still active for legacy peek.gift Vite site. Don't delete — legacy depends on them. |
| **19** | **Jina Reader** | Long-tail markdown scrape fallback (per BUGS M12) | TBD — free tier | none keyed yet | 🟡 STUB | Third-tier fallback when ZenRows + Browserbase fail. |

---

## Netlify sites under Frank's account (verified via MCP)

| Site name | Site ID | Primary URL | Purpose | Status |
|---|---|---|---|---|
| `peek-gift-vnext` | `932646db-e8be-42f1-a94b-a57bb733e308` | `https://vnext.peek.gift` | **The vNext build (THIS spine)** | 🟢 LIVE — current deploy `6a1755fcd81d650008fe52dd` |
| `peek-gift` | `69732dcb-659b-49a7-9d27-88184818bcd8` | `https://peek.gift` | Legacy production Vite site | 🟢 LIVE — keep running until cutover |
| `peekgift-v9k-modular-sandbox` | `2ded0f9d-47d6-4f22-8e03-4ac9acba0f86` | `peekgift-v9k-modular-sandbox.netlify.app` | Old sandbox | ⚪ unused — can delete |
| `peekgift-v1-sandbox` | `740fbbe2-2577-4f1b-8613-7e0812a629dd` | `peekgift-v1-sandbox.netlify.app` | Old sandbox | ⚪ unused — can delete |
| `grook-peekgift` | `e20f2cd9-47e4-4d06-bd90-b9757abe88c2` | `grook-peekgift.netlify.app` | Unused | ⚪ unused — can delete |

---

## Key storage strategy

**Canonical store: Netlify env vars on `peek-gift-vnext` site.** Per-context scoping (production / branch-deploy / deploy-preview / dev). Read via `process.env.*` in `atelier/lib/env.ts` with zod validation.

**Reading keys** (orchestrator session): Netlify MCP `manage-env-vars` with `getAllEnvVars: true`.
**Writing keys**: Netlify MCP `manage-env-vars` with `upsertEnvVar: true` + appropriate `envVarIsSecret` flag.

**Not used as key stores:** Supabase Vault (overkill); Anthropic Credentials Vault (bound to Managed Agents, unused); Git repo (NEVER — `SECRETS_SCAN_OMIT_KEYS` exists to flag).

**Key rotation cadence:** ad-hoc when issues arise. No scheduled rotation in MVP.

---

## What's BLOCKED on Frank vs what's stubbed

**Frank action required (blocks features but NOT deploy):**

1. Sentry DSN + auth token (#11) — get from Sentry Dashboard. Errors silently log to console without it.
2. Anthropic web_search admin enable — `platform.claude.com → Settings → Privacy`. Without it `affiliate_search` falls back to empty results.

**Frank action that unlocks features (deploy works regardless):**

3. Deepgram + ElevenLabs (#14, #15) — voice mode mic button hidden until both keyed.
4. Twilio (#12) — SMS share button hidden.
5. Inngest (#13) — background nudges don't fire.
6. Skimlinks + Sovrn applications (#16, #17) — affiliate search falls back to web_search; revenue zero. **Demoted per Frank — not blocking ship.**

**Bottom line:** with current keys (Anthropic + Clerk + Stripe + Supabase + Resend + ZenRows + fal.ai + PostHog + Upstash + Google Places), the site renders end-to-end. Curators can build a peek, pay $12, recipient can pick, share via email + native share. Voice, SMS, affiliate revenue, background nudges, error tracking come online as keys arrive.

---

## What lives in IDEAS-LATER.md (not in this table)

Don't add the following without Frank's go:
- Travel APIs (Viator, OpenTable, Booking, Expedia, Airbnb, TripAdvisor, GetYourGuide, Ticketmaster, SeatGeek, StubHub)
- Major-retailer direct affiliates (Amazon, Apple, Walmart, Target, eBay)
- Music/video integrations (Spotify, Apple Music, TMDB, YouTube oEmbed, Pinterest, Instagram, Canva)
- Real-time voice/video hosting (LiveKit/Daily, Mux/Cloudflare/Bunny)
- Lottiefiles, Mapbox
- Creator affiliate (Tolt/Rewardful)
- Twilio Voice / Verify / Studio / Lookup / Conversations
- Browserbase (endpoint broken; ZenRows covers everything)

---

_Last updated: 2026-05-28. Update when any service moves status (🟢/🟡/🔴/⚪) or graduates from IDEAS-LATER._
