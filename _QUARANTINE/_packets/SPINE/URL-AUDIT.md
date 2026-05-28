# URL Audit — backend-vendor config for `vnext.peek.gift`

_Generated 2026-05-27. Netlify site `peek-gift-vnext` (id `932646db-e8be-42f1-a94b-a57bb733e308`) now serves on both `https://vnext.peek.gift` (PRIMARY per Netlify dashboard) and `https://peek-gift-vnext.netlify.app` (legacy / branch URL). Both resolve to the same Netlify deploy (`vnext.peek.gift` is a CNAME to `peek-gift-vnext.netlify.app`). This file audits every backend vendor for URLs configured ONLY against the legacy hostname — silent breakage if a vendor's allow-list / webhook / redirect doesn't include the new primary._

## Summary table

| Vendor | Status | Drift? | Severity |
|---|---|---|---|
| Stripe (vNext webhook `we_1Tb7PhCEKPUsVee1Jz6Kcxkb`) | 🟡 DRIFT | URL still on `peek-gift-vnext.netlify.app` | MINOR (cosmetic — same site, payments still work) |
| Clerk — dashboard fallback URLs (`home`, `after_sign_in`, `after_sign_up`, etc.) | 🟡 DRIFT | All fallback URLs point at legacy `peek.gift` apex (legacy Vite site) | MEDIUM (only fires if user lands on hosted Clerk pages with no return URL) |
| Clerk — authorized origins | 🟢 OK | `allowed_origins: null` → no origin enforcement on free/pro tier | — |
| Clerk — JWT issuer / JWKS | 🟢 OK | Issuer is `clerk.peek.gift` (account-bound, not per-site) | — |
| Clerk — webhook (Svix) | ⚪ UNKNOWN | Svix endpoint URL not readable via Clerk API; must check via Svix dashboard one-time-link | — |
| Supabase — REST / Storage CORS | 🟢 OK | Returns `access-control-allow-origin: *` from any origin | — |
| Supabase — Auth Site URL / Redirect URLs | 🟢 OK (irrelevant for vNext) | We don't use Supabase Auth; Clerk owns auth. Legacy peek.gift Vite uses it; out of scope. | — |
| Supabase — Realtime publication | 🟢 OK | Only `peek_v2.picks` published; no per-URL config | — |
| Supabase — Edge functions | 🟢 OK | No edge functions deployed | — |
| Supabase — DB webhooks | 🟢 OK | `supabase_functions.hooks` table does not exist (feature unused) | — |
| Resend — domain verification | 🟢 OK | `resend._domainkey.peek.gift` TXT present and signed; account-level, no URL drift | — |
| Resend — outbound webhook subscriptions | ⚪ UNKNOWN | Key value not readable in this audit context; no inbound webhook to vNext is wired in code so likely none | — |
| Twilio | ⚪ UNPROVISIONED | No `TWILIO_*` env vars on Netlify; product surface not yet live | — |
| PostHog | ⚪ UNPROVISIONED | No `NEXT_PUBLIC_POSTHOG_KEY` on Netlify; no account configured. Note BUGS.md M23: CSP doesn't include `*.posthog.com` — separate fix needed when keyed. | — |
| Sentry | ⚪ UNPROVISIONED | No `SENTRY_DSN` on Netlify; tunnelRoute is local (`/monitoring`), no external URL config needed even once provisioned | — |
| fal.ai | ⚪ UNPROVISIONED | No `FAL_KEY` on Netlify; no async webhook config to drift | — |
| Inngest | ⚪ UNPROVISIONED | No `INNGEST_*` env vars; serve route auto-detects host from request — no fixed-URL drift possible once provisioned, BUT Inngest dashboard "App URL" must point at `vnext.peek.gift/api/inngest` at provisioning time | — |
| Skimlinks | ⚪ UNPROVISIONED | No `SKIMLINKS_*` env vars; `/api/webhooks/skimlinks` returns 500 "not configured". Per packet 24 NOTES.md, webhook would be `peek-gift-vnext.netlify.app/api/webhooks/skimlinks` — at provision time, use `vnext.peek.gift/api/webhooks/skimlinks` instead. BUGS.md M14 (signature format unknown) is separate. | — |
| Sovrn | ⚪ UNPROVISIONED | No env vars; no inbound webhook in code yet | — |
| Google Places | 🟡 OPEN | `GOOGLE_PLACES_API_KEY` is set, but key has NO HTTP-referer restrictions — works from any origin. Not URL drift, but worth noting as a separate security issue (key is wide open). | LOW |
| Upstash Redis | ⚪ UNPROVISIONED | No `UPSTASH_*` env vars (BUGS.md M22 notes this). REST endpoint is account-internal anyway — no per-site URL config. | — |
| Browserbase | 🟢 OK | `BROWSERBASE_API_KEY` set; outbound-only API, no inbound URL | — |
| ZenRows | 🟢 OK | `ZENROWS_API_KEY` set; outbound-only API | — |
| GitHub | 🟢 OK | No GitHub webhooks on this repo (no GitHub MCP `list_hooks` op; STATE.md confirms link is via deploy-key only). Push-to-deploy uses GitHub Actions → Netlify build hook (`api.netlify.com/build_hooks/6a14cf135c167288ad60f6a9`), which is target-agnostic. | — |

