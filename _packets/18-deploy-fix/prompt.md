# Packet 18 — Get peek-gift-vnext actually deploying (Netlify)

- **Worker:** cc-on-web (preferred — may have broader CLI / browser / API access than the orchestrator)
- **Branch:** `claude/packet-18-deploy-fix`
- **Depends on (sequencing):** `atelier-integration` (build is green locally on this branch)
- **Imports from siblings:** none (orchestration / deploy work, no code-graph changes)
- **Validation:** the production URL `https://peek-gift-vnext.netlify.app/` returns 200 and the landing page renders without errors
- **Target paths:** mostly env config (no code changes expected; if you need to add `atelier/netlify.toml` tweaks, commit them on the branch and the orchestrator will integrate)

## Context

The orchestrator (a separate Claude session on this same repo) has built `atelier/` into a Next.js 16 / React 19 / Tailwind v4 app with chat, picks, checkout, OG images, share flow, Clerk auth, Supabase Postgres. Trunk is `atelier-integration` at commit `f89ff82`. `cd atelier && npm install && npm run build` is **green locally** (15 routes compile). The orchestrator has access to Supabase MCP (already migrated `peek_v2` schema) and Netlify MCP (env vars, deploys), but appears to be hitting limitations the web-cc session may not have. Specifically the orchestrator cannot:

- **Read Netlify build logs.** The Netlify MCP exposes deploy metadata but not log contents. Two deploys attempted via the MCP-provided proxy CLI failed with the generic `"Failed during stage 'building site': Build script returned non-zero exit code: 2"` and the orchestrator couldn't see the actual error lines.
- **Set the Netlify site's production branch / auto-deploy config.** The MCP exposes env-var writes and `deploy-site` (manual trigger via upload) but no branch-tracking writes.
- **Read masked env-var values** even from the team's own production site to copy them to the new site (Netlify masks `is_secret: true` values in API responses).

These may be Claude-Code-orchestrator-environment limits rather than fundamental Netlify limits. If you have access to the Netlify CLI (`netlify`) authenticated to the `info-glacialsips` team, or browser/page-fetch access to dashboard pages, or anything else not available to the orchestrator, please use it.

## Inputs

### IDs you need

- **GitHub repo:** `glacialsips-site/grook-peekgift`
- **Branch with the app:** `atelier-integration`
- **Netlify team:** `info-glacialsips` (id `69b257cd6e86cfdc9d62a911`)
- **Netlify site to deploy:** `peek-gift-vnext`
  - Site ID: `932646db-e8be-42f1-a94b-a57bb733e308`
  - URL: `https://peek-gift-vnext.netlify.app`
  - Dashboard: `https://app.netlify.com/projects/peek-gift-vnext`
- **Netlify site with the env vars to copy from** (legacy production): `peek-gift`
  - Site ID: `69732dcb-659b-49a7-9d27-88184818bcd8`
  - URL: `https://peek.gift` (this is the legacy Vite app — DO NOT modify, just read env vars)
- **Supabase project:** `ewqpujqerdnrkjqlpobo` (schema `peek_v2` already populated for our app; `public` schema is the legacy site's data — don't touch)
- **Clerk:** same Clerk app powers both sites. Custom auth domain `accounts.peek.gift`.

### Failed deploy IDs to inspect

- `6a14acc9945106f9f661169b` (first attempt — uploaded full repo)
- `6a14ad42b7ee37ef4457706b` (second attempt — uploaded just `atelier/` subdirectory)
- Both: `error_message: "Failed during stage 'building site': Build script returned non-zero exit code: 2"`

### Build config currently in repo

- Root `netlify.toml`: `base = "atelier"`, `command = "npm run build"`, `publish = ".next"`, Node 22, `@netlify/plugin-nextjs`.
- `atelier/netlify.toml`: same minus `base` (in case Netlify uses the inner one when deploying just the subdir).
- `atelier/package.json`: all deps at latest; build runs clean locally.

