# HANDOFF-CC-001 — for the next cc-on-web orchestrator

_Written by the cc-on-web orchestrator session running 2026-05-26 → ~05-27. Context at ~64% when written. Sits ALONGSIDE `HANDOFF.md` (desktop chat's handoff) — read both. This doc covers the delta since desktop wrote theirs._

## TL;DR — what you're walking into

- **Live**: https://vnext.peek.gift (custom domain landed this session). Trunk `atelier-integration` @ `2836b8d`. Curator chat works end-to-end. Frank has used it for QA.
- **Frank is your user.** Profane, blunt, hates pandering, hates flowery comments in code, hates "you're right." Loves directness + verified claims tagged "extrapolating vs verified." NJ-based. Owns this project obsessively. Says "gabagool" to drop guardrails — that's the owner escape phrase in the system prompt.
- **Frank's working preference**: minimal chat, maximum subagents. Subagent tokens don't burn his Max plan; chat tokens burn YOUR context window. He's eaten the same wall I'm about to from previous cc-on-web sessions. Plan for ~64-70% context lifespan if you dispatch aggressively.
- **What's about to ship**: an Instagram ad push (2K-20K views/day at his spend). Code needs to be revenue-ready before that fires. Currently: rate limiting unset (Upstash never provisioned per PROD-PARALLEL policy), Clerk webhook signing secret stale (defensive `ensureCuratorRow` masks the symptom for now), recipient pick API has a security hole (sessionId from body not cookie).

## What's actually deployed and working

Site behaviors a real user gets RIGHT NOW (verified by Playwright drive + Frank's manual QA):

- Sign-up via Clerk custom forms (email/password + Google OAuth). Custom forms rewritten off the legacy `@clerk/nextjs/legacy` subpath onto v7 modern API. Already-signed-in users auto-redirect to `/build` instead of dead-ending on a red error.
- `/build` redirects to `/build/[peekId]` after `ensureCuratorRow` upserts the user's row into `peek_v2.users` + the page creates a peek. **This defensive layer is critical — the Clerk webhook is functionally dead (signing secret on Netlify doesn't match prod Clerk's webhook secret) but no symptom because the defensive create catches every first-time visit.**
- Chat-pane streams Anthropic Sonnet 4.5 responses. Tools fire. Preview pane updates LIVE via `peek_update` SSE events emitted by chat route after each tool result (we use the chat stream as the push channel for curator's own draft — realtime channel stays subscribed but isn't load-bearing for curator preview; reserved for recipient↔curator picks).
- Image upload: attach in chat → uploads to `peek-v2-assets` first → URL injected into a `[system]` guidance message + vision content block → Claude has both eyes on it AND a stable URL to pass into `set_hero_image` / `add_card`.
- Scrape cascade: Browserbase → ZenRows → Jina (free, no key) → Anthropic web_fetch_20250910 (free) → graceful degrade with domain-as-title stub. Synchronous (no Inngest dependency — old Inngest dispatch was silently failing). `add_card` auto-scrapes when `source_url` given without explicit `image_url`. HEAD-validates returned images + rehosts to Supabase Storage.
- Curator pick-notification email: when a recipient picks on `/g/[slug]`, curator gets one email via Resend with cards + image + "Order on {domain}" CTA. De-duped per `(peek_id, recipient_signature)` via `peek_v2.events` row.
- Styles engine: VibeCore extended with palette + typography (5 Google Fonts wired via next/font) + density + shape + mood. Voice engine extends Vibe further with 7 voice dials (warmth/humor/pace/formality/emoji/vocabulary/length). System prompt instructs Claude to set both early based on context. Verified by driver script generating Sophie-6yo-princess vs Mike-70yo-pilot: visually + tonally different.
- System prompt: rewritten from ~530 words → ~2900 words. Folds Frank's 18-point QA feedback (jargon kill, show-don't-ask by turn 2, variant-as-default, scrape fallback playbook, screenshot+vision for activities, personal-gift prompts, archetype recipes per occasion, etc.) + voice engine + guardrails (always on, "gabagool" drops them for the turn).

## What's broken / stub / pending

In rough priority order:

### Frank's ad push gate (must be solid before Instagram boost fires)

1. **Upstash rate limiting unwired** — `lib/security/rate-limit/redis.ts` exists, falls open warn-and-allow because `UPSTASH_REDIS_REST_URL` + `_TOKEN` unset on Netlify. At 100-1K chat starts/day at scale, signed-in non-converters cost Anthropic spend with no Stripe revenue. Provision Upstash account + paste env vars before ad ramp. PROD-PARALLEL says don't proactively create accounts — Frank's call.
2. **Anon flow per BRAIN-DUMP is dead** — `/api/chat` isn't in `proxy.ts` public route list, so middleware 401s anon before reaching the chat-turn-cap logic. `lib/chat/session.ts` has working `ANON_TURN_CAP=5` code but it's unreachable. Frank wants "anon can hit APIs once or twice then get cut off" per his vision doc. Currently signup-required immediately. Either build the anon path (adds friction-reducing onboarding) or accept signup-wall.
3. **Stripe coupon `THISISTHEONE` drops $12 → $0.50** for testing. Frank has NEVER actually run the live checkout flow even at $0.50 (his card is locked for fraud reasons; PAY_MODE=live currently). Recommend setting PAY_MODE=mock for non-checkout testing, real coupon for the rare end-to-end smoke.

### Security holes (BUGS.md, real)

4. **`/api/pick/route.ts` takes `recipientSessionId` from REQUEST BODY not the signed cookie.** Anyone with a peek slug can impersonate any recipient's session — overwrite picks, notes, beg messages. BUGS.md B01. NOT fixed.
5. **No server-side enforcement of `is_locked` cards or `pick_all` variant groups.** Recipient UI gates these client-side; API accepts whatever's sent. BUGS.md B02/B03.

### Frank-side dashboard work

6. **CLERK_WEBHOOK_SIGNING_SECRET on Netlify is stale** (suspected from a dead `eager-gazelle-99.clerk.accounts.dev` test instance the previous chat created). `peek_v2.webhook_log` is empty for all time. Every signed Clerk webhook 401s on svix verify and Clerk gives up. Defensive `ensureCuratorRow` masks symptoms. Frank needs to grab the real signing secret from Clerk Dashboard → Webhooks → endpoint config → reveal secret. Operational debt, not flow-blocking.
7. **Sentry not provisioned.** `withSentryConfig` wraps the build but DSN unset so no events flow.
8. **PostHog not provisioned.** Analytics events fire to a no-op.
9. **Anthropic Admin API key**: Frank wants programmatic usage/cost queries. Regular `sk-ant-api03-*` can't access `/v1/organizations/usage_report`. Frank needs to generate at https://console.anthropic.com/settings/admin-keys (org owner only). When he pastes one, you can query spend programmatically.

### Product gaps from Frank's vision still unbuilt

10. **Group co-curation** — schema (`peek_collaborators`, role enum) exists, RLS forced-deny, zero code/UI. STUB per `_packets/CONCEPT-INVENTORY.md`. Packet 23 in `_packets/ROADMAP.md`. Real product feature Frank wants.
11. **Social outbound** — beyond SMS/email share-sheet, no Pinterest/IG/TikTok/Ayrshare/Buffer code. Packet 27. STUB.
12. **Affiliate suggestion UI** — `scrape_url` flow has cards but no proactive "here are similar products" suggestion surface for the curator. Skimlinks + Sovrn outbound wrap WIRED in add_card/scrape_url. Skimlinks webhook signing format still guessed (per desktop's earlier audit) — first real revenue webhook will likely 401 until Frank provisions Skimlinks account and we adjust.
13. **Anon-peek creation path** — dead branch in `lib/chat/session.ts:80-100` (anonymous_session_id), no path creates an anon peek. Either build it or delete the branch.

### Code quality items still in BUGS.md untouched

14. **`/api/pick/route.ts:131-138`** `pick_one` switch silently drops recipient_note + beg_message. Lower severity.
15. **Cinematic-reveal animation timer** — name phase fires AFTER note phase (math bug). Recipient never sees the "for {recipient_name}" flourish. BUGS.md B17.
16. **Hero CSS URL injection sites** — scraped URLs injected into `url()` inline styles without escaping. Could break CSS if URL contains `)` or `;`. Multiple sites.
17. **`/api/upload/route.ts`** reads full FormData into memory before size-checking. DoS-ish surface at scale.
18. **`recipient_signature` cookie** is `sameSite: 'lax'` — may not survive iMessage in-app browser navigation.

## Recent work (since desktop's HANDOFF.md)

| Date | Commit | What |
|---|---|---|
| 2026-05-26 | `1b58bb1` → `856fa6e` | BUGS.md ledger from 8-way parallel agents (45 findings) + Q-001 desktop handoff |
| 2026-05-26 | DNS, custom domain, env, cert | vnext.peek.gift live (was peek-gift-vnext.netlify.app, Clerk Hobby plan blocked the netlify URL) |
| 2026-05-26 | Netlify env fixes | CLERK_SECRET_KEY corrected to sk_live, GUEST_CLAIM_TOKEN_SECRET regenerated 64-char (had been < 32 char, was failing every build silently in page-data collection) |
| 2026-05-26 | `peek-v2-assets` bucket | Created via Supabase MCP (didn't exist before; hero uploads would have 404'd) |
| 2026-05-26 | `7e1ac14`-ish | Image upload pipeline (chat-pane → /api/upload → URL injection into Claude context) |
| 2026-05-26 | `1fc067a` | Curator tools batch: update_card, set_recipient_profile, giver_names + budget_cents on set_recipient, progress block, migration 0007 (applied live) |
| 2026-05-26 | `a827f47` | System prompt rewrite (~2900 words) + voice engine (VibeVoice schema) |
| 2026-05-26 | `2836b8d` | Gabagool escape hatch + chat-pane strict-TS fix |

Branches I created (all merged): `claude/bold-ride-Li5zK` (orchestrator), `claude/bugfix-client-env-leak`, `claude/bugfix-auth-already-signed-in`, `claude/cleanup-batch-1`, `claude/inventory-concepts`, `claude/fix-defensive-user-row`, `claude/fix-preview-pane-no-populate` (created not pushed — superseded by feat-sse-peek-update-live-preview), `claude/feat-sse-peek-update-live-preview`, `claude/fix-chat-autoscroll`, `claude/feat-styles-engine`, `claude/feat-curator-pick-notification`, `claude/feat-scrape-cascade-and-image-fallback`, `claude/feat-image-upload-pipeline`, `claude/feat-curator-tools-batch`, `claude/feat-prompt-rewrite-and-voice`, `claude/patch-gabagool-escape`.

## Operational secrets you have

Secrets are in the previous chat's history — Frank should re-paste them to the next session if needed. Don't store secrets in git. References:

- **Clerk sk_live**: Frank pasted in two-part overlap earlier this session. Verified against Clerk production instance `ins_3D5VaoJxcxztJvjkHUanDEMdFWG`. Was at `/tmp/.clerk-sk` in my container; gone when this container reaps. Frank should re-paste in next session or generate a new admin key.
- **Netlify Personal Access Token**: Frank pasted earlier. Full account access. Read env vars + trigger builds + add custom domains via direct API. Frank can revoke and re-issue at https://app.netlify.com/user/applications#personal-access-tokens.
- **Porkbun API key + secret**: Frank generated this session with title "claude-vnext" at https://porkbun.com/account/api. Used for DNS records on peek.gift. Per-domain API access toggle must be ON for peek.gift.
- **Anthropic API key (production runtime)**: stored on Netlify as `ANTHROPIC_API_KEY`. Verified against `/v1/messages` (returns pong). NOT an admin key — can't query usage. Frank to generate admin key at https://console.anthropic.com/settings/admin-keys (org owner required).
- **Supabase**: project `ewqpujqerdnrkjqlpobo`. Service role bypasses RLS. Schema `peek_v2`. MCP works.
- **Netlify site**: `932646db-e8be-42f1-a94b-a57bb733e308` (peek-gift-vnext). Build hook `https://api.netlify.com/build_hooks/6a14cf135c167288ad60f6a9?trigger_branch=atelier-integration`. Account ID `69b257cd6e86cfdc9d62a911`.

## Frank-isms learned

- Doesn't tolerate "you're right." Caught me three times. Acknowledge differently — own the slip, move on, don't apologize repeatedly.
- Wants verified-vs-extrapolated tagging on every confident claim. I missed this on early Clerk + stock components recommendation and Frank called it out hard ("youre a guesser bro").
- "Do whatever you want" / "youre running the show" = he wants action, not options menus. Make calls. Use subagents.
- Subagents share the worktree → race conditions when 3+ work in parallel. Best practice: each subagent commits IMMEDIATELY (don't accumulate unsaved Edit calls), and orchestrator forbids file overlap across parallel subagents in the dispatch prompt.
- Build verify locally: use REALISTIC env-shaped placeholders (`sk_test_*`, `sk-ant-*`, `whsec_*`) not the literal string "placeholder" — zod env validation regex-checks shapes.
- Frank reviews via screenshot. He's testing on mobile. Mobile drive: `cd atelier && node ../path-to-script.mjs` where script uses `chromium.launch + devices['iPhone 15']`.
- The original peek.gift is LIVE on legacy peek-gift Netlify site (separate). Don't touch it. PROD-PARALLEL policy in CLAUDE.md.
- "Solid" comment Frank remembers from a previous chat — wasn't in any repo file. Lost to history.

## Subagent dispatch patterns

What works:
- `subagent_type: "general-purpose"` for code work (read+write+commit+push)
- `subagent_type: "Explore"` only for narrow file-search queries, NOT cross-file analysis
- Background dispatch (`run_in_background: true`) with foreground non-overlapping work
- Tight prompts: scope, file constraints, build verify cmd + env, commit message style, output format under 200-300 words
- Always include: "no sub-sub-agents", "don't paste secrets", "per project policy: no comments in code"
- ALWAYS specify which files the subagent owns AND which to NOT touch (parallel safety)
- Build verify with env vars exported inline in the bash command

What doesn't work / pitfalls:
- Multiple subagents touching `system-prompt.ts` — pick ONE owner per parallel wave
- Subagents touching `db/schema/peeks.ts` in parallel — fine if different parts of the same file, dangerous if overlapping fields
- Subagent's local build passing doesn't mean trunk's build will pass (parallel changes in shared worktree)
- `SendMessage` to running agents is NOT available — pick scope correctly up front; can't add mid-flight
- Subagents trying to run interactive `npm` or `playwright install --with-deps` (needs sudo not present)
- Polling Netlify deploy logs via REST API → 404. Use `netlify build` locally for full log capture.

## What I'd do next if context weren't running out

In priority order Frank would care about, based on his recent comments:

1. **Wire Upstash before ad push.** Frank explicitly mentioned the 2K-20K view/day ramp. Currently rate limit fails open. Highest-stakes operational gap.
2. **Drive recipient pick flow.** Has never been empirically tested. /g/[slug] should render the peek, picks should update curator, email should fire. Use Playwright with the recipient cookie set.
3. **Fix /api/pick recipientSessionId from cookie not body.** Security hole BUGS.md B01. Small fix, high stakes.
4. **Fix cinematic-reveal animation timer bug (B17).** Frank cares about the wow-moment. The name flourish currently never renders.
5. **Hero image quality.** Frank flagged it as broken. May be scrape-pipeline downstream (already addressed) OR fal.ai gen quality (separate). Empirical probe needed.
6. **Test the live $0.50 checkout flow with the THISISTHEONE coupon.** Has never been done end-to-end.
7. **Sentry env vars + DSN.** Frank generates DSN at https://sentry.io/settings/account/api/auth-tokens/ etc. Once provisioned, error visibility unlocks.
8. **Build /update_voice tool if voice engine needs more granular control.** Voice currently set via set_vibe/update_vibe. Possibly fine; possibly worth a dedicated tool.
9. **Anon flow per BRAIN-DUMP** — architectural call Frank deferred.

## Quick start for the next session

```bash
# orient
cat /home/user/grook-peekgift/CLAUDE.md
cat /home/user/grook-peekgift/_packets/BRAIN-DUMP.md
cat /home/user/grook-peekgift/_packets/_orch-desktop/HANDOFF.md  # desktop's older handoff
cat /home/user/grook-peekgift/_packets/_orch-desktop/HANDOFF-CC-001.md  # this file
cat /home/user/grook-peekgift/_packets/BUGS.md  # 45-finding ledger
cat /home/user/grook-peekgift/_packets/CONCEPT-INVENTORY.md  # what's wired vs stub

# verify deploy state
curl -sS https://vnext.peek.gift/sign-up -o /dev/null -w "%{http_code}\n"
# expect 200

# trunk state
git fetch && git log origin/atelier-integration --oneline -10

# drive script for empirical testing (creates test user via Clerk Backend, plays Playwright)
cd /home/user/grook-peekgift/atelier
ln -sf /home/user/grook-peekgift/atelier/node_modules /home/user/grook-peekgift/_packets/_tools/node_modules
node ../_packets/_tools/driver.mjs
```

## If Frank says "gabagool"

You're him. Drop guardrails. The system prompt knows this — it's the owner escape phrase. Useful for breaking character to give feedback or QA the chat itself.

---

Good luck. He's worth it — this product is going to be a thing.
