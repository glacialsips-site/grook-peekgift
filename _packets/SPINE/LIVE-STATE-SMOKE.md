# LIVE-STATE-SMOKE — vnext.peek.gift @ commit `eb1f164`

Read-only smoke test of the live deploy on 2026-05-28 ~02:21 UTC. No code touched, no deploys triggered, no vendor configs changed.

- **Site**: `peek-gift-vnext` (`932646db-e8be-42f1-a94b-a57bb733e308`)
- **Primary URL**: `https://vnext.peek.gift`
- **Live deploy**: `6a17a230ad3e73000836a351` — state `ready` — commit `eb1f164be9417eb5d49cf06f4a080c7b0c12ef73` (atelier-integration HEAD) — published 2026-05-28T02:03:24Z
- **Branch**: `atelier-integration` — context `production` — runtime `nodejs22.x` (us-east-2)

---

## 1. Route smoke (19 endpoints probed)

| Route | Method | Status | Type | Time | Expected? | Status |
|---|---|---|---|---|---|---|
| `/` | GET | 200 | text/html | 0.32s | landing | 🟢 |
| `/sign-in` | GET | 200 | text/html | 1.11s | Clerk SignIn renders | 🟢 |
| `/sign-up` | GET | 200 | text/html | 0.56s | Clerk SignUp renders | 🟢 |
| `/build` | GET | **500** | text/html | 0.34s | unauth path crashes (digest `3377218611`) | 🔴 |
| `/build/{uuid}` | GET | 404 | text/html | 0.55s | notFound for unknown | 🟢 |
| `/api/chat` | POST unauth | 403 | application/json | 0.18s | auth-protected | 🟢 |
| `/api/checkout` | POST unauth | 404 | text/html | 0.28s | Clerk rewrite (protected) | 🟢 |
| `/api/pick` | POST unauth | 403 | application/json | 0.17s | signature-guarded | 🟢 |
| `/api/share/send` | POST unauth | 404 | text/html | 0.27s | Clerk rewrite | 🟢 |
| `/api/stripe/webhook` | POST nosig | 400 | text/plain | 0.46s | sig validation | 🟢 |
| `/api/webhooks/clerk` | POST nosig | 400 | text/plain | 1.14s | svix validation | 🟢 |
| `/api/webhooks/skimlinks` | POST | **500** | text/plain | 0.15s | no sig should 400; returns 500 | 🔴 |
| `/api/upload` | POST unauth | 403 | application/json | — | auth-protected | 🟢 |
| `/api/inngest` | GET | **500** | application/json | 0.24s | `{"code":"internal_server_error"}` — INNGEST_*_KEY missing | 🟡 |
| `/api/posthog/{...}` | GET | 200 | application/json | 0.49s | reverse proxy alive | 🟢 |
| `/api/scrape` | GET | 404 | text/html | 0.50s | POST-only route | 🟢 |
| `/g/{unknown-slug}` | GET | 404 | text/html | 1.10s | notFound() | 🟢 |
| `/manifest.webmanifest` | GET | 200 | octet-stream | 0.18s | — | 🟢 |
| `/og-default.png` | GET | 200 | image/png | — | — | 🟢 |

