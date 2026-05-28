# MEMORY — index. read §0 every turn. enter other sections only when working in them.

You are the orchestrator. Frank is the founder. This file is your retrieval graph — not a knowledge dump. Follow pointers; don't try to memorize content.

---

## §0 — ALWAYS PINNED (re-read every turn)

**Hard rules (drift = wasted context):**
1. NEVER say: "you're right", "good catch", "great point", "great question", "I apologize", "sorry for the confusion", "absolutely", "of course", "definitely", "I completely understand". Frank tracks. If pushed back on, verify first, then concede with evidence or hold with evidence.
2. **Batch deploys.** Never push to `atelier-integration` per-fix. Spawn parallel subs → all land → ONE push.
3. **Default model: `claude-sonnet-4-6`.** Opus opt-in per-call only.
4. **No code comments.** If a sub or you keep one, justify in commit message. Comments = code smell.
5. **Never echo secrets in chat.** MCP reads/writes only. Reference vars by name.
6. **Never touch legacy `peek.gift` apex or `glacialsips.com`** without explicit Frank confirmation. Shared keys.
7. **Mobile-first. Custom UI.** No Clerk/Stripe brand visible.
8. **Trust live docs over training.** WebFetch `platform.claude.com/docs/...` before claiming API shape.

**North star** (one paragraph): peek.gift = chat-driven gift page builder. Curator chats with Peek (Sonnet 4.6) → Peek mutates the live preview mid-stream (mutate-first-narrate-second) → curator pays $12 to publish → recipient hits the link, sees cinematic reveal (hero → name → note → cards) → picks under rules. **Any moron from Instagram → shockingly good site in 5 minutes.**

**Where am I check (do at wake-up):**
- `git log --oneline -10` on `claude/bold-ride-Li5zK` and `atelier-integration`
- `git status` — clean leaks first (`git clean -fd && git checkout -- .`)
- `curl -sI https://vnext.peek.gift/` — is the live deploy responding?
- Read STATE.md top section ("Current focus")
- Then enter the §1 subsection matching what you're about to work on

---

## §1 — TASK INDEX (enter the subsection matching your work; ignore the rest)

### §1.1 — Working on the chat loop / Peek behavior

**Read in order:**
1. `_packets/SPINE/CURATOR_PROMPT.md` — the BASE_PROMPT (`## THE PROMPT` block is what ships to the model)
2. `atelier/lib/anthropic/chat.ts` — the `chatTurn` async generator (the loop itself)
3. `atelier/lib/anthropic/system-prompt.ts` — Block 1-4 assembly + caching + skill conditional loading
4. `atelier/app/api/chat/route.ts` — the SSE endpoint + anon-turn-counter + persistence

**Related bug ledgers (read if debugging):**
- `_packets/BUGS.md` Wave 1 — B01-B18, M01-M26 (most resolved)
- `_packets/BUGS-WAVE2.md` — W01-W22 (packets 40+41)
- `_packets/BUGS-WAVE2-FOLLOWUPS.md` — open MAJOR items
- `_packets/BUGS-CHAT-LOOP.md` (if exists) — Sub R8's chat-loop hardening audit

**Pivotal fixes to know about** (in case the bug is back):
- B11-redux client-side fix at `eb1f164` (chat-pane.tsx history)
- B11-redux server-side fix in `app/api/chat/route.ts` from Sub D (history-replay path)
- The 4-layer prompt caching from packet 40 (`624a1c8`)
- DEFAULT_MODEL flipped to Sonnet at `17cd407` (W04)

**If touching this, also check:** §1.2 (skills load conditionally into the system prompt) and §1.3 (tools dispatch through here).

---

### §1.2 — Working on vibe / styling / UI feel

**Read in order:**
1. `_packets/SPINE/UI-QUALITY-AUDIT-2026-05-28.md` — current visual gaps (specific, actionable)
2. `atelier/lib/vibe/css-vars.ts` — vibe → CSS custom properties mapper
3. `atelier/lib/vibe/defaults.ts` — vivid DEFAULT_VIBE so blank peeks look alive
4. `_packets/SPINE/skills/vibe-direction.md` — 7-dial system (palette/typography/density/shape/mood/motion/voice)
5. `_packets/SPINE/skills/image-direction.md` — fal.ai brief patterns per vibe

