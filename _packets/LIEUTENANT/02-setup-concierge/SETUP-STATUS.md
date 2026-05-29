# SETUP-STATUS — setup concierge live ledger

Single source of truth for what's keyed. Status: ✅ set & verified / ⏳ pending Frank / ⚪ deferred.
**Never marked ✅ on assumption** — presence-check or test first. Masked value in a dashboard = fine, presence is the proof.

**Verification note:** no Netlify MCP in the concierge sandbox this session. Runtime (Netlify) vars are verified by Frank confirming the var appears in the env list (masked OK) and/or a deploy smoke-test. Build-lieutenant vars (Claude Code env settings) are presence-checked from a sandbox — values never printed.

_Last updated: 2026-05-29_

## ⚠️ Leak event — 2026-05-29 (rotation REQUIRED)

Two live credentials were pasted into the concierge chat (wrong-chat mixup; meant for an unrelated glennaaronsonrealty deploy). Values never reassembled or stored here. Both must be revoked:
- `78d2…` — Netlify **admin** Personal Access Token (account-wide access to ALL sites incl. legacy peek-gift). Revoke: Netlify → User settings → Applications → Personal access tokens.
- `3ba3…` — fal.ai key. Revoke: fal.ai dashboard → keys.

Consequence: if `3ba3…` is the peek.gift `FAL_KEY`, it's burned → regenerate before wiring (folds into item ① below).

## Immediate queue

| Service | Env var(s) | Status | Where it lives | How verified | Updated |
|---|---|---|---|---|---|
| fal.ai (**ROTATE — prior key leaked**) | `FAL_KEY` | ⏳ pending Frank | Netlify `peek-gift-vnext` (secret) | — | 2026-05-29 |
| Upstash Redis | `UPSTASH_REDIS_REST_URL` | ⏳ pending Frank | Netlify `peek-gift-vnext` (not secret) | value known: `https://probable-lemur-138225.upstash.io` | 2026-05-29 |
| Upstash Redis | `UPSTASH_REDIS_REST_TOKEN` | ⏳ pending Frank | Netlify `peek-gift-vnext` (secret) | — | 2026-05-29 |
| Anthropic Web Search | (org setting, not an env var) | ✅ enabled org-wide | Anthropic Console → Settings → Privacy | Frank confirmed in Console; no domain restrictions | 2026-05-29 |
| Build-lieutenant env (run app live) | `ANTHROPIC_API_KEY` | ⏳ pending Frank | Claude Code env settings | presence-checked orchestrator sandbox: **MISSING** | 2026-05-29 |
| Build-lieutenant env | `DATABASE_URL` | ⏳ pending Frank | Claude Code env settings | presence-checked: **MISSING** | 2026-05-29 |
| Build-lieutenant env | `SUPABASE_URL` | ⏳ pending Frank | Claude Code env settings | presence-checked: **MISSING** | 2026-05-29 |
| Build-lieutenant env | `NEXT_PUBLIC_SUPABASE_URL` | ⏳ pending Frank | Claude Code env settings | presence-checked: **MISSING** | 2026-05-29 |
| Build-lieutenant env | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ⏳ pending Frank | Claude Code env settings | presence-checked: **MISSING** | 2026-05-29 |
| Build-lieutenant env | `SUPABASE_SERVICE_ROLE_KEY` | ⏳ pending Frank | Claude Code env settings | presence-checked: **MISSING** | 2026-05-29 |
| Build-lieutenant env | `APP_URL` | ⏳ pending Frank | Claude Code env settings | presence-checked: **MISSING** | 2026-05-29 |

## Deferred — do NOT provision until orchestrator signals the surface ships

| Service | Env var(s) | Status |
|---|---|---|
| Sentry | `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | ⚪ deferred |
| Twilio | `TWILIO_*` | ⚪ deferred |
| Inngest | `INNGEST_*` | ⚪ deferred |
| Deepgram | `DEEPGRAM_API_KEY` | ⚪ deferred |
| ElevenLabs | `ELEVENLABS_API_KEY` | ⚪ deferred |
| Affiliate networks (Skimlinks/Sovrn/Awin/Impact/Amazon/eBay) | various | ⚪ deferred (also need live trafficked site to approve) |

## Previously keyed on Netlify (per MEMORY §1.7 / VERIFIED-STATE — NOT re-verified by concierge this session)

Anthropic (`ANTHROPIC_API_KEY`), Clerk, Stripe, Supabase, Resend, ZenRows, PostHog, Upstash Redis. Listed for completeness; concierge has not independently presence-checked these (no Netlify MCP). Re-verify on request.