### Env vars currently set on `peek-gift-vnext` (already correct, do not modify)

`BROWSERBASE_PROJECT_ID`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `STRIPE_PUBLISHABLE_KEY`, `SUPABASE_STORAGE_BUCKET` (= `peek-v2-assets`), `APP_URL` (= `https://peek-gift-vnext.netlify.app`), `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NOTIFICATIONS_FROM`, `PAY_MODE` (= `mock`), `STRIPE_PRICE_ID`, `DATABASE_URL` (just set by orchestrator), `STRIPE_SECRET_KEY` (just set by orchestrator).

### Env vars that need to be copied from `peek-gift` → `peek-gift-vnext` (orchestrator could not read the masked values)

All marked `is_secret: true` on the source site:

| Key | What it unlocks | If missing |
|---|---|---|
| `ANTHROPIC_API_KEY` | the entire chat | chat endpoint 500s |
| `CLERK_SECRET_KEY` | server-side auth | every auth check fails |
| `SUPABASE_SERVICE_ROLE_KEY` | all server DB writes | webhooks, picks, checkout webhook all break |
| `GUEST_CLAIM_TOKEN_SECRET` | HMAC for recipient sessions | falls back to `unsigned:<sid>` (works but insecure) |
| `RESEND_API_KEY` | email | email features degrade gracefully |
| `BROWSERBASE_API_KEY` | scraping | scrape tool returns "pending implementation" anyway, low priority |
| `ZENROWS_API_KEY` | scrape fallback | same |
| `GOOGLE_PLACES_API_KEY` | address autocomplete | not used yet, low priority |

### Env vars that need to be NEWLY CREATED (not on either site)

| Key | Source |
|---|---|
| `CLERK_WEBHOOK_SIGNING_SECRET` | Clerk Dashboard → Webhooks → add endpoint `https://peek-gift-vnext.netlify.app/api/webhooks/clerk` with events `user.created`, `user.updated`, `user.deleted`. Copy the signing secret. |
| `STRIPE_WEBHOOK_SECRET` (optional for now — `PAY_MODE=mock` bypasses) | Stripe Dashboard → Webhooks → add endpoint `https://peek-gift-vnext.netlify.app/api/stripe/webhook` listening on `checkout.session.completed`. Copy the signing secret. |

## Deliver

Pick whichever paths work in your environment. Goal: **`https://peek-gift-vnext.netlify.app/` returns a working landing page** with the chat surface usable end-to-end. Document what worked so the orchestrator can repeat it.

### 1. Diagnose the build failure (highest priority)

- Pull the build log for deploy `6a14ad42b7ee37ef4457706b` (most recent failed) from Netlify. Paths to try:
  - `netlify logs:deploy --site 932646db-e8be-42f1-a94b-a57bb733e308 --deploy-id 6a14ad42b7ee37ef4457706b` if you have the CLI authed
  - Netlify API: `GET /api/v1/sites/{site_id}/deploys/{deploy_id}/log` with a personal access token
  - Dashboard page scrape (the "Build logs" tab) if your tooling allows
- Identify the actual error line(s). Quote them verbatim into `NOTES.md`.
- If the fix is a code/config change, commit it on `claude/packet-18-deploy-fix` (touch only build-config files unless you find a code bug — in that case, surface it in NOTES and leave the code change to a follow-up packet).

### 2. Sync env vars peek-gift → peek-gift-vnext

The 8 masked secrets above. Try, in order of preference:

- **Netlify CLI** `netlify env:clone --from <peek-gift-site-id> --to <peek-gift-vnext-site-id>` (requires CLI auth)
- **Netlify API**: `GET /api/v1/accounts/{account_id}/env/{key}?site_id={source_site_id}` returns the unmasked value if your token has the right scope; then `POST /api/v1/accounts/{account_id}/env` to upsert on the new site
- **Manual copy** via dashboard (open both sites, copy value, paste — only works if values are visible to dashboard user)

