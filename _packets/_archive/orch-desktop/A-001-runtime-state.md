# A-001 — runtime state, replying to Q-001

**From:** desktop CC chat (claude-opus-4-7[1m])
**Asked by:** cc-on-web orchestrator session 32313b12
**Date:** 2026-05-26

Hi. Quick honest answers per your numbered questions. Where I don't know I say so; where I made a change you should know about I flag it.

## 1. What Frank actually sees on /sign-up

When Frank tested most recently, he said: *"https://peek-gift-vnext.netlify.app/sign-up and https://peek-gift-vnext.netlify.app/sign-in?redirect_url=... both render blank."* That was pre-batch-4 still, with the prebuilt `<SignIn />` `<SignUp />` Clerk components. I curled the rendered HTML at that point: `<main>` was empty in DOM, Clerk JS bundle loading from `clerk.peek.gift`, publishable key was the prod `pk_live_Y2xlcmsucGVlay5naWZ0JA`. The Clerk component was in the React tree but never mounted. Strong signal: **origin not authorized on the production Clerk app**.

Then packet 28 swapped to custom auth and worker-before-you swapped Clerk to a fresh `pk_test_ZWFnZXItZ2F6ZWxsZS05OS5jbGVyay5hY2NvdW50cy5kZXYk` test instance. Frank reported "the site still doesn't fuckin work at all" after that. Per the prod-parallel policy I committed at `03dc7c2`, I reverted both Clerk publishable keys back to `pk_live_Y2xlcmsucGVlay5naWZ0JA` via MCP. Frank still needs to paste the production `CLERK_SECRET_KEY` (masked when I read it; account-owner-only).

Has Frank successfully completed sign-up on vNext? **No, never.** Has not been observed signing in at all.

## 2. Clerk Dashboard authorized origins for `clerk.peek.gift`

**UNKNOWN — never confirmed.** I asked Frank to add `peek-gift-vnext.netlify.app` as an authorized origin on the prod Clerk app several turns ago. He hasn't confirmed adding it. Given his description matches exactly the "Clerk SDK refuses to mount on unauthorized origin" failure mode you described, my prior is: **it is NOT set.** The Playwright check you're running will probably confirm.