**Top-of-mind critical findings:**

1. **Stripe vNext webhook URL is on `peek-gift-vnext.netlify.app`, not `vnext.peek.gift`** (minor — same site, still works, but should be updated to match Netlify primary).
2. **Clerk dashboard fallback URLs (home, after_sign_in, after_sign_up, etc.) all point at the legacy `peek.gift` apex domain** — if any flow ever falls back to dashboard defaults (e.g. user lands on hosted `accounts.peek.gift/sign-in` without an explicit `redirect_url`), they'll be sent to the legacy site instead of vNext.

Nothing in the audit is currently breaking user-visible flows (both URLs serve the same Netlify deploy), but both will become real breakage if the legacy URL is removed from Netlify or if production traffic shifts entirely to `vnext.peek.gift`.

---

## Per-vendor detail

### Stripe — Status: 🟡 DRIFT (vNext webhook only)

**What's configured:** Two webhook endpoints on Stripe account `acct_1T4xnbCEKPUsVee1` (Frank DeAndino, livemode):

| ID | URL | Events | Status |
|---|---|---|---|
| `we_1Tb7PhCEKPUsVee1Jz6Kcxkb` | `https://peek-gift-vnext.netlify.app/api/stripe/webhook` | `checkout.session.completed` | enabled |
| `we_1TRbB2CEKPUsVee1Qh084LCz` | `https://peek.gift/api/payment-webhook` | 9 events incl. `checkout.session.*`, `payment_intent.*`, `charge.dispute.*` | enabled |

`we_1TRbB2CEKPUsVee1Qh084LCz` is the **legacy** site's webhook — DO NOT TOUCH per audit brief.

**Drift?** Yes — `we_1Tb7PhCEKPUsVee1Jz6Kcxkb` URL is the legacy `peek-gift-vnext.netlify.app/api/stripe/webhook`, not the new primary `vnext.peek.gift/api/stripe/webhook`. Both routes resolve to the same Netlify deploy (verified — both return `400 missing signature` on unsigned POST), so payments still work. But the Stripe dashboard URL is now technically out of sync with the Netlify primary.

**Risk if not fixed:** Low. Only breaks if the `peek-gift-vnext.netlify.app` hostname is ever removed from the Netlify site, or if a future re-cutover to `peek.gift` apex is done by editing `vnext.peek.gift` → `peek.gift` and someone forgets the webhook endpoint URL also needs updating. Stripe webhook secret stays the same regardless of URL — only the `url` field changes.

Also note: vNext webhook only listens for `checkout.session.completed`. Per BUGS.md B14, vNext webhook should ALSO subscribe to `checkout.session.async_payment_succeeded` for Link/ACH/Klarna (separate fix, not this audit).

**Fix:** Update `we_1Tb7PhCEKPUsVee1Jz6Kcxkb` URL to `https://vnext.peek.gift/api/stripe/webhook` via:
```
curl -X POST https://api.stripe.com/v1/webhook_endpoints/we_1Tb7PhCEKPUsVee1Jz6Kcxkb \
  -u sk_live_***: \
  -d "url=https://vnext.peek.gift/api/stripe/webhook"
```
or in Stripe dashboard → Developers → Webhooks → endpoint → Update details. Signing secret stays the same.

---

### Clerk — Status: 🟡 DRIFT (dashboard fallback URLs) + 🟢 OK (origins / JWT / sign-in)

**What's configured (Clerk instance `ins_3D5VaoJxcxztJvjkHUanDEMdFWG` / domain `clerk.peek.gift`):**