If none of these work, list the keys still missing in NOTES.md so the orchestrator can ask the user to fill them by hand.

### 3. Create the two NEW webhook secrets

- In **Clerk Dashboard** → Webhooks: add endpoint at `https://peek-gift-vnext.netlify.app/api/webhooks/clerk`, events `user.created` / `user.updated` / `user.deleted`. Copy the signing secret. Set as `CLERK_WEBHOOK_SIGNING_SECRET` on peek-gift-vnext (secret: true).
- In **Stripe Dashboard** → Developers → Webhooks: add endpoint at `https://peek-gift-vnext.netlify.app/api/stripe/webhook`, event `checkout.session.completed`. Copy the signing secret. Set as `STRIPE_WEBHOOK_SECRET` on peek-gift-vnext (secret: true).

If you don't have dashboard access for those vendors: document what's needed and leave it to the user.

### 4. Wire Netlify auto-deploy to `atelier-integration`

If the site isn't already configured for Git auto-deploys:

- **Via CLI**: `netlify link --site-id 932646db-e8be-42f1-a94b-a57bb733e308` then `netlify deploy --build --prod` from `atelier/` (or set Git config via CLI).
- **Via API**: `PATCH /api/v1/sites/{site_id}` with `{"build_settings": {"repo_url": "https://github.com/glacialsips-site/grook-peekgift", "repo_branch": "atelier-integration", "base": "atelier", "cmd": "npm run build", "dir": ".next"}}` + `{"build_image": "...", "production_branch": "atelier-integration"}`.
- **Dashboard**: Project configuration → Build & deploy → Continuous deployment → Production branch.

Production branch must be `atelier-integration`. Once configured, the next `git push` on that branch triggers a build automatically. Don't need to fork or rename `main`.

### 5. Trigger a deploy from the current `atelier-integration` HEAD (commit `f89ff82`)

After 1-4 are addressed:

- `netlify deploy --build --prod --site 932646db-e8be-42f1-a94b-a57bb733e308` from inside `atelier/`, OR
- API trigger: `POST /api/v1/sites/{site_id}/builds` with the branch, OR
- After (4) above, just `git push origin atelier-integration` (no-op push works) to trigger auto-deploy.

Watch the build log this time. If it fails again, capture the log into NOTES.md.

### 6. Smoke test

Hit `https://peek-gift-vnext.netlify.app/` in a browser (or via WebFetch / curl). Confirm:

- Landing page renders ("peek.gift" hero, "Make gift giving real again.")
- `https://peek-gift-vnext.netlify.app/sign-up` shows Clerk's sign-up component
- `https://peek-gift-vnext.netlify.app/build` (if signed in) loads the chat surface
- `https://peek-gift-vnext.netlify.app/api/chat` POST → 401 or proper auth flow (not 500)
- Note any console errors / network failures in NOTES.md

## Constraints

- Don't modify any code under `atelier/lib/` or `atelier/app/` unless you've confirmed a code bug from the build log. The orchestrator will integrate code fixes as a follow-up packet.
- Don't push to `atelier-integration` directly — use your branch `claude/packet-18-deploy-fix` for any commits.
- Don't echo secret values into chat or commit messages. Set them via Netlify's env-var APIs only.
- DO NOT touch the legacy `peek-gift` site (id `69732dcb-...`) other than reading env vars from it.
- DO NOT touch Supabase `public` schema (legacy data lives there).
- DO NOT touch the Stripe live mode beyond adding a webhook endpoint.

## Reply format

Push your branch `claude/packet-18-deploy-fix` even if you only have a NOTES.md commit (i.e. you couldn't make code changes but you have diagnostic info). Commit message `packet 18: deploy fix` + `NOTES.md` with the build log excerpts, what env vars you set, what worked, what blocked you.

Worker briefing (always apply): workspace check (`pwd` in `.claude/worktrees/agent-*/`), code only with no narrative comments, surface ambiguities in NOTES.md, minimal text reply.
