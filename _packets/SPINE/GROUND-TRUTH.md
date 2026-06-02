# GROUND-TRUTH — peek.gift vNext (BUILD-BOOK Chapter 0)

> What is **actually real** in the deployed system, verified against primary evidence — not inferred from
> a file existing. Produced 2026-06-02 on branch `claude/gallant-planck-pu51x`. Method: live MCP queries
> (Supabase, Stripe), direct schema reads, and the dated smoke evidence in the atelier `_packets/SPINE/*`.
> Classification key: **VERIFIED-LIVE** (primary evidence this session) · **LIVE-PRIOR** (dated primary
> evidence in-repo, not re-probed now) · **WIRED-BUT-NOOP / DEGRADED** · **BLOCKED** · **UNVERIFIED**
> (could not confirm — a guess would be a failing gate; UNVERIFIED is the honest pass).

## A. External services

| Service | Class | Evidence | Notes |
|---|---|---|---|
| **Supabase** | VERIFIED-LIVE | MCP `list_projects` → `ewqpujqerdnrkjqlpobo` ACTIVE_HEALTHY, PG 17.6, us-east-1. `list_tables` → 14 `peek_v2` tables, RLS on all. | The data backbone. Real rows (see §B). Env vars: `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`DATABASE_URL`/`NEXT_PUBLIC_SUPABASE_*`. |
| **Stripe** | VERIFIED-LIVE | MCP: acct `acct_1T4xnbCEKPUsVee1`; price `price_1TapZICEKPUsVee1ddG4n14M` = 1200 USD on `prod_UZzXnuYuX4ud15`; `pi_3TZh0vCEKPUsVee11vP29DJR` = 1200 USD **succeeded**. | The $12 gate is real and has charged once. Webhook `we_1Tb7PhCEKPUsVee1Jz6Kcxkb`. **Tax / adaptive-pricing dashboard activation = UNVERIFIED** (env `PAY_MODE=live`, `STRIPE_ADAPTIVE_PRICING=on` exist; confirm with a test session). |
| **Anthropic** | VERIFIED-LIVE (app), key-in-Netlify UNVERIFIED | `usage_ledger` = 277 rows incl. Opus + Haiku spend (MCP query this session). | The chat genuinely calls Anthropic and is billed. Key presence in Netlify env not re-checked (Netlify connector offline). |
| **Clerk** | LIVE-PRIOR | atelier smoke 2026-05-28: `/sign-in` & `/sign-up` HTTP 200, JWKS verified. Instance `ins_3D5VaoJxcxztJvjkHUanDEMdFWG`, `clerk.peek.gift`. | Not re-probed now — anonymous `…/.well-known/jwks.json` returns 403 (bot-protected), which is expected, not a fault. |
| **Resend** | LIVE-PRIOR (delivery UNVERIFIED) | DKIM `resend._domainkey.peek.gift` TXT verified 2026-05-28. `info@peek.gift`. | No actual delivery receipt on record. |
| **ZenRows** | DEGRADED | 18 scrape calls in `usage_ledger`; agent read of atelier notes: 8/11 `scrape_complete` degraded (non-Amazon/Zappos failing). | Scrape is the weak link; cascade + fallbacks needed (Ch 4 inputs / Ch 5). |
| **fal.ai** | WIRED-BUT-SUSPECT | 5 `flux/schnell` ledger calls, but `generate_hero_image` observed returning `image_url: null`. | Hero image wiring is suspect — verify in Ch 2/Ch 3 before relying on it. |
| **PostHog** | WIRED, reach UNVERIFIED | Reverse-proxy `/api/posthog/decide` returned 200 (prior smoke). Org `peekgift`, project `434015`. | PostHog **MCP is available this session** — can confirm event arrival when needed. |
| **Upstash Redis** | UNVERIFIED | Keyed (`UPSTASH_REDIS_REST_URL=…probable-lemur-138225…`); no runtime probe. | Used for webhook idempotency + rate-limit + presence. |
| **Netlify** | LIVE-PRIOR | Deploy `6a17a230…` `ready`, commit `eb1f164`, published 2026-05-28; `/` 200. Site `932646db-e8be-42f1-a94b-a57bb733e308` → vnext.peek.gift. | **Connector offline this session** (no Netlify MCP). Deploy still fires from the GitHub→Netlify hook `6a14cf135c167288ad60f6a9` on push to `atelier-integration`. |
| **Sentry** | BLOCKED | No DSN keyed; `withSentryConfig` wired but no-ops. Org `peekgift` (`4511426433646592`). | Sentry MCP available; unblock at Ch 7.3 once DSN is keyed. |
| **Browserbase** | STUB/KEYED | Keys set (`…PROJECT_ID=5221d287-330d-4b19-806a-2103ad8d28f9`); no successful runs cited. | The Stagehand/PerfectPurchase play (Ch 5+), not scrape-#2 today. |
| **Twilio** | TBD | Returns `sms_not_configured`. | Twilio MCP available; SMS/WhatsApp share at Ch 8.3. |
| **Inngest** | TBD/NOOP | `/api/inngest` 500; 3 jobs silent no-ops. | Jobs: `nudge-relationships`, `scrape-worker`, `webhook-logger` (Ch 7.5). |

## B. Live database reality (`peek_v2`, MCP this session)
Row counts: `peeks` **50** · `cards` **33** · `variant_groups` **10** · `events` **372** · `chat_messages` **380** ·
`usage_ledger` **277** · `picks` **0** · `webhook_log` **0** · `peek_collaborators` 0 · `relationships` 0 ·
`affiliate_revenue` 0 · `tier_config` 0 · `curator_memory` 0.

**The headline finding:** creation + chat are real and exercised (peeks/cards/variant_groups/events/chat/usage
all populated; one Stripe charge succeeded) — but **`picks`=0 and `webhook_log`=0: the recipient
publish→pick→notify loop has never completed end-to-end.** That loop (BUILD-BOOK Ch 8.2) is the true milestone.

**Persistence model today:** the app writes **current-state rows** directly (`peeks` + `cards` +
`variant_groups`) and a **flat telemetry stream** (`events`: `kind` + `payload` jsonb). This is **not** the
event-sourced command→event→state gate the architecture calls for — that maker-checker is net-new
(`packages/core`, Ch 1.3). The folded `PeekDocument` will map onto these row tables via `PersistencePort`.

## C. Extensions / pgvector
MCP `list_extensions`: `vector` 0.8.0 **available, `installed_version: null`** → pgvector is NOT installed.
`CREATE EXTENSION vector;` is a Ch 5 step. Also available if useful later: `pgmq`, `pg_cron`, `pg_net`,
`http`, `wrappers`, `pg_trgm`, `postgis`. Installed today: `pgcrypto`, `uuid-ossp`, `pg_stat_statements`,
`supabase_vault`, `pgjwt`/`pgsodium` (Supabase defaults).

## D. Deploy reality + the one open decision for Frank
- **Netlify builds `atelier-integration`** (context `production`) → vnext.peek.gift. Confirmed via CUTOVER.md
  + PR #8's own body ("the connector deploy only builds the git-connected branch") + the GitHub Actions hook.
- **This build session is branch-locked to `claude/gallant-planck-pu51x`** and may not push elsewhere without
  explicit permission. So work committed here **does not auto-deploy** until it reaches `atelier-integration`.
- **Mitigation (no work wasted):** `packages/core` is framework-agnostic and lift-clean by design; the
  foundation is correct regardless of which branch hosts it. **The deploy/merge path is the single thing that
  needs Frank** — either (a) grant push to `atelier-integration`, or (b) merge gallant-planck's foundation
  there, or (c) repoint Netlify's production branch (needs the Netlify connector, currently offline). This is
  deferred to the cutover step; it does not block building the core.
- **Cutover (Ch 8, from CUTOVER.md):** add `peek.gift` domain to the vnext site → add `peek.gift` to Clerk
  origins → repoint Stripe webhook `we_1Tb7…` + Clerk Svix to `peek.gift` → set `APP_URL=https://peek.gift`.