Production app, single domain (`peek.gift`, non-satellite, non-provider).
- `frontend_api_url`: `https://clerk.peek.gift`
- `accounts_portal_url`: `https://accounts.peek.gift`
- `allowed_origins`: `null` (origin allowlist NOT enforced on this plan — would be on Enterprise only)
- `JWKS issuer`: `https://clerk.peek.gift` (verified via `https://clerk.peek.gift/.well-known/jwks.json`)
- Display config (Clerk fallback URLs, used when hosted-page redirects don't carry an explicit `redirect_url`):

| Field | Value |
|---|---|
| `home_url` | `https://peek.gift` |
| `sign_in_url` | `https://accounts.peek.gift/sign-in` |
| `sign_up_url` | `https://accounts.peek.gift/sign-up` |
| `user_profile_url` | `https://accounts.peek.gift/user` |
| `waitlist_url` | `https://accounts.peek.gift/waitlist` |
| `after_sign_in_url` | `https://peek.gift` |
| `after_sign_up_url` | `https://peek.gift` |
| `after_sign_out_one_url` | `https://accounts.peek.gift/sign-in/choose` |
| `after_sign_out_all_url` | `https://accounts.peek.gift/sign-in` |
| `after_switch_session_url` | `https://peek.gift` |
| `after_join_waitlist_url` | `https://peek.gift` |
| `organization_profile_url` | `https://accounts.peek.gift/organization` |
| `create_organization_url` | `https://accounts.peek.gift/create-organization` |
| `after_leave_organization_url` | `https://peek.gift` |
| `after_create_organization_url` | `https://peek.gift` |
| `logo_link_url` | `https://peek.gift` |

vNext code uses Clerk's `<ClerkProvider>` in `app/layout.tsx` without explicit `signInUrl` / `afterSignInUrl` / etc. props, so the dashboard defaults above ARE what fires when a fallback redirect is needed. vNext has its own `/sign-in` and `/sign-up` Next routes (env vars `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` are set), so the in-app auth path is fine — but ANY auth flow that bounces through `accounts.peek.gift` (hosted Clerk UI, OAuth, magic-link confirmations, etc.) will land back on `peek.gift` apex, NOT on `vnext.peek.gift`.

**Drift?** YES on dashboard fallback URLs. NO on origins (allowlist disabled), NO on JWT (issuer is account-bound).

**Risk if not fixed:**
- OAuth `oauth_google` returns user to `after_sign_in_url = https://peek.gift` → **user lands on legacy Vite site instead of vNext app**. This IS user-visible.
- Email-link verification (`enhanced_email_deliverability: false`, `email_link.require_same_client: true` so user must complete in same browser tab) → less likely to land somewhere unexpected, but the `after_sign_in_url` still applies on success.
- Sign-out → `accounts.peek.gift/sign-in` — same hosted page, lower drift impact (user is being sent back to auth, not the app).
- Marketing / branding URLs like `home_url`, `logo_link_url` — affect logo-click target on the hosted accounts portal, low impact.

**Fix:** Either set the Clerk dashboard fallback URLs to vNext-friendly values (Dashboard → Customization → Paths), OR pass explicit redirect props on `<ClerkProvider>` in `app/layout.tsx`:
```tsx
<ClerkProvider
  signInUrl="/sign-in"
  signUpUrl="/sign-up"
  signInFallbackRedirectUrl="/build"
  signUpFallbackRedirectUrl="/build"
  signInForceRedirectUrl="/build"
  signUpForceRedirectUrl="/build"
  afterSignOutUrl="/"
>
```
The in-code approach is safer because the same Clerk app is shared with the legacy peek.gift site, and changing the dashboard fallback URLs to vNext-only would break legacy. **Recommend in-code redirect props on `<ClerkProvider>` rather than dashboard changes.**

Specific paths to land at on vNext post-auth (per code review): `/build` for new sessions (lets the curator land directly in the chat builder). `afterSignOutUrl="/"` returns to landing.

---

### Clerk webhook (Svix) — Status: ⚪ UNKNOWN

**What's configured:** Clerk Webhook UI lives in Svix (`region: eu`, Svix app `app_3EEd4x52zMMj0XGbbdKF0e3rTp3`). The Svix dashboard URL is generated as a one-time-link via:
```
POST https://api.clerk.com/v1/webhooks/svix_url
→ {"svix_url":"https://app.svix.com/login?...#key=..."}
```
The Clerk REST API does NOT expose webhook endpoint URLs — they live entirely in Svix. The signing secret in Netlify env is `CLERK_WEBHOOK_SIGNING_SECRET=whsec_caGug31Qg11rDOEXtC3Pc1wbna1LBy4A` (production+dev+branch+preview all same value, secret since 2026-05-25).

vNext webhook route `/api/webhooks/clerk` is live and returns `400 missing svix headers` on unsigned POST — endpoint is reachable on both `vnext.peek.gift` and `peek-gift-vnext.netlify.app`.

**Drift?** Unknown without manual Svix dashboard check. From STATE.md cutover plan ("Update existing Clerk webhook URL from `peek-gift-vnext.netlify.app/api/webhooks/clerk` to `peek.gift/api/webhooks/clerk`") it's likely currently set to the legacy `peek-gift-vnext.netlify.app/api/webhooks/clerk`. If so, that's URL drift but functionally identical since both hostnames serve the same site.

**Risk if not fixed:** Same as Stripe — purely cosmetic, both URLs work. Breaks only if legacy hostname is removed.

**Fix:** Frank verify manually. Generate the Svix dashboard URL via `POST https://api.clerk.com/v1/webhooks/svix_url` (token: Clerk secret key), open it, check the webhook endpoint URL. If it's on `peek-gift-vnext.netlify.app`, update to `vnext.peek.gift/api/webhooks/clerk`. Signing secret stays.

---

### Supabase — Status: 🟢 OK

**What's configured:**
- Project `ewqpujqerdnrkjqlpobo` (`https://ewqpujqerdnrkjqlpobo.supabase.co`), region `us-east-1`, Postgres 17.6.1
- Storage buckets: `gift-assets` (legacy public, no MIME restriction), `peek-v2-assets` (vNext public, 10MB max, image MIME allowlist)
- Realtime publication `supabase_realtime` includes ONLY `peek_v2.picks` (verified)
- Edge functions: NONE deployed
- Database webhooks (`supabase_functions.hooks`): table doesn't exist, feature unused
- PostgREST CORS: returns `access-control-allow-origin: *` for ANY origin (verified via OPTIONS preflight from both `vnext.peek.gift` and `peek-gift-vnext.netlify.app` and a random origin)
- Storage CORS: same — `*`
- Auth Site URL / Redirect URLs: GoTrue config not readable from the public `/auth/v1/settings` endpoint (those settings are Management-API only); but we don't use Supabase Auth in vNext (Clerk owns auth) and BUGS.md M21 / packet 31 tightened Supabase clients to be service-role driven — so even if site_url/redirect_urls were misconfigured for the legacy Vite app, vNext wouldn't be affected.

**Drift?** No. CORS allows everything; realtime is per-table not per-URL; no edge function URLs; no DB webhooks. Storage URLs always return `*.supabase.co/storage/v1/object/public/peek-v2-assets/...` — site-agnostic.

**Risk if not fixed:** None.

**Fix:** None.

---

### Resend — Status: 🟢 OK

**What's configured:**
- `RESEND_API_KEY` set on Netlify (production context only, masked, can't read value via MCP/CLI)
- `NOTIFICATIONS_FROM = "peek.gift <info@peek.gift>"` — emails come FROM the `peek.gift` apex domain
- DKIM published for `peek.gift`: `resend._domainkey.peek.gift` TXT record exists with valid signing pubkey (verified via Google DoH)

Resend's outbound webhooks (delivered / bounced / etc.) are configured per-domain in the Resend dashboard. Not readable here without the live API key. Atelier code does NOT have any `/api/webhooks/resend` route, so no inbound Resend webhook is wired.

**Drift?** No. Outbound DKIM is at the apex domain (account-level, not per-URL). No inbound webhook in code to drift.

**Risk if not fixed:** None — Resend's outbound webhooks (if Frank ever configured any) would be FROM Resend TO whatever URL was set in the Resend dashboard. Since we have no route for inbound Resend events in atelier code, those webhooks are either disabled or 404 silently (Frank would need to check Resend dashboard to confirm). Worth marking ⚪ UNKNOWN for the optional inbound-webhook subscription side, but no impact on outgoing emails.

**Fix:** None for outbound. If Frank wants email-event tracking (delivered, bounced, complained), provision an `/api/webhooks/resend` route on vNext and point Resend dashboard at `vnext.peek.gift/api/webhooks/resend`. Until then, no action.

---

### Twilio — Status: ⚪ UNPROVISIONED

**What's configured:** No `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` / `TWILIO_WHATSAPP_FROM` env vars on Netlify. `lib/env.ts` declares all four as `.optional()`. SMS sends in `app/api/share/send/route.tsx` no-op when env is empty.

**Drift?** N/A — no vendor config to drift since not yet wired.

**Risk if not fixed:** N/A.

**Fix:** When Twilio is provisioned, ensure:
- Outbound: no URL config (just account creds)
- Inbound SMS webhook (if Frank wants reply-to-SMS): set Twilio phone-number "A MESSAGE COMES IN" webhook to `https://vnext.peek.gift/api/webhooks/twilio` (route doesn't exist yet — would need a packet)
- Status callback URLs (for delivery receipts): `https://vnext.peek.gift/api/webhooks/twilio/status` (route doesn't exist yet)

---

### PostHog — Status: ⚪ UNPROVISIONED

**What's configured:** No `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` env vars on Netlify. Reverse-proxy route `/api/posthog/[...path]` exists in code but no-ops without keys.

CSP allows `https://us.i.posthog.com` and `https://us-assets.i.posthog.com` for `connect-src`, `script-src`. **BUGS.md M23 notes CSP is missing `https://*.posthog.com` and `https://*.ingest.sentry.io` for the `connect-src` whitelist** — that's a separate fix needed before PostHog session replay would work, but not URL drift.

**Drift?** N/A — no vendor config to drift.

**Risk if not fixed:** N/A.

**Fix:** When PostHog is provisioned: ensure the PostHog project's "Authorized URLs" (Project Settings → Authorized URLs) includes both `https://vnext.peek.gift` AND `https://peek-gift-vnext.netlify.app` if you keep both URLs live. Reverse-proxy route auto-resolves via `APP_URL` env, no in-code URL hardcoding to drift.

---

### Sentry — Status: ⚪ UNPROVISIONED

**What's configured:** No `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` env vars on Netlify. `withSentryConfig` is wired in `next.config.mjs` with `tunnelRoute: '/monitoring'` (so client errors POST to the site's own URL, not directly to `*.ingest.sentry.io`).

**Drift?** N/A.

**Risk if not fixed:** N/A.

**Fix:** When Sentry is provisioned: with `tunnelRoute` set, NO Sentry-side URL config is URL-bound (the tunnel route is host-agnostic — wherever the site is served, errors route through `/monitoring` on the SAME host). Source-map uploads at build time also use the DSN, not a URL. No vendor-side URL allowlist to update.

Also see BUGS.md M23: CSP `connect-src` needs `https://*.ingest.sentry.io` added (currently missing). tunnelRoute mitigates this for production but breaks if anything ever bypasses the tunnel.

---

### fal.ai — Status: ⚪ UNPROVISIONED

**What's configured:** No `FAL_KEY` env var on Netlify. `lib/image-gen/fal.ts` calls fal.ai queue API and polls for status. No webhook endpoints used.

**Drift?** N/A.

**Risk if not fixed:** N/A.

**Fix:** When fal.ai is provisioned: code uses poll-based status (not webhook callbacks). No URL config to drift. If Frank later switches to fal.ai's webhook callback mode (for cost / latency), use `vnext.peek.gift/api/webhooks/fal` as the callback URL — route doesn't exist yet.

---

### Inngest — Status: ⚪ UNPROVISIONED

**What's configured:** No `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` env vars on Netlify. App ID `peek-gift-vnext` in `lib/inngest/client.ts`. Serve route at `/api/inngest` uses `inngest/next` `serve()` without explicit `serveHost` — auto-detects from request.

**Drift?** N/A (no creds = no config to drift).

**Risk if not fixed:** N/A.

**Fix:** When Inngest is provisioned, at sync time use `https://vnext.peek.gift/api/inngest` as the "App URL" in Inngest dashboard. The `serve()` auto-detect will handle it correctly on subsequent syncs. Don't sync against `peek-gift-vnext.netlify.app` even though it works — primary URL is `vnext.peek.gift`.

---

### Skimlinks — Status: ⚪ UNPROVISIONED (config drift would occur if naively followed packet 24 spec)

**What's configured:** No `SKIMLINKS_PUBLISHER_ID` / `SKIMLINKS_WEBHOOK_SECRET` env vars. Webhook route `/api/webhooks/skimlinks` is live but returns `500 not configured` (verified — both URLs respond identically). Per packet 24 NOTES.md, the planned webhook URL was `peek-gift-vnext.netlify.app/api/webhooks/skimlinks` — that would now be drift.

**Drift?** Would-be drift if Skimlinks account is created and the webhook is naively set to the URL from packet 24 NOTES.md.

**Risk if not fixed:** Once Skimlinks is provisioned and the first affiliate revenue webhook fires, it would hit the legacy hostname rather than the primary. Same site, so still works, but config-out-of-sync.

**Fix:** When Skimlinks account is provisioned, set the dashboard webhook URL to `https://vnext.peek.gift/api/webhooks/skimlinks` (not `peek-gift-vnext.netlify.app/...`). Note BUGS.md M14 (signature format guessed) is a separate, independent fix needed at the same provisioning step.

---

### Sovrn — Status: ⚪ UNPROVISIONED

**What's configured:** No `SOVRN_API_KEY` env var. No inbound webhook route exists in atelier code (CONCEPT-INVENTORY §4 calls this a gap).

**Drift?** N/A.

**Risk if not fixed:** N/A.

**Fix:** When provisioned, plan for `vnext.peek.gift/api/webhooks/sovrn` (route doesn't exist; would need a packet).

---

### Google Places — Status: 🟡 OPEN KEY (not URL drift, but worth flagging)

**What's configured:**
- `GOOGLE_PLACES_API_KEY` and `VITE_GOOGLE_PLACES_API_KEY` both set on Netlify (same value `AIzaSyCQvzvR_eZhGExaVBIwjbZjHyCCe4X7XWA`)
- Key tested with `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` from:
  - `Referer: https://vnext.peek.gift/` → 200 ZERO_RESULTS
  - `Referer: https://peek-gift-vnext.netlify.app/` → 200 ZERO_RESULTS
  - `Referer: https://random.example.com/` → 200 ZERO_RESULTS
  - No `Referer` (server-side) → 200 ZERO_RESULTS

→ **Key has NO HTTP-referer restrictions configured in Google Cloud Console**.

**Drift?** Not URL drift — the key works from both URLs. But the key is over-permissive (works from anywhere).

**Risk if not fixed:** Not vnext drift, but the key is exfilable from the client bundle (`VITE_GOOGLE_PLACES_API_KEY` was used by legacy Vite, and `GOOGLE_PLACES_API_KEY` is server-side per code review of `app/api/scrape`). If `VITE_*` is still emitted in any client bundle of the legacy Vite site (or anywhere), a third party could lift the key and burn quota. **Not in scope of this audit.**

**Fix:** When time permits (separate concern), in Google Cloud Console → APIs & Services → Credentials → restrict the key to HTTP-referer `*peek.gift/*`, `*vnext.peek.gift/*`, `*peek-gift-vnext.netlify.app/*` (or migrate to a server-only key with IP allowlist). NOT urgent for vnext audit.

---

### Upstash Redis — Status: ⚪ UNPROVISIONED

**What's configured:** No `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` env vars (BUGS.md M22). Per-account REST endpoint URL is set by Upstash at creation time and is account-internal — no per-site URL config to drift.

**Drift?** N/A.

**Risk if not fixed:** N/A for vNext URL audit. (BUGS.md B15 + M22 cover the separate concern that rate-limit + idempotency fall OPEN without Upstash.)

**Fix:** None for this audit. When Upstash is provisioned, ensure both vars are set on all Netlify contexts (production, branch-deploy, deploy-preview, dev).

---

### Browserbase & ZenRows — Status: 🟢 OK

**What's configured:**
- `BROWSERBASE_API_KEY` (secret) + `BROWSERBASE_PROJECT_ID = 5221d287-330d-4b19-806a-2103ad8d28f9` set on Netlify (production)
- `ZENROWS_API_KEY` (secret) set on Netlify (production)

Both are outbound-only HTTP scraping APIs — no inbound URL config to drift. (BUGS.md M13 notes the Browserbase endpoint shape in our code may be wrong, but that's an API-shape bug, not URL drift.)

**Drift?** No.

**Risk if not fixed:** None.

**Fix:** None.

---

### GitHub — Status: 🟢 OK

**What's configured:**
- Repo `glacialsips-site/grook-peekgift`
- Netlify-GitHub link: deploy-key only (`deploy_key_id: 6a14c8849db1b236675f107f` per STATE.md). The Netlify GitHub App is NOT installed (user's Netlify account uses Google OAuth, not GitHub OAuth).
- Push-to-deploy: GitHub Actions workflow `.github/workflows/netlify-deploy.yml` POSTs to Netlify build hook `https://api.netlify.com/build_hooks/6a14cf135c167288ad60f6a9?trigger_branch=atelier-integration` on every push to `atelier-integration` or `main`. This URL is Netlify's API, NOT a site-bound URL — host-agnostic.
- GitHub MCP doesn't expose a `list_hooks` operation, and the `gh` CLI isn't available in this sandbox, so I can't directly enumerate any installed GitHub repo-level webhooks. But STATE.md is explicit that the link is deploy-key only, no GitHub webhook integration.
- No OAuth apps configured (verified via Clerk API `oauth_applications: []`).

**Drift?** No.

**Risk if not fixed:** None.

**Fix:** None.

---

## Minor / informational drift NOT vendor config

These are app-side URL stalenesses that the audit surfaced but aren't in the "backend vendor URL config" scope:

| Where | What | Severity |
|---|---|---|
| `.github/workflows/ci.yml:19` | `env: APP_URL: https://peek-gift-vnext.netlify.app` in CI build env. Just a stub value — CI tests use mock URLs everywhere. Doesn't leak to runtime. | TRIVIAL |
| `atelier/lib/email/templates/relationship-nudge.tsx:84` | `<a href="https://peek.gift/build">` — hardcoded LEGACY apex URL in nudge email template. Should use `${env.APP_URL}/build` to match all other email templates that DO use `APP_URL`. | MINOR (only fires when Inngest nudges run — currently unprovisioned, so no current user impact) |
| `atelier/next.config.mjs:51-52` | `remotePatterns` includes `**.netlify.app` and `peek.gift` but NOT `vnext.peek.gift`. Next.js `<Image>` from `vnext.peek.gift` would need `*.peek.gift` added. Not relevant for own-host images, only for cross-host references. | TRIVIAL |
| BUGS.md M23 (separate) | CSP `connect-src` missing `https://*.posthog.com` and `https://*.ingest.sentry.io` — needed when PostHog/Sentry are provisioned. | MINOR (separate issue) |

---

## Frank needs to verify manually

Items that require manual dashboard inspection (no programmatic access in this audit context):

1. **Clerk webhook endpoint URL in Svix** — generate the Svix one-time-link via `POST https://api.clerk.com/v1/webhooks/svix_url` with the Clerk secret key, then open the URL and check the endpoint. If it's on `peek-gift-vnext.netlify.app/api/webhooks/clerk`, update to `https://vnext.peek.gift/api/webhooks/clerk`. (Signing secret stays.)

2. **Resend outbound-webhook subscriptions** — Resend dashboard → Webhooks. We don't consume any inbound Resend events in atelier code (no `/api/webhooks/resend` route), so any subscriptions here are no-ops, but if any were configured manually pointing at `peek-gift-vnext.netlify.app/...`, they should either be disabled or repointed once we add a route.

3. **Stripe webhook endpoint URL** — update via API or dashboard to `https://vnext.peek.gift/api/stripe/webhook` (single field change; signing secret unchanged). Endpoint ID: `we_1Tb7PhCEKPUsVee1Jz6Kcxkb`.

4. **Clerk dashboard fallback redirect URLs** — recommend in-code fix on `<ClerkProvider>` instead. If choosing dashboard fix instead, navigate to Dashboard → Customization → Paths and update home/after-sign-in/after-sign-up to either `https://vnext.peek.gift/` and `https://vnext.peek.gift/build`, OR set them to relative paths (`/` and `/build`) — but note this Clerk app is SHARED with legacy peek.gift, so changes affect both. **The in-code `<ClerkProvider>` prop approach is safer.**

5. **Google Places API key restrictions** (separate from URL drift but flagged here) — Google Cloud Console → Credentials → restrict `AIzaSyCQvzvR_eZhGExaVBIwjbZjHyCCe4X7XWA` to HTTP referers `*peek.gift/*`, `*vnext.peek.gift/*`, `*peek-gift-vnext.netlify.app/*`. Or rotate to a server-only key with IP allowlist.
