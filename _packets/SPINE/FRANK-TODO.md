# FRANK-TODO — what only Frank can do (dashboard / account / signup)

_Single source of truth for the human-only actions blocking features. Orchestrator + subs cannot do these. Read once when you're back._

**Status legend:** [ ] open / [x] done / [-] won't do (skip).

---

## Blocking active features (unblock = feature lights up immediately, code is already wired)

### [ ] Anthropic — enable Web Search
- Where: `platform.claude.com → Settings → Privacy → enable Web Search`
- What it unblocks: the `web_search` server tool + `affiliate_search` fallback (W12 confirms code expects `web_search`).
- Impact while blocked: `affiliate_search` returns empty results; curator falls back to manual card adds only.
- Effort: 30 seconds, one toggle.

### [ ] Stripe — set tax_code on the publish product
- Where: Stripe Dashboard → Products → `prod_UZzXnuYuX4ud15` ("peek.gift vNext — Standard") → Tax → set code.
- Set: `txcd_10103001` (Digital services — general). Currently default `txcd_10000000` (General — Service).
- What it unblocks: cleaner per-jurisdiction tax handling on the $12 publish gate. Tax is already activated + NJ origin registered; this is just the right code for the SKU.
- Impact while blocked: Tax computes but uses the generic service code; works, just less accurate.
- Effort: 30 seconds, one dropdown.

### [ ] Sentry — get DSN + auth token
- Where: `sentry.io → org peekgift (id 4511426433646592) → create project "peek-gift-vnext"`. Get:
  - DSN: Project Settings → Client Keys (DSN) → copy
  - Auth token: User Settings → Auth Tokens → create with scopes `project:read`, `project:releases`, `org:read`
- Paste into Netlify (orchestrator can set via MCP once you send the values):
  - `SENTRY_DSN` (server)
  - `NEXT_PUBLIC_SENTRY_DSN` (client — usually same as DSN)
  - `SENTRY_AUTH_TOKEN`
  - `SENTRY_ORG=peekgift`
  - `SENTRY_PROJECT=peek-gift-vnext`
- What it unblocks: error reporting, performance traces, source-map upload on every deploy.
- Impact while blocked: errors silently log to console; you find out about prod issues only via PostHog or user complaints.
- Effort: 5 minutes.

---

## Service signups (deferred, all code degrades gracefully without)

### [ ] Twilio
- Where: `twilio.com → signup`. Account → Console → Settings → General → copy Account SID + Auth Token.
- Set on Netlify:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_FROM_NUMBER` (provisioned phone number — needs A2P 10DLC registration for SMS at scale)
  - `TWILIO_WHATSAPP_FROM` (optional — WhatsApp sender approval is 2-7 day vetting)
- What it unblocks: SMS share + WhatsApp share buttons in share-sheet. Currently hidden / returns `sms_not_configured`.
- See `SPINE/SERVICES.md §12` for full signup prompt.

### [ ] Inngest
- Where: `inngest.com → signup → create app "peek-gift-vnext"`. Apps → settings → copy Event Key + Signing Key.
- Set on Netlify:
  - `INNGEST_EVENT_KEY`
  - `INNGEST_SIGNING_KEY`
- What it unblocks: all 3 background jobs — relationship nudges (14-day-out birthday/anniversary), scrape-worker retries, webhook logger.
- See `SPINE/SERVICES.md §13`.

### [ ] Deepgram (voice STT)
- Where: `deepgram.com → signup` ($200 free credit). API Keys → copy.
- Set on Netlify:
  - `DEEPGRAM_API_KEY`
- What it unblocks: voice mode mic input (real-time speech → text for curator chat).
- See `SPINE/SERVICES.md §14`.

### [ ] ElevenLabs OR Cartesia (voice TTS)
- Pick one:
  - ElevenLabs: more voices, higher quality — `elevenlabs.io → signup`. Set `ELEVENLABS_API_KEY`.
  - Cartesia: lower latency, sub-1.5s — `cartesia.ai → signup`. Set `CARTESIA_API_KEY`.
- What it unblocks: voice mode output + reveal narration. Mic button stays hidden until BOTH STT + TTS keyed.
- See `SPINE/SERVICES.md §15`.

### [-] Skimlinks (demoted)
- Frank 2026-05-28: "we don't have affiliates right now." Demoted from Tier 0.
- If/when you want affiliate revenue back on the table: `skimlinks.com → apply` (4-6 weeks approval). Set `SKIMLINKS_PUBLISHER_ID` + `SKIMLINKS_WEBHOOK_SECRET`.

### [-] Sovrn (demoted)
- Same demotion as Skimlinks. `sovrn.com → apply` when affiliates matter again. Set `SOVRN_API_KEY`.

---

## Netlify dashboard — manual cleanup (MCP can't do this)

### [ ] Delete 3 unused sandbox sites
Netlify MCP `netlify-project-services-updater` does NOT expose a delete-project operation (available ops: `update-visitor-access-controls`, `update-forms`, `manage-form-submissions`, `update-project-name`, `manage-env-vars`, `create-new-project`). Frank, do this via dashboard:

| Site | Site ID | URL | Reason |
|---|---|---|---|
| `peekgift-v9k-modular-sandbox` | `2ded0f9d-47d6-4f22-8e03-4ac9acba0f86` | peekgift-v9k-modular-sandbox.netlify.app | Old sandbox, unused per VERIFIED-STATE.md |
| `peekgift-v1-sandbox` | `740fbbe2-2577-4f1b-8613-7e0812a629dd` | peekgift-v1-sandbox.netlify.app | Old sandbox, unused |
| `grook-peekgift` | `e20f2cd9-47e4-4d06-bd90-b9757acbe88c2` | grook-peekgift.netlify.app | Unused |

Path: Netlify dashboard → each site → Site configuration → General → Danger zone → Delete this project.

**Do NOT delete:** `peek-gift-vnext` (`932646db-…`) or `peek-gift` (`69732dcb-…`) — those are the active vNext deploy + legacy production.

---

## Future cutover tasks (not now, but on the radar)

### [ ] Cutover to peek.gift apex (when vNext is stable)
Full plan in `_packets/SPINE/CUTOVER.md`. Five edits:
1. Add `peek.gift` as custom domain on `peek-gift-vnext` Netlify site.
2. Update Clerk webhook URL from vNext URL to `peek.gift/api/webhooks/clerk`.
3. Update Stripe webhook `we_1Tb7PhCEKPUsVee1Jz6Kcxkb` URL from vNext to `peek.gift/api/stripe/webhook`.
4. Update `APP_URL` env var on Netlify from `https://vnext.peek.gift` to `https://peek.gift`.
5. Once legacy peek-gift Vite site is fully decommissioned, click "Disable JWT-based API keys" in Supabase Dashboard.

### [ ] Stripe Business Profile completeness (only if Tax accuracy matters more)
Already activated + NJ registered; this is polish:
- Confirm MCC (suggest `5734` Computer Software Stores or `5817` Digital Goods)
- Confirm legal entity type + tax ID on file
- Confirm origin state registration (done — NJ)

---

_Last updated: 2026-05-28 by orchestrator. Re-check after every wave; mark items done as you complete them._
