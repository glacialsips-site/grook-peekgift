# VERIFIED-STATE — what we actually have, verified directly (2026-05-27)

NOT training data, NOT STATE.md assertions, NOT my drafts — this is the ground truth pulled from Netlify env vars + Supabase MCP + Stripe MCP + URL-AUDIT.md, today. **If anywhere else in SPINE/ or STATE.md conflicts with this file, this file wins.**

## Netlify env vars on `peek-gift-vnext` site (`932646db-e8be-42f1-a94b-a57bb733e308`)

### ✅ Keyed and wired (atelier code uses these)

| Key | Value snippet | Notes |
|---|---|---|
| `APP_URL` | `https://vnext.peek.gift` | Matches Netlify primary URL ✓ |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-d3R21…cAAA` | All 4 contexts (dev/branch/preview/prod) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_PUBLISHABLE_KEY` | `pk_live_Y2xlcmsucGVlay5naWZ0JA` | Both vars, all contexts |
| `CLERK_SECRET_KEY` | `sk_live_K3LO…80LD` | All contexts |
| `CLERK_WEBHOOK_SIGNING_SECRET` | `whsec_caGug…By4A` | All contexts |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `_SIGN_UP_URL` | `/sign-in` / `/sign-up` | ✓ |
| `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_URL` | `https://ewqpujqerdnrkjqlpobo.supabase.co` | Both vars |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_dxaQo6pxBg-…` | **Modern format** (not legacy JWT) ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_9uTU…Ymui` | **Modern format** ✓ |
| `DATABASE_URL` | `postgresql://postgres.ewqpujqerdnrkjqlpobo:…@aws-1-us-east-1.pooler.supabase.com:6543/postgres` | Pooler connection |
| `SUPABASE_STORAGE_BUCKET` / `PEEK_V2_STORAGE_BUCKET` | `peek-v2-assets` | Both vars (probably one redundant) |
| `STRIPE_SECRET_KEY` | `sk_live_51T4xnb…` | All contexts |
| `STRIPE_PUBLISHABLE_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_51T4xnb…` | Both vars |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xzM4NYP…nJ2w` | vNext webhook signing secret |
| `STRIPE_PRICE_ID` | `price_1TapZICEKPUsVee1ddG4n14M` | The $12 publish-gate price |
| `PAY_MODE` | `live` | NOT mock |
| `STRIPE_ADAPTIVE_PRICING` | `on` | Feature flag — Adaptive Pricing IS on |
| `RESEND_API_KEY` | (secret) | ✓ |
| `NOTIFICATIONS_FROM` | `peek.gift <info@peek.gift>` | ✓ |
| `BROWSERBASE_API_KEY` + `BROWSERBASE_PROJECT_ID` | (secret) / `5221d287-330d-4b19-806a-2103ad8d28f9` | ✓ |
| `ZENROWS_API_KEY` | (secret) | ✓ |
| `GUEST_CLAIM_TOKEN_SECRET` | (64-char hex) | ✓ — **audit assumed missing, was wrong** |
| `ADMIN_CLERK_USER_IDS` | `user_3Doj78byqwXP3goPCZVNdFMM9l7` | Frank's admin Clerk ID |
| `NODE_VERSION` | `22` | ✓ |

### ❌ NOT keyed (code wires them, runtime no-ops or falls open)

| Key | Impact |
|---|---|
| `FAL_KEY` | Image gen + scrape pipeline (packet 22) silently no-ops |
| `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` | All 3 background jobs (nudge, scrape-worker, webhook-logger) silently no-op |
| `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST` | All analytics + LLM observability silently no-op |
| `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` | Sentry build-wrapped but runtime gets no DSN; source-maps not uploaded |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Rate-limit + Stripe idempotency fall-OPEN (BUGS M22 + B15) |
| `SKIMLINKS_PUBLISHER_ID` + `SKIMLINKS_WEBHOOK_SECRET` | `wrapAffiliateLink()` returns direct URL (no revenue) |
| `SOVRN_API_KEY` | Sovrn fallback never fires |
| `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM_NUMBER` + `TWILIO_WHATSAPP_FROM` | SMS share returns `sms_not_configured` |
| `TOLT_API_KEY` | Creator referral program no-op |

### 🟡 Legacy / kept for compatibility (DO NOT DELETE)

| Key | Reason |
|---|---|
| `VITE_APP_URL` = `https://peek.gift` | Legacy peek.gift Vite site |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Legacy site |
| `VITE_CLERK_PUBLISHABLE_KEY` | Legacy site |
| `VITE_GOOGLE_PLACES_API_KEY` | Legacy site (Frank dropping vNext dependency; key stays for legacy) |
| `VITE_USE_MOCK_API=false` | Legacy |
| `GOOGLE_PLACES_API_KEY` | Used by atelier `app/api/scrape` currently; Frank dropping vNext dependency; key stays |
| `CLERK_SIGN_IN_URL` = `https://accounts.peek.gift/sign-in` | Probably legacy; verify atelier doesn't read this — atelier uses `NEXT_PUBLIC_CLERK_SIGN_IN_URL` |
| `SECRETS_SCAN_OMIT_KEYS` = `GOOGLE_PLACES_API_KEY,VITE_GOOGLE_PLACES_API_KEY` | Build-time secret-scan exemption — keep |