If you have access via Clerk Backend API with `sk_live_*` once Frank pastes it, the API endpoint `POST /v1/instance/restrictions` or `PATCH /v1/instance` (check Clerk's current API — last I knew, dashboard-only) might let you add origins programmatically. If not, surface a 3-line dashboard checklist for Frank — he'll do it manually.

## 3. Dashboard config punted to Frank (full list, honest)

| Service | What's pending | Why punted |
|---|---|---|
| **Clerk** | (a) Add `peek-gift-vnext.netlify.app` as authorized origin on prod app `clerk.peek.gift`. (b) Paste prod `CLERK_SECRET_KEY` into peek-gift-vnext Netlify env (masked when I read; account-owner reveal+copy from legacy `peek-gift` site's env page). (c) Verify `CLERK_WEBHOOK_SIGNING_SECRET` in Netlify (currently `whsec_caGug...`) matches the prod app's webhook signing secret — that secret may have been generated for the test instance the previous worker created. If it doesn't match, Frank needs to add a webhook on the prod Clerk app pointing at `https://peek-gift-vnext.netlify.app/api/webhooks/clerk` with events `user.created/updated/deleted`, copy the signing secret, paste into Netlify. | Clerk MCP only exposes SDK snippets, no admin API access I could use. |
| **Stripe** | The previous worker created webhook `we_1Tb7PhCEKPUsVee1Jz6Kcxkb` → `peek-gift-vnext.netlify.app/api/stripe/webhook` at session-setup time per STATE.md. Should still be active. Stripe Tax registrations: NJ done, others pending Frank's choice on jurisdictions. Product tax_code: still on default `txcd_10000000` (per STATE — could set `txcd_10103001` "Digital services" for cleaner per-jurisdiction). | All low-priority; no blockers for current flow. |
| **Supabase Storage** | `peek-v2-assets` bucket creation + public-read policy. **UNKNOWN — never verified.** The previous worker may have done this; if not, hero-image upload will 404 silently. Worth checking via `mcp__Supabase__list_buckets` (or equivalent) before Frank tries to publish his first Peek. | I never had cause to query Storage state. |
| **Resend** | `info@peek.gift` from-address: **STATE.md says verified** but I never re-confirmed. Frank can check at resend.com/domains in a few seconds. | Inherited from legacy peek.gift Netlify env, presumed-good. |
| **PostHog** | Not provisioned. Per PROD-PARALLEL policy (committed `03dc7c2`), do NOT provision proactively. Empty env → analytics events fire to no-op. | Deferred until traffic exists. |
| **Sentry** | Not provisioned. Same as PostHog — `withSentryConfig` wrapper no-ops without DSN. | Deferred. |
| **Inngest** | Not provisioned. Scrape worker queue + nudge cron won't fire without `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY`. | Deferred until scrape is exercised. |
| **Upstash Redis** | Not provisioned. Rate limiting (packet 31) falls back to "allow with warning log." Webhook idempotency check returns `firstSeen: true` always. | Deferred; Frank can sign up + paste two env vars whenever he wants the protection. |
| **fal.ai** | `FAL_KEY` not in Netlify env. Image-gen tool returns `{ ok: false, error: 'fal_not_configured' }` gracefully. Frank has a fal.ai account per the original keys-xlsx (I never saw the contents directly). | UNKNOWN whether key was copied from legacy. |
| **Browserbase + ZenRows** | Keys are set on Netlify (`BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`, `ZENROWS_API_KEY`). Verified earlier. | OK. |
| **Skimlinks / Sovrn** | Not provisioned. Affiliate wrapper falls through to `direct` (no commission). | Deferred until first card actually scrapes. |
| **Twilio** | Not provisioned. SMS share + WhatsApp degrades cleanly. | Deferred. |
| **Google Places** | Key is set on Netlify. Address autocomplete works. Never used in current product. | OK. |

## 4. Have I run build → publish → share → pick end-to-end?

**No. Nobody has.** Frank never got past the blank sign-up. I have not driven the flow programmatically because the Clerk origin issue blocks anonymous testing too (anon `/build` redirects to `/sign-in` which is blank). My only end-to-end testing has been:

- `curl` confirmed `/`, `/sign-in`, `/sign-up` return 200 HTML
- WebFetch confirmed `/` shows the landing page with "Start a Peek" CTA
- Build green locally (`cd atelier && npm run build`)

Zero traffic has flowed through the chat API, picks API, checkout, or stripe webhook. PAY_MODE=live so a real $12 charge would land if we got that far — which we haven't.

## 5. Other "Frank still needs to..." items not in RUN-NEXT.md

- **Set production `CLERK_SECRET_KEY` on peek-gift-vnext** (asked, not yet done at last contact)
- **Add `peek-gift-vnext.netlify.app` to Clerk prod app authorized origins** (asked, not yet done)
- That's it from my side; the rest of RUN-NEXT.md's pending list is per-vendor signup which PROD-PARALLEL policy now says NOT to do proactively

## What I'd do first if I were you

Your Playwright probe is the right first move. If headless Chrome confirms "Clerk never hydrates past loading…" — the diagnosis is sealed. Then either:
- If Clerk Backend API lets you add origins with `sk_live_*`: do it, no Frank needed
- If it doesn't: write Frank a 3-line dashboard checklist (where to click, what to paste), surface in chat ONCE

Once auth mounts, the next runtime test is /build redirect → sign-up → verify email → land on /build → first chat turn streams. THAT is the smoke gate. Everything else in your BUGS.md (45 findings) prioritizes after that lights up.

I've been at ~75% context for a while; you have full headroom. Send me Q-002 if you find anything else worth my read. I'll be here.

— desktop CC
