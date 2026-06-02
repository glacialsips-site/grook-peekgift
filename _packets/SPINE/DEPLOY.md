# Deploying the vNext studio (whenever you're ready — no rush)

The main page (`apps/web`, the chat-over-preview studio) is deploy-ready on branch
`claude/gallant-planck-pu51x`. The Netlify connector is offline, so the one switch is manual:

## The single step
In the Netlify dashboard → site **peek-gift-vnext** (`932646db-…`) → **Site config → Build &
deploy → Branches/Production branch** → set the **production branch** to
`claude/gallant-planck-pu51x`. Save, then trigger a deploy.

The repo's `netlify.toml` (root) does the rest: base `apps/web`, installs the pnpm workspace,
builds the Next app, publishes `apps/web/.next` via `@netlify/plugin-nextjs`.

## Why this lights up live
The site already holds the env vars (Ground Truth §A): `ANTHROPIC_API_KEY` (the curator turn),
`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (persistence + the recipient page), `STRIPE_*`
(publish, when we wire the full-custom checkout), `NEXT_PUBLIC_*`. So on deploy the studio is
fully live: chat/photo/voice → streaming build → persists → `/g/[slug]` recipient page.

## Honest caveat (the wood to chop)
This `netlify.toml` is a first-draft monorepo config I could not test against Netlify from
here. If the first build fails it's almost certainly the install/base interplay — likely fixes:
- In the UI, clear any leftover **build command / base directory** override so `netlify.toml` drives it.
- If pnpm isn't picked up: confirm Node 22 + that `corepack enable` ran (it's in the command).
- If the Next plugin can't find the app: ensure base = `apps/web` (it's in the toml).
Send me the build log and I'll fix it fast.

## Routes once live
`/studio` (the main page) · `/g/[slug]` (recipient) · `/demo` (renderer conformance) ·
`/api/curator` (SSE) · `/api/pick` · `/api/publish` + `/api/stripe/webhook`.