### ⚪ Feature flag env vars (semantic unclear — need to grep code)

| Key | Value | TODO |
|---|---|---|
| `ITEM_SCRAPE` | `real` | Grep atelier for usage — likely gates real-scrape vs mock |
| `ITEM_VISION` | `real` | Grep atelier — likely gates Vision API vs mock |
| `GUEST_CHECKOUT_MODE` | `open` | Grep — Stripe Checkout permissiveness flag? |

## Stripe account `acct_1T4xnbCEKPUsVee1` (Frank DeAndino)

### Products (verified via MCP)
- `prod_UZzXnuYuX4ud15` — "peek.gift vNext — Standard" — service. **The vNext product. Price `price_1TapZICEKPUsVee1ddG4n14M` is wired in env.**
- `prod_UQqlb4e5Ti9zYL` — "peek.gift Standard" — service. **Legacy product, used by current peek.gift Vite site.**
- 8 other products (`prod_UJb…` series): **Glacial Sips RO water filtration products. NOT peek.gift — they belong to Frank's other business sharing this Stripe account.**

### Webhooks (verified via URL-AUDIT.md commit `4950686`)
- `we_1Tb7PhCEKPUsVee1Jz6Kcxkb` — `https://peek-gift-vnext.netlify.app/api/stripe/webhook` — enabled — **only listens to `checkout.session.completed`**. ❗
- `we_1TRbB2CEKPUsVee1Qh084LCz` — `https://peek.gift/api/payment-webhook` — enabled — 9 events incl. `checkout.session.*`, `payment_intent.*`, `charge.dispute.*`. **Legacy webhook for the peek.gift Vite site.** Untouched.

❗ **vNext webhook needs MANY more event subscriptions to support every Stripe payment method** (BUGS B14 in Wave 1 captured the start of this — `checkout.session.async_payment_succeeded`/`failed` for BNPL/ACH/Klarna). Likely full list per Frank's "all of it" direction:
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.updated`
- `customer.created` (for Customer Portal)
- `invoice.paid` (when Subscriptions ship)
- `customer.subscription.updated` (when Subscriptions ship)

Webhook URL also has the drift `peek-gift-vnext.netlify.app` vs primary `vnext.peek.gift` (URL-AUDIT.md).

### Stripe Dashboard owner-tasks (per STATE.md — STATUS UNKNOWN, Frank to confirm)
1. Stripe Tax activation (Dashboard → Tax → Settings → Activate)
2. Business profile completion (legal entity, tax ID, MCC)
3. `tax_code` set on `prod_UZzXnuYuX4ud15` (suggest `txcd_10103001` Digital services general)
4. Origin state tax registration
5. Adaptive Pricing — **`STRIPE_ADAPTIVE_PRICING=on` env var exists but doesn't guarantee account is configured**

If checkout fires with `automatic_tax: true` BEFORE Tax is dashboard-activated, Session creation throws. Either Frank already did #1-#4, or test checkout will 400. Worth verifying with a test payment.

## Supabase project `ewqpujqerdnrkjqlpobo`

- Name: "frank.deandino@gmail.com's Project Gift"
- Region: us-east-1
- Postgres: 17.6.1
- Status: ACTIVE_HEALTHY

### Extensions INSTALLED (verified via MCP)
- `plpgsql` 1.0 (default)
- `pgcrypto` 1.3
- `uuid-ossp` 1.1
- `supabase_vault` 0.3.1
- `pg_stat_statements` 1.11

### ❗ Extensions claimed WIRED in CAPABILITY_INVENTORY but NOT installed
- **`vector` (pgvector) 0.8.0 — AVAILABLE but NOT INSTALLED.** CAPABILITY_INVENTORY §D3 incorrectly said WIRED. **MUST FIX.** No embeddings / semantic search code can run today.
- `pg_cron`, `pg_net`, `pgmq`, `postgis`, `wrappers` — all available but not installed. Fine since Inngest covers scheduling.

### peek_v2 tables (live data 2026-05-27)
- `users` — 3 rows
- `peeks` — 22 rows (built peeks)
- `cards` — 33 rows
- `variant_groups` — 10 rows
- `picks` — 0 rows (no recipient interaction yet)
- `peek_collaborators` — 0 rows (collab not used)
- `relationships` — 0 rows (collab feature not used)
- `events` — 230 rows
- `affiliate_revenue` — 0 rows (no revenue yet)
- `chat_messages` — 255 rows
- `webhook_log` — 0 rows
- `usage_ledger` — 150 rows
- `tier_config` — 0 rows
- ✓ RLS enabled on every table

### Storage buckets (per CLAUDE.md + Netlify env)
- `peek-v2-assets` (vNext bucket, image MIME allowlist, 10MB max)
- `gift-assets` (legacy bucket, no restrictions)

## Clerk account state (NOT directly verified this turn; from STATE + URL-AUDIT)

- Instance: `ins_3D5VaoJxcxztJvjkHUanDEMdFWG`
- Frontend API: `https://clerk.peek.gift`
- Accounts portal: `https://accounts.peek.gift`
- Plan: free/pro (allowlist NOT enforced — `allowed_origins: null` per URL-AUDIT)
- Single domain (not satellite, not multi-domain)
- OAuth apps: none configured
- Fallback URLs all point at LEGACY `peek.gift` apex (DRIFT — fixed in code with `<ClerkProvider>` props per `54b7eb8`)