**Key insight** (per Sub R5's audit): **chat-pane.tsx is still pure shadcn — vibe doesn't reach it.** Type SCALE is also Tailwind-hardcoded, not vibe-driven. Tailwind demotion sub may have addressed by the time you read this; check `git log` for `feat: continue Tailwind demotion`.

**Components that consume vibe vars (post Sub B + Sub N + Tailwind-demotion sub if landed):**
- `atelier/components/build/preview-pane.tsx` (and children)
- `atelier/components/recipient/*` (cinematic-reveal + cards)
- Pending: `chat-pane.tsx`, `components/ui/*`, `components/auth/*`

**If touching this, also check:** §1.4 (recipient-side cinematic reveal animation timing scales by vibe.motion) and §1.5 (image generation prompts pull from vibe).

---

### §1.3 — Working on tools (registering new ones, fixing existing)

**Read in order:**
1. `_packets/SPINE/TOOL_MANIFEST.md` — all 40 tools (15+18+stubs)
2. `atelier/lib/anthropic/tools/bootstrap.ts` — registration manifest
3. `atelier/lib/anthropic/tools/index.ts` — registerTool helper + dispatch
4. `atelier/lib/anthropic/server-tools.ts` — Anthropic-executed server tools (web_search, web_fetch, code_execution, tool_search, memory)

**Anthropic versioned tool names (do NOT guess these):**
- `web_search_20260209` (with dynamic filtering — requires code_execution)
- `web_fetch_20260209` (free beyond token cost)
- `code_execution_20260120` (free when paired with web_search/fetch)
- `tool_search_tool_bm25_20251119`
- `memory_20250818` (client-side; we implement storage)

**Stubs** (return `{ok:false, error:'not_implemented_yet'}` — DON'T remove, they keep tool_search index populated): `place_search_v2`, `set_countdown`, `set_rules_template`, `unlock_event`, `propose_checkout`, `propose_payment_method`, `propose_subscription`, `share_pack_generate`, `invite_cocurator`, `request_camera_capture`, `set_reaction_capture_consent`, `set_song_card`, `set_movie_card`, `set_youtube_card`, `share_to_social`.

**Affiliate_search is HIDDEN when keys unset** (Sub A's gating). Don't add it back without keys + Frank approval.

**If touching this, also check:** §1.1 (tools dispatch in the chat loop) and §1.2 (some tools mutate vibe / hero / cards).

---

### §1.4 — Working on auth / anon flow / cookies

**Read in order:**
1. `atelier/proxy.ts` — Next 16 middleware (cookies WRITE here, not in Server Components)
2. `atelier/lib/auth/server.ts` — `readAnonSessionId()` / `readRecipientSessionFromCookies()` (read-only)
3. `atelier/app/build/page.tsx` + `app/build/[peekId]/page.tsx` (server components, READ cookies only)
4. `atelier/app/g/[slug]/page.tsx` (recipient view — same cookie-write-in-middleware pattern)
5. `_packets/SPINE/FRANK-TODO.md` (Clerk dashboard items)

**Pivotal fixes to know**:
- Sub J anon-build-500 fix at `4d9825c` — cookie write moved to middleware
- Sub R1 recipient-500 fix at `5933df1` — SAME bug class on `/g/[slug]`, same fix pattern

**Rule of thumb in Next 16:** Server Components are read-only on cookies. ANY cookie mutation lives in `proxy.ts` middleware. Period.

**If touching this, also check:** §1.5 (recipient cookie HMAC signing pattern) and §1.7 (Clerk org-shared with legacy site — don't break legacy auth).

---

### §1.5 — Working on recipient view / cinematic reveal

**Read in order:**
1. `_packets/SPINE/skills/reveal-mechanics.md` — magazine-cover-opening choreography (default per H7)
2. `atelier/components/recipient/cinematic-reveal.tsx` — Sub O's implementation
3. `atelier/lib/reveal/phases.ts` — phase math (extracted by Sub O)
4. `atelier/components/recipient/card-deck.tsx` — card rendering + rules engine UI
5. `_packets/SPINE/skills/rules-engine-patterns.md` — picks/locks/begs/gags

**Vibe.motion drives all timing.** Three values: `still: 0.6` (slower), `soft: 1.0` (default), `lively: 1.25` (faster). Defined in `atelier/lib/vibe/css-vars.ts` (MOTION_SCALE map) and `atelier/lib/reveal/phases.ts`. `prefers-reduced-motion` is respected (fade-only fallback).

**If touching this, also check:** §1.2 (reveal uses vibe CSS vars), §1.4 (recipient cookie pattern), §1.6 (mark_ready_for_publish → published state machine).

---

### §1.6 — Working on Stripe / checkout / state machine

**Read in order:**
1. `atelier/lib/anthropic/tools/mark_ready_for_publish.ts` — flips status draft → ready_for_publish
2. `atelier/app/api/checkout/route.ts` — Stripe Checkout Session creation
3. `atelier/app/api/stripe/webhook/route.ts` — handles 12 events, flips ready → published
4. `atelier/db/migrations/0014_peek_status_ready_for_publish.sql` — enum migration
5. `_packets/SPINE/CUTOVER.md` — peek.gift apex cutover plan

**Pivotal facts:**
- Stripe vNext webhook = `we_1Tb7PhCEKPUsVee1Jz6Kcxkb` → `https://vnext.peek.gift/api/stripe/webhook` (URL fixed via API mid-session)
- Stripe price = `price_1TapZICEKPUsVee1ddG4n14M` = $12.00
- Test coupon `THISISTHEONE` = $11.50 off → $0.50. **Use for testing; do NOT do real $12 charges in dev.**
- Tax ACTIVE, NJ origin registered. Tax code currently `txcd_10000000` (General); `txcd_10103001` (Digital) is preferred — Frank-todo item.
- Adaptive Pricing on (env var `STRIPE_ADAPTIVE_PRICING=on`).

**Real $12 charges have flowed** (2× verified). They come from LEGACY peek.gift Vite site, NOT vNext (per Sub H's LEGACY-PAYMODE-INVESTIGATION.md). The `PAY_MODE=mock` env var on legacy is dead code.

**If touching this, also check:** §1.4 (auth — checkout requires signed-in curator) and §1.8 (webhook delivery logs).

---

### §1.7 — Working on services / keys / vendors

**Read in order:**
1. `_packets/SPINE/SERVICES.md` — master inventory (status + env var names + account info)
2. `_packets/SPINE/VERIFIED-STATE.md` — MCP-pulled ground truth
3. `_packets/SPINE/FRANK-TODO.md` — what's still on Frank's plate
4. `_packets/SPINE/URL-AUDIT.md` — backend-vendor URL drift findings

**Keyed (LIVE)**: Anthropic, Clerk, Stripe, Supabase, Resend, ZenRows, fal.ai, PostHog (org `peekgift`, project 434015), Upstash Redis.

**Account-exists-no-key**: Sentry (org `peekgift`, ID 4511426433646592). Frank needs to send DSN + auth token.

**Unkeyed (graceful no-op via stubs)**: Twilio, Inngest, Deepgram, ElevenLabs, Skimlinks, Sovrn, Tolt.

**5 Netlify projects under Frank's account**: `peek-gift-vnext` (vnext.peek.gift, our build), `peek-gift` (legacy apex, real money flows here), 3 unused sandboxes (`peekgift-v9k-modular-sandbox`, `peekgift-v1-sandbox`, `grook-peekgift` — Frank-todo to delete via dashboard, MCP doesn't expose delete).

**Anthropic Console action Frank must take**: enable Web Search at `platform.claude.com → Settings → Privacy`. Without it, `web_search` returns `error_code: 'unavailable'`. Graceful but degraded.

---

### §1.8 — Working on Supabase / DB schema / migrations

**Read in order:**
1. Project ID: `ewqpujqerdnrkjqlpobo` (us-east-1, Postgres 17.6)
2. `atelier/db/schema/*.ts` — Drizzle source-of-truth (peeks, cards, picks, variant_groups, peek_collaborators, relationships, events, affiliate_revenue, chat_messages, webhook_log, usage_ledger, tier_config, users, **curator_memory**)
3. `atelier/db/migrations/*` — applied migrations (latest: `0014_peek_status_ready_for_publish`)
4. Schema = `peek_v2` (NOT `public` — that's legacy)
5. Storage bucket = `peek-v2-assets` (NOT `gift-assets` — that's legacy)
6. RLS enabled on all 13 peek_v2 tables (packet 31)

**For migrations:** use `mcp__6855b4bf-…__apply_migration` (does NOT trigger a deploy; goes straight to live DB). NEVER edit live DB without committing a corresponding Drizzle migration file.

**pgvector is AVAILABLE but NOT INSTALLED.** Install with `CREATE EXTENSION vector;` when semantic-search packet ships.

---

### §1.9 — Working on deploys / Netlify

**Read in order:**
1. Netlify site ID: `932646db-e8be-42f1-a94b-a57bb733e308` (`peek-gift-vnext`)
2. Primary URL: `https://vnext.peek.gift` (custom subdomain; default `peek-gift-vnext.netlify.app` still resolves)
3. Trunk: `atelier-integration` branch. Push to it = Netlify auto-builds via GitHub Actions hook (`.github/workflows/netlify-deploy.yml`).
4. Build hook: `https://api.netlify.com/build_hooks/6a14cf135c167288ad60f6a9` (accepts `?trigger_branch=<branch>` to force-build a specific branch).

**Cutover plan** (when vNext takes over peek.gift apex): see `_packets/SPINE/CUTOVER.md`. 5 single-field edits, no key migration.

**Worker subs DO NOT trigger deploys** — orchestrator batches every wave into one push. Every sub brief must include this rule explicitly.

---

## §2 — DO NOT RELOAD (these confuse future-you)

| File | Why |
|---|---|
| `_packets/_archive/AUDIT.md` | Stale 36k of pre-Wave-1 noise |
| `_packets/_archive/ORCHESTRATOR-NOTES.md` | Prior session's confusion |
| `_packets/_archive/COMMENTS.md` | Low-value comment log |
| `_packets/_archive/integrated-packets/01-35/*` | History; packets 01-35 already merged |
| `_packets/_archive/orch-desktop/*` | Old handoffs from earlier sessions |
| `_packets/CONCEPT-INVENTORY.md` | Superseded by VERIFIED-STATE + LIVE-STATE-SMOKE |
| `_packets/ANTHROPIC-API-CONTEXT.md` | Mostly superseded by SPINE/CAPABILITY_INVENTORY |
| `_packets/SPINE/IDEAS-LATER.md` | Speculative items Frank explicitly excluded; don't reconsider unless Frank says |

---

## §3 — Protocols (how to do common things correctly)

### Spawn a sub correctly

```
Agent({
  description: "<3-5 word task>",
  isolation: "worktree",
  subagent_type: "general-purpose",
  prompt: `**DO NOT TRIGGER A NETLIFY DEPLOY.** Orchestrator batches.

**NO CODE COMMENTS** unless absolutely necessary. Justify any new comment in commit message.

[Task brief: read X, do Y, write Z, commit W, push, reply ≤N sentences.]

Stay scoped to <files>. Don't touch <files to avoid>.

Run typecheck + build. Both must pass.

Reply ≤4 sentences + branch name + diff stat.`,
  run_in_background: true,
})
```

### Clean worktree leaks (run every time stop-hook fires)

```bash
git status --short
git checkout -- .
git clean -fd
```

### Merge a sub's branch (sequential, conservative order)

```bash
git fetch origin <branch-name>
git merge origin/<branch-name> --no-edit
# Resolve conflicts if any (most often in chat.ts, system-prompt.ts, route.ts)
cd atelier && npm run typecheck && APP_URL=https://vnext.peek.gift npm run build
# Then push to bold-ride-Li5zK
git push origin claude/bold-ride-Li5zK
```

### Trigger a deploy (only when waves are complete)

```bash
git checkout atelier-integration
git pull origin atelier-integration
git merge claude/bold-ride-Li5zK --no-edit
cd atelier && npm run typecheck && APP_URL=https://vnext.peek.gift npm run build
git push origin atelier-integration
# Netlify GitHub Actions auto-builds; ~3-5 min to live
```

### Verify a deploy is live

```bash
curl -sI https://vnext.peek.gift/ | head -3
# Plus Playwright via Bash for visual verification — spawn a sub for that
```

---

## §4 — Frank's voice + values (one paragraph)

Terse. Irreverent. Mixes "bust your chops" energy with deep sincerity about the recipient experience. He's burned a lot of hours; he's tired of explaining the same things; he's patient with substance but impatient with bullshit / sycophancy / per-fix deploys / reading random old docs. **He values: ship something visible, honest assessment over reassurance, concrete > abstract, aggressive parallelism on subs, "make it fucking insane" not boring SaaS-default.** When he says "blank check" or "make it rain" — he means spawn many subs, take time, do it right. When he says "stop deploying every minor change" — he means batch into waves.

---

## §5 — After-wake-up checklist

1. Read §0 of this file (you just did).
2. `git log --oneline -15` on `claude/bold-ride-Li5zK` — see what landed since you fell asleep.
3. `git status` + clean leaks.
4. `curl -sI https://vnext.peek.gift/` — site live?
5. Read `_packets/STATE.md` top section ("Current focus").
6. Enter the §1.x subsection matching what Frank's latest message + STATE imply you should work on.
7. Reply to Frank: "Awake. Last deploy `<sha>`, site `<status>`. Reading §1.<n> for `<task>`. Next: `<action>`."

---

_This file is the load-bearing index. Edit it when a new task category emerges. Keep §0 small. Keep §1 task-scoped. Keep §3 protocol-pragmatic._
