# AUDIT-ENVS-001 — full env / key / version audit across vendors

_Generated 2026-05-26 by desktop CC (cloud-routed) at Frank's request to verify dev/prod cleanliness across Netlify, Supabase, Stripe, Clerk, Anthropic, Browserbase, ZenRows, Resend, Google Places, and dep versions._

## Method

Pulled live state via MCP: Netlify env vars on both `peek-gift-vnext` (siteId `932646db-e8be-42f1-a94b-a57bb733e308`, primary URL `https://vnext.peek.gift`) and `peek-gift` (siteId `69732dcb-659b-49a7-9d27-88184818bcd8`, primary URL `https://peek.gift`). Compared against `atelier/lib/env.ts` zod schema and CLAUDE.md PROD-PARALLEL policy. Subagent checked all 33 atelier deps against npm registry latest.

---

## CRITICAL — the actual reason auth is dead on vNext

### 🚨 1. `CLERK_SECRET_KEY` in production context is a **test key**, not the prod live key

vNext has FIVE values stored for this var:

| Context | Value (tail) | Tier |
|---|---|---|
| `dev` | `sk_test_KXtNn9m8...vUEz` (visible) | **TEST** |
| `branch-deploy` | `****vUEz` | TEST (same as dev) |
| `deploy-preview` | `****vUEz` | TEST |
| **`production`** | **`****vUEz`** | **TEST** ← live builds use this |
| `branch:"0526 357am prodsec"` | `****3o1O` | **prod live** (matches legacy peek-gift's production CLERK_SECRET_KEY tail) |
| `branch:"0526 408am cc chat is guessing"` | `****80LD` | unknown — third value, possibly stale |
| `dev-server` | `****80LD` | unknown |

The Netlify production context resolves to `sk_test_*` while `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` resolves to `pk_live_Y2xlcmsucGVlay5naWZ0JA`. The Clerk JS SDK loads against the **live** instance using the publishable key, then the server tries to validate the session token against `sk_test_*` — that returns "invalid environment / unauthorized" silently, leaving the React tree stuck at "loading…" forever. **This is the root cause of the dead /sign-up + /sign-in pages.**

**Fix:** Promote the `****3o1O` value from branch `"0526 357am prodsec"` to the production context (and to branch-deploy + deploy-preview). Delete the `sk_test_*` value entirely. Delete the unknown `****80LD` branch (looks like Frank pasted speculation). One MCP call per context.

Legacy peek-gift's production CLERK_SECRET_KEY is also `****3o1O` ✓ — same prod key, two URLs, matches PROD-PARALLEL.

### 🚨 2. `CLERK_WEBHOOK_SIGNING_SECRET` may be from the dead test instance

vNext has `whsec_caGug31Qg11rDOEXtC3Pc1wbna1LBy4A` across all contexts. Per HANDOFF.md §3, this secret "may have been generated for the test instance the previous worker created" (`eager-gazelle-99.clerk.accounts.dev`, since reverted).

**To verify:** Frank checks `dashboard.clerk.com` → peek.gift app (clerk.peek.gift) → Webhooks. Either:
- A webhook already exists pointing at `https://vnext.peek.gift/api/webhooks/clerk` with this exact signing secret → ✓ no action.
- No such webhook exists, OR the secret differs → create/recreate the webhook on the prod Clerk app, copy its signing secret, paste here.

Until verified, Clerk user.created / .updated / .deleted webhooks will fail signature validation and silently no-op (the route returns 400 "missing svix headers" or "invalid signature").

### 🚨 3. Clerk authorized origin on prod app is still NOT verified

Per A-001 + HANDOFF.md §3. The Clerk MCP only exposes SDK snippets, not Backend API admin. I CAN attempt to call `https://api.clerk.com/v1/instance` with sk_live_* once the prod secret is in production context — but the secret value is masked when read via Netlify MCP, so even after the fix in #1, the live value never enters my context.

**Two options:**
- Frank does it in the dashboard (Configure → Domains → add `vnext.peek.gift`).
- Frank pastes sk_live_* into chat ONCE (already in his Netlify env, just masked from me). I curl Clerk's API to add the origin programmatically and confirm.

---

## HIGH — exposure / misclassification issues

### ❌ 4. `STRIPE_SECRET_KEY` is **not flagged secret** on either site

```json
{"key":"STRIPE_SECRET_KEY", "value":"sk_live_51T4xnb...Rnwff9E", "is_secret": false}
```

The full live secret key is visible in plaintext to anyone with Netlify project read access (including this MCP session). Should be `is_secret: true` so dashboard reads mask it. Same exposure on legacy peek-gift.

**Fix:** upsert with `envVarIsSecret: true` on both sites. One MCP call each.

### ❌ 5. `DATABASE_URL` is **not flagged secret**, contains pooler password

```
postgresql://postgres.ewqpujqerdnrkjqlpobo:Q5SDkfs7eJcKJTZl@aws-1-us-east-1.pooler.supabase.com:6543/postgres
```

`Q5SDkfs7eJcKJTZl` is the Supabase pooler password, embedded in plaintext, `is_secret: false`. Same on both sites. Supabase poolers are publicly addressable, so this IS a leak vector.

**Fix:** flip to `is_secret: true`. Optionally rotate the pooler password via Supabase Dashboard if you suspect it's been logged anywhere.

### ❌ 6. Legacy site `STRIPE_WEBHOOK_SECRET` is not flagged secret either

```json
{"key":"STRIPE_WEBHOOK_SECRET", "value":"whsec_dp5ZhEyd...gkAw", "is_secret": false}
```

On legacy peek-gift only. vNext's STRIPE_WEBHOOK_SECRET is correctly `is_secret: true`. Legacy is decommissioning so lower priority, but worth fixing if Stripe webhook leak matters.

---

## MEDIUM — drift / cleanliness, not blocking

### 🤔 7. vNext has stale `VITE_*` env vars from initial site clone

`VITE_APP_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_GOOGLE_PLACES_API_KEY`, `VITE_USE_MOCK_API` are all set on vNext but the atelier Next.js code reads NONE of them (only `NEXT_PUBLIC_*` + non-prefixed). These are leftover from when vNext was cloned from peek-gift (Vite).

**Fix:** delete all 5. Reduces drift surface. Net-net: 5 env vars deleted, no behavior change.

### 🤔 8. vNext has `ITEM_VISION=real` and `ITEM_SCRAPE=real`

Legacy peek-gift feature flags. atelier code doesn't read these. Harmless but cluttering.

**Fix:** delete both on vNext.

### 🤔 9. vNext has `GUEST_CHECKOUT_MODE=open`

Legacy Vite app flag. Not read in atelier. Delete.

### 🤔 10. `APP_URL` on vNext = `https://vnext.peek.gift`, but HANDOFF + STATE still reference `peek-gift-vnext.netlify.app`

Frank set up a custom subdomain. The Netlify primary URL is now `vnext.peek.gift`. Anywhere our docs say "peek-gift-vnext.netlify.app" is stale (it still works as a fallback, but the canonical sandbox URL is `vnext.peek.gift`).

**Action:** Sweep STATE.md / RUN-NEXT.md / HANDOFF.md / Q-001 / A-001 for stale URL references and update.

### 🤔 11. `STRIPE_WEBHOOK_SECRET` on vNext also has `dev` context visible (`whsec_xzM4NY...nJ2w`)

The dev context plaintext is publicly readable. Lower priority since this is the vNext webhook secret specifically (only paired with the vNext Stripe webhook endpoint, signed events still need Stripe-side compromise to forge). But still — Netlify dev context exposes plaintext to anyone with project access.

**Fix:** delete the dev context value (no `netlify dev` workflow uses this on Frank's machine anyway), keep only production + branch-deploy + deploy-preview as masked.

### 🤔 12. `CLERK_SECRET_KEY` dev context exposes the sk_test plaintext

Same issue as #11 — `sk_test_KXtNn9m8...vUEz` visible in plaintext via dev context. Once #1 is fixed and the test key is removed entirely, this resolves.

---

## LOW — informational

### ✓ 13. Netlify `peek-gift-vnext.NPM_FLAGS` is unset on vNext — clean
Legacy peek-gift has `NPM_FLAGS=--legacy-peer-deps` which violates the build principle for that codebase — but it's the Vite scrap site, not vNext. Untouched.

### ✓ 14. `SECRETS_SCAN_OMIT_KEYS=GOOGLE_PLACES_API_KEY,VITE_GOOGLE_PLACES_API_KEY` on both
Standard Netlify pattern. Google Places key is embedded in client bundle by design (referrer-restricted on Google side).

### ✓ 15. Supabase Storage buckets state
- `gift-assets` (legacy, public, no size/MIME limits): 1 hero image from legacy site.
- `peek-v2-assets` (vNext, public, 10MB limit, JPEG/PNG/WEBP/GIF allowed): **0 objects**. Confirms no human has uploaded anything to vNext.

### ✓ 16. peek_v2 RLS policies (4 active)
`peeks_anon_select_published`, `cards_anon_select_published_peek`, `variant_groups_anon_select_published_peek`, `picks_anon_select_published_peek`. All gated by `peeks.status IN ('published', 'claimed')`. Default-deny applies to everything else — server routes use service-role to bypass. 7 advisor INFO findings for peek_v2 tables (users, peek_collaborators, relationships, events, affiliate_revenue, chat_messages, webhook_log) flagging "RLS enabled but no policies" — this is INTENTIONAL (server-only via service-role). 6 advisor findings for legacy `public.*` tables — same posture, untouched.

### ✓ 17. Supabase keys
- Anon legacy JWT (`eyJhbGc...`) still ACTIVE, intentional (legacy Vite uses it).
- New `sb_publishable_dxaQo6pxBg-onk4hyeqw_g_zixFDFJB` ACTIVE, used by vNext.
- Service-role on Netlify (`sb_secret_9uTUiN...Ymui`) is modern sb_secret_* format, same value on both sites.

### ✓ 18. Stripe
- Single account `acct_1T4xnbCEKPUsVee1` (Frank DeAndino), live mode.
- Webhook secrets differ between sites (intentional — separate endpoints per URL, same account).
- All publishable keys + secret key + price ID match across sites where they should.
- Stripe MCP doesn't expose webhook endpoint list — can't verify the actual endpoint URLs from here. Per STATE.md, vNext endpoint `we_1Tb7PhCEKPUsVee1Jz6Kcxkb` exists and points at `peek-gift-vnext.netlify.app/api/stripe/webhook` (NOT `vnext.peek.gift` — if Frank wants the canonical subdomain, the webhook URL needs updating).

### ✓ 19. Anthropic, Browserbase, ZenRows, Resend, Google Places keys
All matching tails between vNext and legacy. Same prod keys, single instance, two URLs. ✓ PROD-PARALLEL.

### ✓ 20. Missing env vars (deferred per PROD-PARALLEL)
Not set on vNext, intentional, code degrades gracefully:
- `FAL_KEY`
- `TWILIO_*` (4 vars)
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY`
- `SKIMLINKS_*`, `SOVRN_API_KEY`, `TOLT_API_KEY`
- `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_AUTH_TOKEN`
- `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST`

DO NOT provision proactively. Surface in NOTES.md when a packet hits one.

### ✓ 21. Dependency versions — ALL CURRENT
Subagent checked all 33 atelier deps against npm registry. Zero material drift. Caret ranges already resolve forward for the two patch updates pending (posthog-node 5.35.1→5.35.2, resend 6.12.3→6.12.4). React 19.2.6, Next 16.2.6, TS 6.0.3, Tailwind 4.3.0, Vitest 4.1.7, ESLint 10.4.0, Stripe 22.1.1, Clerk 7.4.1, Sentry 10.53.1, Zod 4.4.3, Drizzle 0.45.2 — all at latest stable. ✓ Build principle satisfied.

---

## Proposed fix order

| # | Action | MCP-doable | Risk | Effect |
|---|---|---|---|---|
| 1 | Promote `****3o1O` value from branch context to PRODUCTION + branch-deploy + deploy-preview on vNext CLERK_SECRET_KEY | NO (secret value is masked when reading) — Frank must paste sk_live_* once OR re-do via Netlify dashboard | high — unblocks all auth | Site auth mounts, sign-up flow lights up |
| 2 | Delete vNext CLERK_SECRET_KEY `sk_test_*` value from dev + branch-deploy + deploy-preview + production | YES (delete by context) | low | Drops dev/prod mixing |
| 3 | Verify CLERK_WEBHOOK_SIGNING_SECRET against prod Clerk app | NO — dashboard check or Backend API call with sk_live_* | medium — affects user.created sync | Webhooks validate |
| 4 | Add `vnext.peek.gift` (and `peek-gift-vnext.netlify.app`) as authorized origin on prod Clerk app | NO — dashboard or sk_live_* | high — second blocker for auth | Clerk SDK can bind |
| 5 | Flip vNext STRIPE_SECRET_KEY to `is_secret: true` | YES | low | Stops plaintext exposure |
| 6 | Flip vNext DATABASE_URL to `is_secret: true` | YES | low | Stops password exposure |
| 7 | Delete stale VITE_* + ITEM_* + GUEST_CHECKOUT_MODE from vNext (8 vars) | YES | none | Reduces drift |
| 8 | Update STATE/HANDOFF/RUN-NEXT URL refs from `peek-gift-vnext.netlify.app` → `vnext.peek.gift` | YES — file edits | none | Doc accuracy |
| 9 | Update Stripe webhook endpoint URL on vNext from `peek-gift-vnext.netlify.app/api/stripe/webhook` to `vnext.peek.gift/api/stripe/webhook` (Stripe MCP doesn't expose; needs dashboard OR direct sk_live API curl) | NO via MCP | low — both URLs route to same site as long as DNS is configured | Cleaner ops |
| 10 | Flip legacy STRIPE_WEBHOOK_SECRET to is_secret=true | YES | low | Stops plaintext exposure |

Items 1, 3, 4 are blocking for first real user signup. 2, 5, 6, 7, 8 are housekeeping I can do via MCP right now. 9, 10 are nice-to-haves.

---

## What I cannot determine from this session

- Whether the prod Clerk app currently has `vnext.peek.gift` as an authorized origin (Clerk MCP = SDK snippets only).
- Whether the prod Clerk app has a webhook configured for `vnext.peek.gift/api/webhooks/clerk` (same reason).
- Whether the Stripe webhook URL is canonical (Stripe MCP doesn't expose webhook endpoint list).
- Whether the prod CLERK_SECRET_KEY tail `3o1O` is current (could have been rotated since the branch-context paste).
- Anthropic API key validity (can't ping without echoing).
- Resend domain verification status for `info@peek.gift` (no Resend MCP).