## Inventory misses caught (CAPABILITY_INVENTORY.md needs fixing)

These claims in CAPABILITY_INVENTORY are wrong vs verified state:

| Section | Wrong claim | Reality | Fix |
|---|---|---|---|
| §D3 pgvector | ✅ WIRED | NOT INSTALLED | Change to 💡 NET-NEW (install via Supabase MCP `apply_migration` when actually needed) |
| §E10 PostHog | 🟡 PARTIAL | Keys missing — silently no-op | Change to 🔴 KEYED-NOT-USED (code wired, no keys) |
| §E11 Inngest | ✅ WIRED | Keys missing — jobs silently no-op | Change to 🔴 KEYED-NOT-USED |
| §E12 Sentry | ✅ WIRED | DSN missing — runtime gets no errors reported | Change to 🔴 KEYED-NOT-USED |
| §J checklist | "Confirm Clerk `vnext.peek.gift` is an authorized origin" | Clerk allowlist not enforced on plan | Remove line; replaced by `<ClerkProvider>` props fix already shipped (`54b7eb8`) |
| §J checklist | "`GUEST_CLAIM_TOKEN_SECRET` ≥32 chars" | Already set (64-char hex) | Remove line |
| Several refs to Google Places | Frank dropped Stripe Address Element covers it | Inventory updater removed; verify no residual refs |

Plus: every vendor I marked "Tier 0" that requires a key from Frank — verify whether the **code** is wired (a key just gets switched on) versus **net-new code** is needed.

## Speculative items in CAPABILITY_INVENTORY that need Frank's sanity check

These are "Google Places candidates" — things I included that Frank may not actually need. Each is currently in the inventory; Frank's call to keep or drop:

| Section | Item | Why it might be unneeded |
|---|---|---|
| §G3 | Mapbox / Google Maps SDK (activity maps) | If text address line is enough, no map renderer needed |
| §G2 | Apple Music API ($99/yr Apple Developer) | Spotify covers song cards; Apple parity is luxury |
| §F4 | LiveKit / Daily (real-time voice rooms) | Only matters if co-curators want voice chat WHILE building together |
| §F5 | Mux / Cloudflare Stream / Bunny (longer video hosting) | Supabase Storage handles short clips; pay-per-stream may not be needed |
| §A13 | MCP Connectors — Google Calendar / Drive / Gmail / Notion | Power-curator hooks; cool but not core to "make any idiot build this page" |
| §A10 | Anthropic Code Execution tool | Marginal use case (date math, currency conversion) |
| §G14 | Canva API | Power-curator design import — probably skip entirely |
| §G12 | Pinterest API | Mood-board inbound + curator-board outbound — speculative |
| §G13 | Instagram Basic Display | Photo inbound — speculative |
| §G11 | Ayrshare / Buffer ($29-49/mo) | Social outbound auto-post — Tier 2, skip from MVP? |
| §G15 | Lottiefiles | Reveal accents — Framer Motion + CSS may cover this fine |
| §G16 | Resend Audiences | Marketing broadcasts — post-launch |
| §C9-C12 | Stripe Connect / Identity / Subscriptions / Invoices | Only needed when creator program / KYC / recurring gifts / corporate billing ship — defer? |
| §E3 fal.ai LipSync + video gen | LipSync ("hero photo speaks") | Cool but is image gen enough for v0? |

If Frank wants to trim, mark which to drop. Default if no response: KEEP them in the inventory but explicitly tag as "Tier 2 / future / decide-later" so dispatch packets don't assume them.