## E. Known-broken right now (fix in-flight, don't rebuild around)
- `/build` GET 500 on the unauthenticated path.
- fal `generate_hero_image` returns `image_url: null` (wiring).
- Scrape degraded on most non-Amazon/Zappos retailers.
- Memory-tool path validation burns ~2 tool calls/session; `affiliate_search` stalls the conversation.
- Sentry captures nothing (no DSN).

## F. The IR / renderer truth (the contract to preserve, the gaps to fix)
The canonical document is **`PeekIR` = `{ schema_version:1, peek, sections[], variant_groups[], cards[] }`**
(snake_case, mirrors the DB). It is sound and will be **lifted verbatim** into `packages/core` (never
paraphrased). The lean chat exposes **16 tools** (`set_concept`…`mark_ready`) that map 1:1 to the Command
union. Four renderer gaps are confirmed with file:line evidence and are scheduled, not accidental:
1. **variant_groups render as flat tiles** — `VariantGroup.selection` is stored but never read at render; no
   rule-aware grouped control. (The defensible core — Ch 4.3.)
2. **glow never reaches the hero headline** — `--peek-display-shadow` is set to `'none'` whenever
   `loud.displayShadow` is absent, so `palette.glow:true` alone produces no headline glow. (One-liner in
   `toTokens`; folded into Ch 1.5 token port.)
3. **stats / lede unauthorable** — present in the IR + Zod + renderer, but absent from the tool's
   `SECTION_KINDS` enum, so the model can't emit them. (Ch 2.4 tool schema.)
4. **itinerary** — `activity` cards render like products; the plan only via a `flightplan` section mapped
   from cardViews, not a dedicated itinerary shape. (Ch 4.4.)

## G. Conclusion — what is safe to build on
Supabase, Stripe ($12), and the Anthropic chat are genuinely live; the IR + renderer + 16-tool chat are
sound salvage; the bookends (auth, checkout, webhook→publish, landing) exist on `atelier-integration`. The
**maker-checker gate, the single-page chat-over-preview UX, the rules-aware render, and the completed
publish→pick→notify loop are net-new** — that is the build. Nothing here was rebuilt that was proven working
(see BUILD-MAP.md). The only external dependency on Frank is the deploy/merge-to-production decision (§D).
