# CUTOVER — vNext → peek.gift apex

When the vNext build is "fucking insane" enough to take over, this is how `peek.gift` apex becomes the production URL. Same Netlify project, same Clerk app, same Stripe account, same Supabase project, same everything. Zero key migration. Zero user migration.

## Current state (post-merge, 2026-05-27)

- **Netlify project**: `peek-gift-vnext` (id `932646db-e8be-42f1-a94b-a57bb733e308`)
- **Primary URL**: `https://vnext.peek.gift` (custom-domain alias, set as primary in Netlify config)
- **Default URL**: `https://peek-gift-vnext.netlify.app` (Netlify default subdomain — still resolves, secondary)
- **Branch deploy URL pattern**: `https://<branch>--peek-gift-vnext.netlify.app`
- **Legacy site**: `peek.gift` apex still served by the legacy Vite app (separate Netlify project, public Postgres schema)

## The cutover (5 steps, all on the same Netlify project)

1. **Add `peek.gift` as a custom domain on `peek-gift-vnext`.** Netlify Dashboard → Domain management → Add domain. Same project, no rebuild. Domain alias just gets added to the project's domain list. SSL provisioned automatically via Netlify.

2. **Swap Stripe webhook endpoint URL.** Stripe Dashboard → Developers → Webhooks → endpoint `we_1Tb7PhCEKPUsVee1Jz6Kcxkb`. Change URL from `peek-gift-vnext.netlify.app/api/stripe/webhook` (or `vnext.peek.gift/api/stripe/webhook` if URL audit confirms it's been updated) to `peek.gift/api/stripe/webhook`. Signing secret stays. Single field edit. (Legacy webhook `we_1TRbB2CEKPUsVee1Qh084LCz` → `peek.gift/api/payment-webhook` is the OLD route on the LEGACY app — once legacy is decommissioned, delete this webhook.)

3. **Swap Clerk webhook endpoint URL.** Clerk Dashboard → Webhooks → endpoint for vNext. Change URL from current to `peek.gift/api/webhooks/clerk`. Signing secret stays.

4. **Update `APP_URL` env var.** Netlify Dashboard → Site settings → Environment variables → `APP_URL`. Change from `https://vnext.peek.gift` to `https://peek.gift`. Affects share-URL generation, callback URLs, OG image generation. Single env-var edit. (Watch BUGS.md M01-carryover — `share_url` is currently built with `env.APP_URL` at write time; existing published peeks in DB will still point at `vnext.peek.gift` until that's fixed to build lazily. Either fix M01 first or run a one-time UPDATE on the `share_url` column post-cutover.)

5. **Disable legacy Supabase JWT-based API keys.** Only AFTER legacy peek.gift Vite site is fully decommissioned (no longer serving any traffic). Supabase Dashboard → API → Disable JWT-based API keys. This drops the legacy auth path. The vNext side is already on the modern `sb_secret_*` / `sb_publishable_*` keys.

## What stays the same

- Clerk app `clerk.peek.gift` (`pk_live_Y2xlcmsucGViay5naWZ0JA`)
- Stripe live keys
- Supabase project `ewqpujqerdnrkjqlpobo` (peek_v2 schema)
- Resend domain `peek.gift` (already verified)
- Browserbase / ZenRows / Skimlinks / Sovrn / Twilio / fal.ai / Google Places — all account-level, URL-agnostic
- The Netlify project, its build pipeline, all env vars except `APP_URL`
- All deployed code, the entire `atelier/` codebase

## What needs verification before cutover

Driven by the parallel URL audit (`URL-AUDIT.md`). Categories:

- **Clerk authorized origins**: `peek.gift` apex must be in the allowed-origins list before flipping. If `vnext.peek.gift` is currently the only allowed origin, cutover would break auth until `peek.gift` is added. **Add `peek.gift` to authorized origins BEFORE step 4 (APP_URL swap).**
- **Stripe**: webhook endpoint URL is the only URL Stripe knows about; covered in step 2.
- **Supabase**: no public-facing URL to update (no Supabase Auth use). RLS policies don't care about URL. Storage bucket access is per-key, not per-origin.
- **PostHog**: per `next.config.mjs` CSP, PostHog allowed-origin should include `peek.gift` apex. Add via PostHog Dashboard → Project Settings → Authorized URLs.
- **Sentry**: CSP allows `*.ingest.sentry.io`. Sentry Dashboard → Project Settings → Allowed Domains should include `peek.gift`.
- **Skimlinks**: publisher account-level allowed domains. Add `peek.gift` BEFORE cutover or click-tracking breaks.
- **fal.ai**: callback webhook URLs (if any async image gen webhooks are configured to call back). Likely not — most fal.ai jobs are polled, not webhook'd.
- **Inngest**: serve URL is set in `lib/inngest/client.ts` and routes through `/api/inngest`. Update to `peek.gift/api/inngest` in Inngest Dashboard → App settings.
- **Google Places API key**: HTTP referrer restrictions. If restricted to `vnext.peek.gift/*`, add `peek.gift/*` before cutover or Places calls 403.

## Rollback

If something breaks post-cutover, rollback is also 5 single-field reverts:
- `APP_URL` back to `vnext.peek.gift`
- Stripe webhook URL back to vnext
- Clerk webhook URL back to vnext
- Netlify custom domain: remove `peek.gift` (legacy Vite Netlify project takes over again automatically since it had the apex prior)
- Supabase JWT keys: re-enable (if disabled)

No data migration to undo. No keys to rotate. Just URL field reverts.

## When to cut over

Decision is Frank's. Suggested trigger: spine docs landed + Tier 0 capability inventory items shipped + 2 weeks of vNext at `vnext.peek.gift` with real Insta-ad traffic showing no critical regressions.

Once cut over, the legacy Vite peek.gift app is decommissioned. Delete the legacy Netlify project. Delete the legacy Stripe webhook. Then disable legacy Supabase JWT keys.