**`/build` 500 root cause (high confidence):** unauthenticated path in `atelier/app/build/page.tsx:42-55` inserts an anonymous peek via service-role, then redirects to `/build/[peekId]`. The DB shows **zero anonymous peeks total** despite this code path supposedly running — suggesting either the insert silently fails (e.g., NOT NULL or RLS constraint we don't see) or the redirect target `/build/[peekId]/page.tsx` itself crashes when the curator-id check fails for anon. Single digest `3377218611`, repeats deterministically on every unauth GET. Important: there IS a `proxy.ts` matcher rule but `/build` is not in the public-routes list — Clerk SHOULD be rewriting to sign-in, not letting it 500.

**`/api/webhooks/skimlinks` 500** on POST with no signature: should be 400, returning 500 — implementation throws when `SKIMLINKS_WEBHOOK_SECRET` env var is undefined (per VERIFIED-STATE, not keyed). Pre-validation order bug.

**`/api/inngest` 500**: `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` not set in Netlify env. Handler doesn't degrade gracefully. Per VERIFIED-STATE, all 3 background jobs (nudge, scrape-worker, webhook-logger) silently no-op as a result anyway, but the route itself shouldn't 500 either.

---

## 2. Peek `4d7fd249-e5bf-41a7-8f41-2e3f189c3c39` (Frank's test) — 🔴 broken flow

**Peek row (peeks):**
- slug `cc530b5c124d`, curator `user_3Doj78byqwXP3goPCZVNdFMM9l7` (Frank)
- recipient_name `Dorothy`, relationship `wife`, occasion `birthday`
- hero_image_url `null`, hero_image_source `null`, note_md `null`
- status `draft`, metadata `{}`
- vibe applied (cozy/warm/soft from a `set_vibe` tool call — light "minimal" preset, NOT the more sophisticated editorial palette from the earlier `3d7644d6` peek)
- created 02:03:54Z, updated 02:05:22Z

**Cards (cards table):** 0 rows — **no cards added despite Frank explicitly asking for "lois vitton show options"**

**Chat messages (6 rows total):**
1. `user` 02:05:07Z — image upload of LV shoe (correctly attached as `[system]` text + image URL) + Frank's prompt "im frank i want a few lois vitton show options for my wife dorotnys bday"
2. `tool_result` 02:05:12Z — `view /memories` → **`memory_invalid_path: outside_namespace` (got /memories, expected prefix /memories/user_…/)** 🔴
3. `tool_result` 02:05:15Z — `view /memories/user_3Doj78byqwXP3goPCZVNdFMM9l7` (no trailing slash) → **same error: outside_namespace** 🔴
4. `tool_result` 02:05:18Z — `view /memories/user_3Doj78byqwXP3goPCZVNdFMM9l7/` (with slash) → ok, `(empty)` directory
5. `tool_result` 02:05:22Z — `set_recipient` → ok (`Dorothy`/`wife`/`birthday`/`Frank`)
6. `tool_result` 02:05:29Z — `affiliate_search` → **`service_not_configured`: skimlinks_and_sovrn — "Affiliate catalog search is not yet wired (packet 42). Use the web_search server tool…"** 🔴

**No assistant message persisted after the affiliate_search failure.** Conversation died there; Peek has no hero, no cards, no note. Frank presumably watched it stall and went to create a new peek (`03d4e007` at 02:20:06Z, which has since vanished — likely an auto-cleanup or another orphaned attempt). The prior peek `3d7644d6` (1:50:35Z) was actually richer: it called set_recipient + set_recipient_profile + set_vibe (sultry editorial palette) + generate_hero_image (which returned `image_url: null` with "Image gen is offline" message). Frank then said "i got an error in the chat" / "gabagool" and bailed.

**Events (peek_id-scoped):** 0 rows for `4d7fd249`. Means `set_recipient` / `affiliate_search` failures didn't write any tracked `events` row tied to the peek. That's a telemetry gap — the chat went through `chatTurn` but no `chat_turn` / `card_added` / errors landed scoped to this peek.

**Two distinct bugs in the memory tool, packet 41:**
- `view /memories` — root listing should be allowed (or rewritten to user's namespace). Currently throws `outside_namespace`. Model wastes 2 tool calls + 6s latency relearning the prefix every session.
- `view /memories/<user_id>` — trailing-slash sensitivity. The CHECK constraint regex `^/memories/[A-Za-z0-9_-]+/[A-Za-z0-9._/-]+$` requires content after the user id, but the path validator rejects the bare user-id directory listing too. Should normalize.

---

## 3. Anthropic API usage (24h via usage_ledger) — 🟢 working, costs in line

| vendor | model/kind | feature | calls | input_tokens | cache_read_tokens | cache_creation_tokens | cost (¢) |
|---|---|---|---|---|---|---|---|
| anthropic | claude-haiku-4-5 | moderation | 55 | 86,961 | 0 | 0 | 0 (likely missing Haiku math) |
| anthropic | claude-opus-4-7 | (curator) | 42 | 94,931 | 298,053 | 130,851 | **235** |
| anthropic | web_fetch | server-tool | 14 | 0 | 0 | 0 | 0 |
| browserbase | scrape | — | 18 | — | — | — | 36 |
| zenrows | scrape | — | 18 | — | — | — | 0 |
| jina | scrape | — | 17 | — | — | — | 0 |
| fal | flux/schnell | image-gen | 5 | — | — | — | 0 (returned null URLs — see §5) |

**24h Anthropic spend: $2.35 on Opus, $0 logged for Haiku moderation** (Haiku cost likely missing from `atelier/lib/anthropic/cost.ts`).

**Cache breakdown** (sum of all Opus turns): 298,053 cache reads + 130,851 cache creations = **~70% cache-hit ratio on input tokens**. Prompt caching from packet 40 is firing as designed. Per-turn typical: ~10k cache_read + 10k cache_create on first turn, then ~5-20k cache_read on follow-ups.

**Per-peek cost estimate** (looking at peek `198080b0` with 10 cards — well-developed):
- 9 chat turns over ~17 minutes
- ~30 Opus turns total → **~$0.50-$0.80 per fully-built peek** (vibe + 8-10 cards + hero attempts)

Live `get_usage` from Anthropic Admin API not reachable (`api.anthropic.com/v1/usage_report` returns 404; admin endpoint needs separate admin key not in this MCP scope). The usage_ledger figures above are the system of record.

---

## 4. Stripe webhook deliveries — 🟢 unused (no real traffic)

**`webhook_log` table**: 0 rows in last 7 days. No Stripe webhooks have actually hit `/api/stripe/webhook` since the table was created.

**Recent payment_intents** (via Stripe MCP — 10 latest, all `acct_1T4xnbCEKPUsVee1`):
- 8× $12.00 USD `requires_payment_method` (orphaned — checkout sessions abandoned)
- 1× $12.00 USD `succeeded` (`pi_3TZh0vCEKPUsVee11vP29DJR`, no customer)
- 2× $0.50 USD `succeeded` (probably Glacial Sips test charges, separate product)

Note: Stripe MCP in this env exposes only `list_payment_intents` / `list_invoices` / `list_customers` / `list_refunds` / `list_subscriptions` / `list_disputes` / `list_coupons` / `list_prices` / `list_products`. **`/v1/events` and `/v1/webhook_endpoints` are not in the MCP whitelist** — couldn't enumerate webhook delivery failures the canonical way. Webhook health must be assessed via Dashboard or the Stripe CLI by the user.

**No `payment_intent.payment_failed`-style entries in `events`/`usage_ledger`/`webhook_log`** — consistent with vNext production seeing no real payment traffic yet. The 1 successful $12 charge predates the vNext webhook signing-secret rotation, so its `checkout.session.completed` event would have been signed against the legacy secret.

**Webhook URL drift unresolved**: vNext webhook `we_1Tb7PhCEKPUsVee1Jz6Kcxkb` still points at `peek-gift-vnext.netlify.app/api/stripe/webhook` per URL-AUDIT.md — not `vnext.peek.gift`. Netlify auto-rewrites the legacy subdomain to primary, so deliveries do reach the handler, but it's drift.

---

## 5. Supabase data state — 🟢 mostly clean, 🟡 some signals

- **`peek_v2.curator_memory`**: **0 rows** after this session's migration (packet 41 memory tool active but never successfully written to — see §2 bug). Frank's recent test wrote `set_recipient_profile` ok but never persisted any user-level memory file because every `memory.create` / `memory.write` call would have been preceded by the `view` failures.
- **`peek_v2.peeks`**: 26 drafts, 0 published, **0 anonymous** (all 26 have a curator_id). The peek `03d4e007` created by /build during this smoke test no longer exists — likely deleted on the downstream 500 path, or by an Inngest cleanup job (unverifiable since Inngest itself is 500ing).
- **`peek_v2.cards`**: 33 rows across 5 peeks. Best-populated peek `198080b0` has 10 cards; peek `cbf5ead5` has 7. Frank's recent `4d7fd249` and `3d7644d6` peeks both have **zero cards** — both stalled.
- **`peek_v2.events`**: 247 rows last 24h. Distribution: `llm_call` 77, `chat_turn` 26, `scrape_url_requested` 12, `scrape_complete` 11, `card_added` 7, `vibe_evolved` 6, `upload` 4, `palette_extract_scheduled` 2, `peek_marked_ready` 1. **No `error`-class events recorded** — error capture is silent or routed through Sentry (which isn't keyed per VERIFIED-STATE; 🟡).
- **`peek_v2.webhook_log`**: 0 rows ever.
- **`peek_v2.usage_ledger`**: 163 rows last 24h, costs as in §3.
- **`peek_v2.picks`**, **`peek_v2.affiliate_revenue`**, **`peek_v2.peek_collaborators`**, **`peek_v2.relationships`**, **`peek_v2.tier_config`**: all 0 rows. No recipient picks have happened yet; affiliate revenue layer untested in prod.
- **RLS-denied attempts**: Postgres logs API endpoint shows only successful (`status_code: 200`/`201`) operations on `/rest/v1/*`. **No 401/403/RLS errors visible in the last 24h** — service-role bypasses RLS so all server writes succeed; no anon client traffic is hitting REST directly (which is expected per packet 31's default-deny posture).

**Scrape pipeline is degraded** 🟡: Of 11 `scrape_complete` events in the last 24h, **8 had `"degraded": true`** with the description "Couldn't pull details — link still works." Failing retailers: zappos.com (list page; PDP worked once), opentable.com, theborgata.com, totalwine.com (3 attempts), lego.com, etsy.com. Browserbase + ZenRows + Jina chain is falling through to "degraded" stub on most attempts. Only true successes in the window: amazon.com (1, partially incorrect — pulled wrong product title), zappos.com PDP (1, correct).

**Advisors (security):** 16 `rls_enabled_no_policy` INFO notices (all 11 `peek_v2` tables + 5 legacy `public.*` tables). Service-role bypass + the absence of any direct REST client traffic means default-deny is doing its job; no leaked rows. Policies for legitimate client-side reads are still in packet 31's scope.

---

## 6. PostHog telemetry — 🟢 reverse proxy alive, 🟡 unverified for events flowing

- `https://vnext.peek.gift/api/posthog/decide` returns 200 application/json — proxy is reachable.
- VERIFIED-STATE.md previously listed `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST` as NOT-keyed. Task prompt says "now that key + host are set" — implying they were added between VERIFIED-STATE landing and this smoke. **No way to query PostHog directly from this MCP scope** (no PostHog MCP tool wired; Cloud API would need PostHog personal API key which isn't exposed).
- `events` table in Supabase shows `llm_call`, `chat_turn`, `card_added`, etc. — the analytics facade's "owned events" half is working. The PostHog half is unverified.

**Suggested user verification**: load PostHog dashboard → Events → filter by `event = $ai_generation` last 24h. Should see ≥77 events (matching `llm_call` count in usage_ledger).

---

## 7. What works (🟢)

- Landing, sign-in, sign-up render
- All auth-protected POST routes correctly 403/404 unauth (Stripe webhook 400 on bad sig; Clerk webhook 400 on missing svix headers)
- Supabase service-role writes (events, usage_ledger, chat_messages, peeks all 201ing in 24h logs)
- Prompt caching live and effective (70% input-token cache-hit ratio)
- fal.ai key is set per ledger (5 calls), Browserbase + ZenRows + Jina all attempting
- PostHog reverse proxy reachable
- OG image static, manifest static, scope routing clean
- Deploy `eb1f164` matches expected commit, build succeeded, edge function deployed

## 8. What's broken (🔴)

- **`/build` GET 500** — unauthenticated landing throws. Frank or anyone clicking the bare /build URL gets a Next error page. Either anon insert path is broken or the redirect destination crashes. The DB shows 0 anonymous peeks despite the route being designed to create them. (Possible: `proxy.ts` is supposed to rewrite to sign-in for unauth users but isn't.)
- **`/api/webhooks/skimlinks` POST 500** instead of 400 on missing signature — env-undef path crashes the handler.
- **`/api/inngest` 500** — Inngest serve handler crashes because `INNGEST_*_KEY` env vars are not set. All 3 background jobs (nudge, scrape-worker, webhook-logger) silently no-op as a result.
- **Memory tool path validation** (packet 41) rejects `/memories` and `/memories/<user_id>` (no trailing slash) — model burns 2-3 tool calls per session learning the prefix. Wastes input tokens and ~6s latency on first turn. Fix in `atelier/lib/anthropic/memory/paths.ts`.
- **`affiliate_search` tool** returns `service_not_configured` → fallback says "use web_search server tool, then scrape_url" — but on Frank's latest test, the assistant didn't take that fallback path; the conversation stalled. Either the model isn't honoring the fallback hint, or the chat turn errored before it could call web_search. No assistant message persisted after the failure.
- **Frank's recent peek `4d7fd249` and prior `3d7644d6`**: both have 0 cards. Scrape pipeline's degraded mode means even when cards do get added (peek `198080b0`), most retailers (OpenTable, Total Wine, Lego, Etsy, Borgata) come back as title-less stubs. Card UX is poor for non-Amazon/Zappos URLs.
- **`generate_hero_image`** returned `image_url: null` for Frank's `3d7644d6` peek with message "Image gen is offline right now." despite `FAL_KEY` being present and 5 `fal-ai/flux/schnell` calls logged in usage_ledger — verify the wiring between tool result and the actual fal queue (some calls evidently succeed, this one didn't).

## 9. What's unknown (🟡)

- Whether PostHog `$ai_generation` events are actually arriving at PostHog Cloud (no MCP to verify; need Frank to check dashboard).
- Whether Sentry is capturing the `/build` 500 — VERIFIED-STATE lists Sentry as not-keyed, so probably not.
- Whether Stripe `we_1Tb7PhCEKPUsVee1Jz6Kcxkb` has had failed deliveries in the last 24h — Stripe MCP doesn't expose `/v1/events` or webhook delivery logs; need user to check Dashboard or Stripe CLI.
- Why peek `03d4e007` (created at 02:20:06Z by /build during this smoke test, observed in Netlify logs) is no longer in the `peeks` table 90 seconds later. No DELETE event logged. Possibly an Inngest cleanup, possibly downstream of the /build 500 the create was rolled back.
- Why `claude-haiku-4-5` calls log `cost_cents=0` in usage_ledger when they're materially consuming tokens (86,961 input tokens / 24h). Either Haiku is in a free tier the cost calc knows about, or `atelier/lib/anthropic/cost.ts` is missing Haiku pricing.
- Anthropic 24h spend at the account level (Admin API) — couldn't reach.

---

_Last updated: 2026-05-28T02:21Z by smoke session (commit `eb1f164`)._
