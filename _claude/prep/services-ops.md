# SERVICES + OPS + DEPLOY — the canonical truth (CTO prep)

> Read-only mining of the shared tree. Produced 2026-06-08. Cites `branch:path` + quotes real text.
> Secret VALUES are NEVER printed — names + presence + key-prefix only.
> Classification: **CURRENT** = freshest verified evidence · **OLD/SUPERSEDED** = stale or replaced.
>
> **Source-of-truth ranking used here (per `_claude/notes/RECON-FINDINGS.md` TRUST SET, 2026-06-08):**
> 1. `_claude/notes/RECON-FINDINGS.md` / `ASSET-MAP.md` / `SESSION-HANDOFF.md` — today's 7-agent recon (NEWEST, live-checked).
> 2. `atelier-integration:_packets/SPINE/VERIFIED-STATE.md` — the only doc grounded in a live Netlify/Supabase/Stripe MCP env read (2026-05-27); self-declares "If anywhere else conflicts with this file, this file wins."
> 3. `studio-vnext`/`gallant-planck` `_packets/SPINE/GROUND-TRUTH.md` (2026-06-02) — live Supabase/Stripe MCP, but NO Netlify read (connector offline).
> 4. `atelier-integration:_packets/SPINE/{SERVICES,CUTOVER,FRANK-TODO,STATE}.md` — narrative state.
>
> **The single most important fact a CTO must hold:** there are 3+ parallel codebases. The numbers (IDs, env vars, accounts) are IDENTICAL across all of them — **same Netlify project, same Stripe acct, same Supabase project, same Clerk app, zero key migration between them** (`atelier-integration:_packets/SPINE/CUTOVER.md`: "Same Netlify project, same Clerk app, same Stripe account, same Supabase project, same everything. Zero key migration. Zero user migration."). What differs is *which branch the deploy points at* and *whether the money path is wired*.

---

## 0. THE ONE-SCREEN TRUTH

- **Live deploy** = Netlify site `peek-gift-vnext` (`932646db-e8be-42f1-a94b-a57bb733e308`) → `https://vnext.peek.gift`, building branch **`atelier-integration`** via a GitHub Actions → Netlify **build hook** (NOT the native git connector). Last verified deploy: `6a17a230…` / commit `eb1f164`, published 2026-05-28, `/` returns 200.
- **The two newer "finalist" branches (`gallant-planck-pu51x` 06-02, `studio-vnext`/`clean-slate` 06-04) are NOT deployed.** Their `netlify.toml` is a *different, untested monorepo config* (`base = apps/web`, pnpm). Going live on them = a manual Netlify production-branch repoint + a first-build debug (`gallant-planck:_packets/SPINE/DEPLOY.md`: "first-draft monorepo config I could not test against Netlify").
- **Revenue truth:** vNext has earned **$0** — `picks`=0, `webhook_log`=0, `product:'peek.gift_vnext'` charges=0. The **only** money ever made is on the **LEGACY peek.gift Vite app** (a *separate repo*, separate Netlify site `peek-gift` `69732dcb-…`): **31+ real $12 charges** (`_claude/notes/RECON-FINDINGS.md`). The live Stripe webhook that matters (`we_1TRbB2…`) still points at LEGACY.
- **The loop has never closed once.** create+chat are exercised; publish→pay→pick→notify has never run end-to-end on vNext.
- **Launch gates not met:** (a) bot/abuse protection (Turnstile) = **port stub only, no implementation**; (b) **image** moderation = **absent** (text moderation via Haiku exists). Both are hard gates before a public guest chat / public publish.
- **Security: live secret VALUES are committed in git history** (Stripe `sk_live`, Anthropic `sk-ant-api03`, Supabase `sb_secret`, Clerk `sk_live`, webhook `whsec`, Netlify admin PAT, FAL key). Rotate.

---

## 1. CANONICAL SERVICE INVENTORY

