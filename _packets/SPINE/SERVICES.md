# SERVICES — master inventory of every sub-service, account state, and key location

Single source of truth for: every external service peek.gift uses, whether the account exists, what env vars hold the keys, where the keys are stored, and current runtime status.

**Key storage strategy:** All production keys live as **Netlify env vars on `peek-gift-vnext` site (`932646db-e8be-42f1-a94b-a57bb733e308`)**, scoped per-context (production/branch-deploy/deploy-preview/dev), marked `is_secret: true` where appropriate. Netlify is the canonical vault. Supabase Vault extension is installed but unused (could hold DB-access keys later — Tier 2). Anthropic Credentials Vault is for Managed Agents (not in use). **Do not duplicate keys across vaults; Netlify is it.**

**Status legend:**
- 🟢 LIVE — account exists, keys set, code works
- 🟡 STUB — code wired with graceful no-op (deploy succeeds, feature unavailable until keyed)
- 🔴 BLOCKED — account exists, key missing, feature broken
- ⚪ TBD — no account, signup pending Frank

---

## Master table

| # | Service | Purpose | Account | Required env vars | Status | Notes |
|---|---|---|---|---|---|---|
| **1** | **Anthropic** | Curator AI chat, Vision, web_search, web_fetch, code_execution, Memory, Files API, Skills, Extended Thinking | Peek.Gift org `ebe4a13c…` | `ANTHROPIC_API_KEY` | 🟢 LIVE | Tier 1 rate limit. **Frank action: enable Web Search at platform.claude.com → Settings → Privacy** (unlocks web_search server tool + affiliate_search fallback). |
| **2** | **Clerk** | Auth, sessions, lifecycle webhooks, custom UI (no Clerk branding) | `clerk.peek.gift` instance `ins_3D5VaoJxcxztJvjkHUanDEMdFWG` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` | 🟢 LIVE | Plan doesn't enforce origin allowlist (verified). `<ClerkProvider>` redirect props shipped per `54b7eb8`. Shared with legacy peek.gift site. |
| **3** | **Stripe** | $12 publish-gate checkout, Tax, Adaptive Pricing, webhooks | `acct_1T4xnbCEKPUsVee1` (Frank DeAndino) | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID=price_1TapZICEKPUsVee1ddG4n14M`, `PAY_MODE=live`, `STRIPE_ADAPTIVE_PRICING=on` | 🟢 LIVE | Tax ACTIVE (NJ origin registered). Webhook `we_1Tb7PhCEKPUsVee1Jz6Kcxkb` → `vnext.peek.gift/api/stripe/webhook`, 12 events subscribed (fixed via API this session). Tax code on product is `txcd_10000000` General; `txcd_10103001` Digital is better — minor optimization. |
| **4** | **Supabase** | Postgres (peek_v2 schema), Storage, Realtime, RLS | Project `ewqpujqerdnrkjqlpobo` (us-east-1, Postgres 17.6) | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (modern `sb_publishable_*`), `SUPABASE_SERVICE_ROLE_KEY` (modern `sb_secret_*`), `DATABASE_URL` (pooler), `SUPABASE_STORAGE_BUCKET=peek-v2-assets`, `PEEK_V2_STORAGE_BUCKET=peek-v2-assets` | 🟢 LIVE | RLS enabled on all 13 peek_v2 tables. pgvector AVAILABLE but NOT installed — `CREATE EXTENSION vector;` when semantic-search packet ships. Storage bucket `peek-v2-assets` (vNext) and `gift-assets` (legacy). |
| **5** | **Resend** | Transactional email (share notifications, payment receipts) | account-level (Frank's) | `RESEND_API_KEY`, `NOTIFICATIONS_FROM="peek.gift <info@peek.gift>"` | 🟢 LIVE | DKIM for `peek.gift` apex verified. No inbound webhook wired. |
| **6** | **Browserbase** | Stateful headless browser scraping (tier 1) | account `info.glacialsips@gmail.com` (Frank's) | `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID=5221d287-330d-4b19-806a-2103ad8d28f9` | 🟡 BROKEN-ENDPOINT | Per BUGS M13 the endpoint in our scrape code 404s every call. ZenRows handles ~100% of real traffic via the fallback path. Decision pending: fix the endpoint or drop Browserbase. |
| **7** | **ZenRows** | Scrape fallback (tier 2) — handles all production scrape today | account-level | `ZENROWS_API_KEY` | 🟢 LIVE | Working. |
| **8** | **fal.ai** | Image gen (Flux), video gen, LipSync (Tier 1) | account-level (Frank's) | `FAL_KEY` | 🟢 LIVE | Keyed this session. Image gen via `lib/image-gen/fal.ts` works on next deploy. Video + LipSync via fal models — Tier 1. |
| **9** | **PostHog** | Analytics, Session Replay, Feature Flags, Experiments, LLM Observability | org `peekgift` org-id `019e4938-…`, project `Default project` id `434015` | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com` | 🟢 LIVE | Keyed this session. Note BUGS M23: `next.config.mjs` CSP needs `https://*.posthog.com` added to `connect-src` for Session Replay to function (1-line fix pending). |
| **10** | **Sentry** | Error tracking, performance monitoring, source-map upload | org `peekgift` org-id `4511426433646592` (Frank's, confirmed) | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG=peekgift`, `SENTRY_PROJECT=peek-gift-vnext` (or whatever Frank names it) | 🔴 BLOCKED — account exists, no DSN keyed | Need: Sentry Dashboard → Project Settings → Client Keys (DSN). Plus Settings → Auth Tokens → create with `project:read`, `project:releases`, `org:read`. Code wraps via `withSentryConfig` already; runtime no-ops without DSN. |
| **11** | **Twilio** | SMS share, WhatsApp share, Voice, Verify | TBD | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `TWILIO_WHATSAPP_FROM` | ⚪ TBD | SMS share via `app/api/share/send/route.tsx` returns `sms_not_configured` until keyed. WhatsApp sender approval = 2-7 day Twilio vetting after signup. Stubs cleanly. |
| **12** | **Inngest** | Durable background jobs (nudge-relationships, scrape-worker, webhook-logger) | TBD — app id `peek-gift-vnext` | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | ⚪ TBD | All 3 jobs silently no-op without keys. Signup at inngest.com → app `peek-gift-vnext`. Stubs cleanly. |
| **13** | **Upstash Redis** | Rate-limit, Stripe webhook idempotency, presence | TBD | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | 🔴 BLOCKED — degrades to fail-OPEN | BUGS M22 + B15: without these, rate-limit allows all + Stripe webhook idempotency check returns `firstSeen: true` → duplicate events possible. Free-tier database is 30sec signup. |
| **14** | **Skimlinks** | Affiliate outbound URL wrap (25k+ retailer coverage), revenue webhook | TBD — application pending | `SKIMLINKS_PUBLISHER_ID`, `SKIMLINKS_WEBHOOK_SECRET` | 🟡 STUB → web_search fallback | Without keys, `affiliate_search` tool falls back to Anthropic `web_search` per packet 41. Affiliate URLs return unwrapped (no commission) until Skimlinks approves. 1-3 day approval at skimlinks.com/publishers/join. |
| **15** | **Sovrn** | Affiliate fallback for retailers Skimlinks doesn't cover | TBD — application pending | `SOVRN_API_KEY` | 🟡 STUB | Same fallback pattern as Skimlinks. |
| **16** | **Deepgram** | Voice STT (speech → text) for mic mode | TBD — $200 free credit on signup | `DEEPGRAM_API_KEY` | 🟡 STUB → voice mode hidden | Voice mode mic button hidden behind feature flag until keyed. signup at deepgram.com. |
| **17** | **ElevenLabs** OR **Cartesia** | Voice TTS (text → speech) for narrator/reveal | TBD | `ELEVENLABS_API_KEY` (or `CARTESIA_API_KEY`) | 🟡 STUB → voice mode hidden | Same flag as Deepgram. Pick one: ElevenLabs (more voices) or Cartesia (lower latency). |
| **18** | **Google Places** | (DROPPED — Frank's call: Stripe Address Element covers autosuggest; Viator/OpenTable cover activity search) | account-level (Frank's) | `GOOGLE_PLACES_API_KEY`, `VITE_GOOGLE_PLACES_API_KEY` | 🟢 KEYED-NOT-USED (vNext) | Keys still active for legacy peek.gift Vite site. Don't delete — legacy depends on them. |
| **19** | **Tolt** OR **Rewardful** | Creator referral program (Stripe-native) | TBD — Tier 1 strategic | `TOLT_API_KEY` (or Rewardful equivalent) | ⚪ TBD | Defer until product is shipping. ~$49-99/mo. Couples to Stripe Connect for payouts. |
| **20** | **Spotify Web API** | Song cards (digital card type) | TBD — free OAuth | `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | ⚪ TBD | Free, 5-min signup. developer.spotify.com → Create App. Tier 1. |
| **21** | **TMDB** | Movie/TV cards (digital card type) | TBD — free | `TMDB_API_KEY` | ⚪ TBD | Free, instant signup. Tier 1. |
| **22** | **YouTube oEmbed** | Video card embed | none — free oEmbed | none | ⚪ NO-KEY-NEEDED | Tier 1, just an HTTP call. |

---

## Tier 1 — slow-approval retailer + travel affiliates (start signups now, approvals take 1-2 weeks)

These are direct integrations needed because they're NOT in Skimlinks' coverage. Frank's job to apply; orchestrator wires them as their keys arrive.

| # | Service | Purpose | Required env vars (when approved) | Application URL |
|---|---|---|---|---|
| **A1** | Amazon Associates / SiteStripe | Amazon product affiliate (Amazon NOT in Skimlinks) | `AMAZON_ASSOCIATE_TAG` | affiliate-program.amazon.com |
| **A2** | Apple Performance Partners | App Store / iTunes / Music / Books / Podcasts | `APPLE_AFFILIATE_TOKEN`, `APPLE_AFFILIATE_CAMPAIGN` | apple.com/itunes/affiliates |
| **A3** | Walmart Affiliate (via Impact) | Walmart retail | `IMPACT_API_KEY`, `WALMART_AFFILIATE_ID` | walmart.com/affiliates |
| **A4** | Target Affiliates (via Impact) | Target retail | shares Impact creds with A3 | target.com/affiliates |
| **A5** | eBay Partner Network | eBay listings | `EBAY_CAMPAIGN_ID` | partnernetwork.ebay.com |
| **A6** | Viator | Tours/experiences (Tripadvisor's tours) | `VIATOR_API_KEY` | viator.com/affiliate |
| **A7** | OpenTable Affiliate | Restaurant reservations | `OPENTABLE_AFFILIATE_TOKEN` | opentable.com/affiliates |
| **A8** | Booking.com Partner Hub | Hotel/lodging | `BOOKING_AFFILIATE_AID` | partner.booking.com |
| **A9** | Expedia Group Partner | Hotels + flights + cars + activities | `EXPEDIA_API_KEY` | developers.expediagroup.com |
| **A10** | GetYourGuide Partner | Tours (Viator alternative, often better international rates) | `GETYOURGUIDE_PARTNER_ID` | partner.getyourguide.com |
| **A11** | TripAdvisor Affiliate | Reviews + bookings | `TRIPADVISOR_AFFILIATE_TOKEN` | tripadvisor.com/affiliates |
| **A12** | Airbnb Affiliate | Lodging | `AIRBNB_AFFILIATE_TOKEN` | airbnb.com/affiliates |
| **A13** | Ticketmaster Partner Network | Event tickets | `TICKETMASTER_API_KEY` | partner.ticketmaster.com |
| **A14** | SeatGeek Affiliate | Event tickets alternative | `SEATGEEK_PARTNER_ID` | seatgeek.com/partners |
| **A15** | StubHub Affiliate | Event tickets alternative | `STUBHUB_AFFILIATE_TOKEN` | partners.stubhub.com |

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

**Canonical store: Netlify env vars on `peek-gift-vnext` site.** Already there. Already secret-marked where appropriate. Per-context scoping (production / branch-deploy / deploy-preview / dev). Read via `process.env.*` in `atelier/lib/env.ts` with zod validation.

**Reading keys** (orchestrator session): via Netlify MCP `manage-env-vars` with `getAllEnvVars: true`.

**Writing keys** (orchestrator session): via Netlify MCP `manage-env-vars` with `upsertEnvVar: true` + appropriate `envVarIsSecret` flag.

**Not used as key stores (and why):**
- **Supabase Vault** (extension installed) — overkill for env vars; useful if/when we need application-encrypted-at-rest secrets accessible from Postgres RPCs.
- **Anthropic Credentials Vault** — bound to Managed Agents, which we don't use.
- **Git repo** — NEVER. Keys in code or `.env` checked into git is what `SECRETS_SCAN_OMIT_KEYS` exists to flag.

**Key rotation cadence:** ad-hoc when issues arise. No scheduled rotation in MVP.

---

## What's BLOCKED on Frank vs what's stubbed

**Frank action required (blocks features but NOT deploy):**

1. Sentry DSN + auth token (#10) — get from Sentry Dashboard. Without it errors silently log to console.
2. Anthropic web_search admin enable — `platform.claude.com → Settings → Privacy`. Without it `affiliate_search` falls back to empty results.
3. Upstash signup + 2 env vars (#13) — without it rate-limit + Stripe idempotency fall OPEN (allow everything). Not breaking but real risk under load.

**Frank action that unlocks features (deploy works regardless):**

4. Deepgram + ElevenLabs (#16, #17) — voice mode mic button hidden until both keyed.
5. Skimlinks + Sovrn applications (#14, #15) — affiliate search falls back to web_search; revenue is zero until approved.
6. Twilio (#11) — SMS share button hidden.
7. Inngest (#12) — background nudges + birthday detect don't fire.
8. Spotify / TMDB / YouTube etc. (#20-22 + A1-A15) — those card types simply not surfaced in `add_card` dropdown until keyed.

**Bottom line:** with current keys (Anthropic + Clerk + Stripe + Supabase + Resend + Browserbase + ZenRows + FAL + PostHog + Google Places), the site renders end-to-end. Curators can build a peek, pay $12, recipient can pick, share via email + native share. Voice, SMS, affiliate revenue, background nudges, error tracking come online as keys arrive.

---

_Last updated: 2026-05-27. Update when any service moves status (🟢/🟡/🔴/⚪)._