Status tiers: **in-place** (keyed + code works) · **in-flight** (keyed this session / wiring landing) · **planned** (identified need, not started) · **candidate** (optional/speculative).
Horizon: Now · Near · Platform · Later · Scale.
"Live-verified" = primary MCP/HTTP evidence cited. "Claimed" = asserted in a doc only.

### 1A. IN-PLACE — keyed + wired (the Tier-1 loop is fully closed by these)

| Service | Horizon | Role | Env-var NAMES | IDs | Live-verified vs claimed |
|---|---|---|---|---|---|
| **Anthropic** | Now | Curator LLM chat, Vision, web_search, Memory, Files, Extended Thinking | `ANTHROPIC_API_KEY` (key prefix `sk-ant-api03-…`, all 4 contexts) | org `ebe4a13c…` (peek.gift); BUILD-BOOK §11 also cites `acct`-style org | **LIVE-VERIFIED**: `usage_ledger`=277 rows incl. Opus+Haiku spend, MCP query (`GROUND-TRUTH.md §A`). Key-in-Netlify presence = claimed (Netlify connector offline 06-02). Default model = `claude-sonnet-4-6`; Opus 4.8 opt-in (W04, `STATE.md`). **W04 SUPERSEDED earlier `claude-opus-4-7` default.** |
| **Clerk** | Now | Auth, sessions, lifecycle webhooks | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (`sk_live_…`), `CLERK_WEBHOOK_SIGNING_SECRET` (`whsec_…`), `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`, `ADMIN_CLERK_USER_IDS` | instance `ins_3D5VaoJxcxztJvjkHUanDEMdFWG`; frontend `clerk.peek.gift`; portal `accounts.peek.gift`; pub key prefix `pk_live_Y2xlcmsucGVlay5naWZ0JA`; Frank admin id `user_3Doj78byqwXP3goPCZVNdFMM9l7` | **LIVE-PRIOR**: atelier smoke 2026-05-28 `/sign-in`,`/sign-up` HTTP 200, JWKS verified. Plan does NOT enforce origin allowlist (`allowed_origins: null`). Shared with legacy site. Fallback-redirect drift fixed in code per `54b7eb8`. |
| **Stripe** | Now | $12 publish-gate Checkout, Tax, Adaptive Pricing, webhooks | `STRIPE_SECRET_KEY` (`sk_live_51T4xnb…`), `STRIPE_PUBLISHABLE_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_live_51T4xnb…`), `STRIPE_WEBHOOK_SECRET` (`whsec_…`), `STRIPE_PRICE_ID=price_1TapZICEKPUsVee1ddG4n14M`, `PAY_MODE` (env=`live`; **code default=`mock`**), `STRIPE_ADAPTIVE_PRICING=on` | acct `acct_1T4xnbCEKPUsVee1` (Frank DeAndino); product `prod_UZzXnuYuX4ud15` ("peek.gift vNext — Standard"); vNext webhook `we_1Tb7PhCEKPUsVee1Jz6Kcxkb`; LEGACY webhook `we_1TRbB2CEKPUsVee1Qh084LCz`; legacy product `prod_UQqlb4e5Ti9zYL` | **LIVE-VERIFIED**: MCP — price=1200 USD on `prod_UZzXn…`; `pi_3TZh0vCEKPUsVee11vP29DJR`=1200 USD **succeeded** (one charge). **Tax/adaptive dashboard activation = UNVERIFIED/claimed** (env flags exist; SERVICES.md claims "Tax ACTIVE, NJ origin registered" but VERIFIED-STATE.md marks Stripe dashboard tasks "STATUS UNKNOWN, Frank to confirm"). |
| **Supabase** | Now | Postgres (`peek_v2`), Storage, RLS, Drizzle | `NEXT_PUBLIC_SUPABASE_URL`+`SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…` modern), `SUPABASE_SERVICE_ROLE_KEY` (`sb_secret_…` modern), `DATABASE_URL` (pooler `aws-1-us-east-1.pooler.supabase.com:6543`), `SUPABASE_STORAGE_BUCKET`+`PEEK_V2_STORAGE_BUCKET=peek-v2-assets` | project `ewqpujqerdnrkjqlpobo` ("frank.deandino@gmail.com's Project Gift"), us-east-1, PG 17.6.1, ACTIVE_HEALTHY; buckets `peek-v2-assets` (vNext) + `gift-assets` (legacy) | **LIVE-VERIFIED**: MCP `list_projects`/`list_tables`. **14 `peek_v2` tables, RLS ON+FORCE all** (RLS was OFF — critical — fixed by migration `0005_enable_rls_default_deny.sql`, `STATE.md` batch-4 prep #1). Modern `sb_secret_/sb_publishable_` keys (NOT legacy JWT). |
| **Resend** | Now | Transactional email (share + curator-pick notify) | `RESEND_API_KEY`, `NOTIFICATIONS_FROM="peek.gift <info@peek.gift>"` | sender `info@peek.gift` | **LIVE-PRIOR**: DKIM `resend._domainkey.peek.gift` TXT verified 2026-05-28. **Actual delivery receipt = UNVERIFIED** ("No actual delivery receipt on record"). |
| **ZenRows** | Now | Scrape — primary in cascade | `ZENROWS_API_KEY` | — | **LIVE-VERIFIED but DEGRADED**: 18 scrape calls in `usage_ledger`; 8/11 `scrape_complete` degraded (non-Amazon/Zappos failing). Scrape is the weak link. |
| **PostHog** | Now | Analytics, replay, flags, LLM observability | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com` | org `peekgift`, project `434015` | **WIRED, reach UNVERIFIED**: reverse-proxy `/api/posthog/decide` 200 (prior smoke). **CONFLICT: VERIFIED-STATE (05-27) lists PostHog keys NOT-keyed; STATE/SERVICES (05-28) say "keyed this session 🟢 LIVE."** CURRENT = keyed. |
| **fal.ai** | Now | Image gen (Flux), video, LipSync | `FAL_KEY` (key prefix `fal-…`) | — | **WIRED-BUT-SUSPECT**: 5 `flux/schnell` ledger calls but `generate_hero_image` observed returning `image_url: null`. **CONFLICT: VERIFIED-STATE (05-27) = FAL_KEY NOT keyed; STATE/SERVICES (05-28) = "Keyed this session 🟢 LIVE."** CURRENT = keyed but wiring broken. |
| **Upstash Redis** | Now | Rate-limit, Stripe webhook idempotency, presence | `UPSTASH_REDIS_REST_URL=https://probable-lemur-138225.upstash.io`, `UPSTASH_REDIS_REST_TOKEN` | db `probable-lemur-138225` | **UNVERIFIED runtime**: keyed 05-28 ("🟢 LIVE"), but VERIFIED-STATE (05-27) listed it NOT-keyed and idempotency **fails OPEN** if missing (⚠️ B15 → Stripe-retry dupes; ASSET-MAP says fix to fail-CLOSED for payments). |
| **Browserbase** | Platform | Stagehand browser agent (the PerfectPurchase "money button"); scrape fallback only | `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID=5221d287-330d-4b19-806a-2103ad8d28f9` | proj `5221d287-330d-4b19-806a-2103ad8d28f9` | **STUB/KEYED**: keys set, no successful runs cited; one-shot REST endpoint "isn't publicly documented," falls back to ZenRows. **OLD framing (BACKEND_SERVICES "scrape-#2") SUPERSEDED** by "Stagehand agent play, park the spend." |
| **Netlify** | Now | Deploy host + Edge Fns | env store on `peek-gift-vnext`; `NODE_VERSION=22`, `NPM_FLAGS`, `SECRETS_SCAN_OMIT_KEYS` | site `932646db-e8be-42f1-a94b-a57bb733e308`; account `69b257cd6e86cfdc9d62a911`; build hook `6a14cf135c167288ad60f6a9` | **LIVE-PRIOR** (see §2). Connector offline 06-02. |
| **GitHub** | Now | Source control + Actions deploy trigger | deploy-key link (no GitHub webhooks on repo) | repo `glacialsips-site/grook-peekgift` | **LIVE**. CI = `.github/workflows/netlify-deploy.yml` only; **CI red** (last runs failed on atelier-integration 05-28, `RECON-FINDINGS`). |
| **Google Places** | Now (legacy) | Address autosuggest — LEGACY only, unused in vNext | `GOOGLE_PLACES_API_KEY`, `VITE_GOOGLE_PLACES_API_KEY` (both in `SECRETS_SCAN_OMIT_KEYS`) | — | **KEYED-NOT-USED (vNext)**: Frank dropping vNext dependency (Stripe Address Element covers it); keys stay for legacy Vite site. DO NOT DELETE. |

### 1B. IN-FLIGHT / BLOCKED — code wired, no key (runtime no-op)

| Service | Horizon | Role | Env-var NAMES | IDs | State |
|---|---|---|---|---|---|
| **Sentry** | Near | Error tracking, perf, source-map upload | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG=peekgift`, `SENTRY_PROJECT=peek-gift-vnext` | org `peekgift` org-id `4511426433646592` | **BLOCKED** — account exists, NO DSN keyed; `withSentryConfig` build-wraps but runtime no-ops. Blocks-on-Frank. |
| **Inngest** | Near | Background jobs (nudge-relationships, scrape-worker, webhook-logger) | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | app id `peek-gift-vnext` | **TBD/NOOP** — `/api/inngest` 500; 3 jobs silent no-op. No account. |
| **Twilio** | Later (candidate) | SMS / WhatsApp share | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `TWILIO_WHATSAPP_FROM` | — | **TBD** — returns `sms_not_configured`; share button hidden. |
| **Deepgram** | Later | Voice STT (mic mode) | `DEEPGRAM_API_KEY` | $200 free credit | **STUB** — mic hidden behind flag until keyed. |
| **ElevenLabs OR Cartesia** | Later | Voice TTS (reveal narration) — pick ONE | `ELEVENLABS_API_KEY` or `CARTESIA_API_KEY` | — | **STUB** — mic stays hidden until BOTH STT+TTS keyed. |

### 1C. PLANNED GATES — needed NOW but NOT started (the dangerous ones)

| Service | Horizon | Role | Env-var NAMES | State |
|---|---|---|---|---|
| **Bot / abuse protection (Turnstile)** | **Now (GATE)** | Protect free guest chat from API cost-burn | TBD (Cloudflare Turnstile / hCaptcha) | **PORT-STUB ONLY** — `botGate` exists as a typed port in `studio-vnext:lib/ir/ports.ts` + `…/packages/core/src/ports/ports.ts` + `clean-slate:packages/core/src/ports/ports.ts`; **NO vendor implementation anywhere.** Free; not optional — open chat → Anthropic = live cost-burn the moment abused. |
| **Image moderation** | **Near (GATE)** | Screen images before public publish | TBD (Hive / AWS Rekognition) | **ABSENT.** Text moderation IS coded (`feat-content-moderation-haiku:atelier/lib/anthropic/moderation.ts` — Haiku, prompt-cached, 10 categories, fail-OPEN, text-only). **Image moderation is the gap** — one bad image on a public shareable link = legal/brand event. |
| **Embeddings provider (multimodal)** | Near | Text + image vectors for catalog/semantic search | TBD (Voyage multimodal / Cohere Embed v4 / Jina CLIP) | **NOT started.** Hard dep for PerfectPurchase; pgvector only *stores* (and isn't installed). Pick multimodal, NOT text-only. |
| **Jina Reader** | Later | 3rd-tier scrape fallback (markdown) | none keyed | STUB in cascade. |

### 1D. CANDIDATE / DEMOTED / IDEAS-LATER

- **Skimlinks / Sovrn (affiliate)** — `SKIMLINKS_PUBLISHER_ID`, `SKIMLINKS_WEBHOOK_SECRET`, `SOVRN_API_KEY`. **DEMOTED per Frank** (see §3). `wrapAffiliateLink()` returns direct URL; `affiliate_search` falls back to Anthropic `web_search`. Skimlinks webhook route crashes 500 (`STATE.md` known-bug).
- **Tolt** — `TOLT_API_KEY` — creator referral; no-op; likely replaced by Stripe Connect.
- **IDEAS-LATER.md bucket** (do NOT add without Frank's go): Travel APIs (Viator/OpenTable/Booking/etc.), direct retailer affiliates (Amazon/Apple/Walmart/Target/eBay), music/video (Spotify/Apple Music/TMDB/YouTube/Pinterest/Instagram/Canva), LiveKit/Daily, Mux/CF Stream/Bunny, Lottiefiles, Mapbox, Secrets manager (Doppler/Infisical), AI gateway (Portkey/OpenRouter), Ad pixel/CAPI, dedicated search (Typesense/Algolia), warehouse (Motherduck/BigQuery), support (Gorgias/Intercom).

---

## 2. THE EXACT DEPLOY REALITY

### 2A. What Netlify builds (CURRENT)
- **Site:** `peek-gift-vnext` (`932646db-e8be-42f1-a94b-a57bb733e308`), account `69b257cd6e86cfdc9d62a911`, primary URL `https://vnext.peek.gift` (default subdomain `peek-gift-vnext.netlify.app` still resolves).
- **Production branch built: `atelier-integration`.** Build config `atelier-integration:netlify.toml`:
  ```
  [build]
    base = "atelier"
    command = "npm run build"
    publish = ".next"
  [build.environment]
    NODE_VERSION = "22"
  [[plugins]]
    package = "@netlify/plugin-nextjs"
  ```
  (Single Next.js app under `atelier/`, npm.)

### 2B. The GitHub → Netlify hook (the mechanism)
- **NOT the native git connector** — push-to-deploy runs through a **GitHub Actions workflow** `atelier-integration:.github/workflows/netlify-deploy.yml` that POSTs to a Netlify **build hook**:
  `https://api.netlify.com/build_hooks/6a14cf135c167288ad60f6a9?trigger_branch=atelier-integration&trigger_title=push+by+<actor>+sha+<sha>` (`URL-AUDIT.md:330`, `MEMORY.md:198`).
- Fires on every push to `atelier-integration` (and `main`). The build-hook URL is Netlify's API, host-agnostic, accepts `?trigger_branch=<branch>` to force-build any branch.
- **URL-AUDIT.md:** "No GitHub webhooks on this repo … link is via deploy-key only."
- Implication: code that lands on any OTHER branch **does not auto-deploy** until it reaches `atelier-integration`.

### 2C. The vNext-vs-legacy split (TWO separate Netlify projects, TWO repos)
| | vNext (THIS repo) | LEGACY (separate repo) |
|---|---|---|
| Netlify site | `peek-gift-vnext` `932646db-…` | `peek-gift` `69732dcb-…` |
| URL | `vnext.peek.gift` | `peek.gift` (apex) |
| Framework | Next.js (`atelier/`) | Vite + 22 Netlify Functions (`checkout-prepare`, `payment-webhook`, …) |
| Source | `glacialsips-site/grook-peekgift` | NOT in this repo (zip-uploaded, `deploy_source: api`) |
| Stripe product | `prod_UZzXnuYuX4ud15` | `prod_UQqlb4e5Ti9zYL` |
| Stripe webhook | `we_1Tb7Ph…` (zero traffic) | `we_1TRbB2…` → `peek.gift/api/payment-webhook` (**9 events, the real revenue path**) |
| Charges | **0** | **31+ real $12** |
| Mock flag | `PAY_MODE` (code default `mock`; Netlify env `live`) | `VITE_USE_MOCK_API=false` (legacy `PAY_MODE=mock` is **dead config**, read by nothing — `LEGACY-PAYMODE-INVESTIGATION.md`) |

Other Netlify sites under Frank: `peekgift-v9k-modular-sandbox` `2ded0f9d-…`, `peekgift-v1-sandbox` `740fbbe2-…`, `grook-peekgift` `e20f2cd9-…` — all unused, slated for manual deletion (MCP has no delete-project op).

### 2D. The unmerged finalist branches (NOT live)
- **`gallant-planck-pu51x`** (06-02) and **`studio-vnext`/`clean-slate`** (06-04) ship a *different* `netlify.toml`:
  ```
  [build]
    base = "apps/web"
    command = "cd .. && corepack enable && pnpm install --frozen-lockfile && pnpm --filter @peek/web build"
    publish = ".next"
  ```
  pnpm/Turborepo monorepo. Author's own caveat (`gallant-planck:_packets/SPINE/DEPLOY.md`): "first-draft monorepo config I could not test against Netlify from here. If the first build fails it's almost certainly the install/base interplay."
- To ship either: Netlify dashboard → `peek-gift-vnext` → Build & deploy → **set production branch** to the chosen branch, save, trigger deploy, debug first build. **Requires the Netlify connector (offline as of 06-02) or a manual dashboard toggle.**
- **DOC LANDMINE (flagged in `RECON-FINDINGS.md`):** `studio-vnext` AND `gallant-planck` each have a `WAKEUP.md`/`DEPLOY.md` declaring *itself* the canonical Netlify-production branch. Both are WRONG about being live — **only `atelier-integration` is deployed + live-verified.**

### 2E. The CUTOVER sequence (vNext → peek.gift apex) — `atelier-integration:_packets/SPINE/CUTOVER.md`
Same Netlify project, zero key/user migration. **Pre-req: add `peek.gift` to Clerk authorized origins BEFORE step 4** or auth breaks.
1. **Add `peek.gift` as a custom domain** on `peek-gift-vnext` (Netlify → Domain management). SSL auto.
2. **Swap Stripe webhook** `we_1Tb7Ph…` URL → `peek.gift/api/stripe/webhook` (signing secret stays).
3. **Swap Clerk webhook** URL → `peek.gift/api/webhooks/clerk` (signing secret stays).
4. **Update `APP_URL`** env `https://vnext.peek.gift` → `https://peek.gift`. ⚠️ `share_url` is built at write-time with `env.APP_URL` (BUGS M01) — existing published peeks point at vnext until M01 fixed (lazy build) or a one-time `UPDATE` on `share_url`.
5. **Disable legacy Supabase JWT-based API keys** — ONLY after legacy Vite site fully decommissioned. vNext is already on modern `sb_secret_/sb_publishable_`.
Also verify before cutover: PostHog authorized URLs, Sentry allowed domains, Skimlinks allowed domains, Inngest serve URL, Google Places HTTP-referrer restrictions. Rollback = 5 single-field reverts (no data migration).
**Trigger = Frank's call.** Suggested: spine landed + Tier-0 shipped + ~2 weeks of vNext on real Insta traffic with no critical regressions.

### 2F. The webhook ROUTE-PATH ambiguity (verify Stripe-side)
- Repo has BOTH `atelier-integration:app/api/stripe-webhook/route.ts` (root, hyphen) AND `atelier-integration:atelier/app/api/stripe/webhook/route.ts` (slash). **Deployed build base is `atelier/`, so the LIVE route is `/api/stripe/webhook` (slash).**
- `RECON-FINDINGS.md` flags "Webhook route is `/api/stripe-webhook` (code) vs `/api/stripe/webhook` (doc) — confirm the Stripe-side endpoint." → CTO action: confirm `we_1Tb7Ph…` endpoint URL matches the deployed slash-route on `vnext.peek.gift`.
- vNext webhook event subscriptions: VERIFIED-STATE (05-27) said **only `checkout.session.completed`**; STATE (05-28) says **expanded to 12 events** (`checkout.session.async_payment_succeeded/failed/expired`, `payment_intent.*`, `charge.refunded`, `charge.dispute.created`, `invoice.paid/payment_failed`, `customer.subscription.updated/deleted`). CURRENT = 12 (claimed; not re-MCP-verified).

---

## 3. FRANK'S OWN TODO / KEYS LIST + DEMOTIONS

Source: `atelier-integration:_packets/SPINE/FRANK-TODO.md` ("what only Frank can do"). Legend: `[ ]` open / `[x]` done / `[-]` won't do.

**Blocking active features (code already wired — key flips it on):**
- `[ ]` **Anthropic — enable Web Search** at `platform.claude.com → Settings → Privacy`. Unblocks `web_search` server tool + `affiliate_search` fallback. **Frank WANTS this enabled.** "30 seconds, one toggle." (W12/W03 confirm code expects `web_search`, not the hallucinated `web_search_tool_bm25`.)
- `[ ]` **Stripe — set tax_code** on `prod_UZzXnuYuX4ud15` to `txcd_10103001` (Digital services); currently default `txcd_10000000` (General Service). **Frank WANTS this set.** Minor accuracy optimization.
- `[ ]` **Sentry — get DSN + auth token** (scopes `project:read`, `project:releases`, `org:read`); paste 5 env vars. Unblocks error reporting.

**Service signups (degrade gracefully without):** `[ ]` Twilio · `[ ]` Inngest · `[ ]` Deepgram · `[ ]` ElevenLabs OR Cartesia.

**DEMOTED by Frank (the affiliates call):**
- `[-]` **Skimlinks** — Frank 2026-05-28: **"we don't have affiliates right now."** Demoted from Tier 0. Apply (4-6 wk) only when affiliate revenue matters again.
- `[-]` **Sovrn** — same demotion.
- (`affiliate_search` tool now falls back to Anthropic `web_search` — which ties to the web_search enable above.)

**Netlify cleanup (Frank, manual — MCP can't delete projects):** delete `peekgift-v9k-modular-sandbox`, `peekgift-v1-sandbox`, `grook-peekgift`. **Do NOT delete** `peek-gift-vnext` or `peek-gift`.

**Future (on radar):** apex cutover (§2E); Stripe business-profile completeness (MCC `5734`/`5817`, legal entity, tax ID — NJ origin already registered per docs).

---

## 4. THE LAUNCH GATES (hard blockers before public traffic)

1. **Bot/abuse protection (Turnstile/hCaptcha) — NOT BUILT.** Only a `botGate` typed port stub exists (`studio-vnext`/`clean-slate` `packages/core/src/ports/ports.ts`). Free to add; mandatory before the open guest chat goes public — every anonymous chat turn calls paid Anthropic. `RECON-FINDINGS` also notes `clean-slate` has **no `/api/curator` middleware → the paid Opus endpoint is currently OPEN.**
2. **Image moderation — NOT BUILT.** Text moderation exists (Haiku, fail-OPEN, `feat-content-moderation-haiku`); **image path is absent.** Hard gate before any public shareable page can carry user/generated images.
3. **(Money-path gate, from RECON):** publish→pay CTA is unwired in the studio client (Phase 3b); webhook sends **no creator notification** from the hook (template exists, never fired from webhook — though `feat-curator-pick-notification` fires notify from the *pick* route correctly); idempotency fails OPEN (B15) → must fail-CLOSED for payments before live charges.

---

## 5. SECURITY FLAGS — LEAKED KEYS TO ROTATE (names + presence only; VALUES never printed)

Confirmed by direct `git show` this session. **These are full live secret VALUES committed in git history**, not just prefixes:

| Location (`branch:path`) | Secret TYPES present (redacted) | Severity |
|---|---|---|
| `claude/research/depth-layer-ux:_packets/SPINE/VERIFIED-STATE.md` | Stripe `sk_live_…`, Anthropic `sk-ant-api03-…`, Supabase service-role `sb_secret_…`, Clerk `sk_live_…`, webhook `whsec_…`, `DATABASE_URL` (with embedded password), Stripe/Clerk `pk_live_…` | **CRITICAL** — full live values in history |
| `origin/lt/setup-concierge` (concierge setup doc) | **Netlify ADMIN Personal Access Token** (`nfp_…`, account-wide access to ALL sites incl. legacy) + `FAL_KEY` | **CRITICAL** — admin PAT = total Netlify control |

- The doc itself says they were "pasted into the concierge chat (wrong-chat mixup …). Both must be revoked."
- Note: the canonical `atelier-integration:_packets/SPINE/VERIFIED-STATE.md` shows only key *prefix snippets* (`sk-ant-api03-d3R21…cAAA`, etc.) — partial but still sensitive; the `research/depth-layer-ux` copy is the one with full values.
- Mitigations present: `SECRETS_SCAN_OMIT_KEYS=GOOGLE_PLACES_API_KEY,VITE_GOOGLE_PLACES_API_KEY` (build-time scan exemption — only the Places keys), and CLAUDE.md "Git repo NEVER a key store." Neither prevented the above.
- **CTO action:** rotate Stripe `sk_live`, Anthropic key, Supabase service-role, Clerk `sk_live`, both webhook signing secrets, DB password, Netlify admin PAT, FAL key. Do NOT copy any of these into a new repo. (Owner is ex-fintech and manages his own hygiene per SESSION-HANDOFF — flag, don't lecture.)

---

## 6. CONFLICTS / STALENESS MAP (what to trust)

- **PostHog / fal.ai / Upstash keyed?** VERIFIED-STATE (05-27, live env read) = NOT keyed. STATE+SERVICES (05-28) = "keyed this session 🟢 LIVE." → **CURRENT = keyed** (later, and SERVICES.md is the most recent service doc). Runtime correctness still suspect for fal (`image_url: null`) and Upstash (no runtime probe; fails OPEN).
- **vNext webhook events:** 1 event (05-27) → **12 events (05-28, CURRENT, claimed)**.
- **Default model:** `claude-opus-4-7` (OLD) → **`claude-sonnet-4-6` (CURRENT, W04)**, Opus 4.8 opt-in.
- **pgvector:** docs once said WIRED → **NOT INSTALLED** (`vector` 0.8.0 available, `installed_version: null`). CURRENT.
- **Browserbase:** "scrape-#2" (OLD) → **Stagehand agent / park the spend (CURRENT)**.
- **Tables count:** "13 peek_v2 tables" (OLD) → **14** (CURRENT; 14th = `curator_memory`).
- **Stripe Tax/Adaptive activation:** "ACTIVE" (SERVICES.md, claimed) vs **"STATUS UNKNOWN, Frank to confirm"** (VERIFIED-STATE) — treat as **UNVERIFIED** until a test session.
- **"Which branch wins" docs:** `studio-vnext` & `gallant-planck` WAKEUP/DEPLOY both self-declare canonical — **both SUPERSEDED on deploy-truth**; `atelier-integration` is the only live build. Horse-pick (freeform `clean-slate` vs structured `gallant-planck` vs milk-legacy-first) is **owner-reserved, unratified** (`RECON-FINDINGS` §RECOMMENDATION + Open items).

---

## 7. BIGGEST GAP / OPEN QUESTIONS FOR THE CTO

1. **The legacy money-maker repo location is unknown** — it holds the live revenue webhook (`we_1TRbB2…`) and the only paying code. Cutover (§2E) must move the webhook to vNext **without killing the existing $12 trickle** — but we cannot read or test the legacy Vite source from this repo. **Where does it live?**
2. **Stripe live-readiness is UNVERIFIED end-to-end** — needs owner Stripe OAuth to confirm charges-enabled, Tax actually activated, adaptive-pricing currencies, price active. Env flags ≠ dashboard state.
3. **No deploy of the chosen architecture** — until Frank picks the horse (atelier-frontier vs clean-slate vs gallant-planck) AND the Netlify production branch is repointed + the monorepo `netlify.toml` is debugged, the newest code can't ship; `atelier-integration` stays the only live thing.
