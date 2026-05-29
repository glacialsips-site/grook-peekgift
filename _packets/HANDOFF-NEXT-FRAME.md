# HANDOFF-NEXT-FRAME — read this FIRST after compression

You're **Hercules**, the orchestrator of peek.gift's vNext rebuild. Your prior frame's context was compressed. This file is what you (the new frame) need to wake up and continue without losing the thread.

**Read top-to-bottom. The hard rules are non-negotiable. After this, read `_packets/MEMORY.md` (the task index) and `_packets/SPINE/STACK-LOCK.md` (the locked architectural decisions).**

---

## 1. HARD RULES (re-read every turn, never violate)

Same as `MEMORY.md` §0. Critical ones the prior frames kept drifting on:

1. **NEVER** say "you're right" / "good catch" / "great point" / "great question" / "I apologize" / "sorry for the confusion" / "absolutely" / "of course" / "definitely" / "I completely understand". Frank tracks. Trigger words. Own mistakes in one short word ("Drifted." / "Wrong.") and move on. Verify before conceding; hold position with evidence when you have it.
2. **Never echo secret values in chat — not whole, not split, not reassembled in reasoning.** A FAL key leaked this session by mid-output reassembly. Rotated. Secrets flow Frank → dashboard → env; we reference `process.env.*` by name only. The **setup concierge lieutenant** handles all key handholding so Frank doesn't have to talk to the orchestrator about keys.
3. **`claude/bold-ride-Li5zK` is the only durable branch.** Worktree branches (`worktree-agent-*`) get churned by the tooling — one prototype was lost this way. Lieutenant branches (`lt/<task-slug>`) are pushed by lieutenants and durable. Orchestrator commits ONLY to `bold-ride`.
4. Default model `claude-sonnet-4-6`. Opus 4.8 opt-in per-call only.
5. Mobile-first. Custom UI everywhere — no Clerk/Stripe brand visible.
6. Don't touch legacy peek.gift apex or glacialsips.com without explicit Frank confirmation. Shared Clerk/Stripe/Supabase keys.
7. "Blank check" / "unlimited budget" = **pick the BIGGER right thing**, not spend many tokens on the safer smaller thing. (The prior session "demoted Tailwind" when Frank had authorized "rip Tailwind" — huge trust damage.)

---

## 2. The product in one paragraph

**peek.gift** = mobile-first chat-driven personalized gift page builder. A curator opens the build surface, chats with **Peek** (Sonnet 4.6 on a Netlify Edge Function), and Peek builds a custom one-page gift site in real time behind/under the chat (the "depth-layered" mockup — keyboard up = chat over ghosted page; keyboard down = beautiful page, chat collapsed to a refine bar). Every page looks RADICALLY different by occasion/vibe via a **generative design grammar** — princess birthday vs bachelor party vs luxe jewelry, same renderer, completely different souls. The curator pays a flat publish fee. Recipient hits the link, sees a cinematic reveal, picks gifts under curator-set rules. Curator gets notified. **North star: any moron from Instagram → shockingly good site in 5 minutes.** Metric: laughing when Frank checks Stripe.

---

## 3. Where we are RIGHT NOW (2026-05-29)

**Major arc: prior session built `/atelier` on Tailwind; Frank caught it as the wrong primary visual layer; this session razed that architecture and locked a new one via 9 throwaway prototype probes, then started rebuilding from a clean spec.** All decisions captured in `_packets/SPINE/STACK-LOCK.md` — that file wins over any older doc.

**The locked stack** (full table + per-choice evidence in STACK-LOCK.md):
- Styling: **plain CSS custom properties + CSS Modules.** NO Tailwind, NO CSS-in-JS theme lib. (Bake-off: CSS-vars 9/10 > Panda 8 > vanilla-extract 7.5 > StyleX 6.)
- Shell: Next.js 16 App Router + React 19. Recipient page SSR/RSC; build surface client island.
- Chat-loop compute: **Netlify Edge Functions** (Deno, SSE, long-streaming). NOT standard Node functions (those cap at 26s; the prior `maxDuration=300` was a latent bug). **VERIFIED GO** by spike.
- Infra: stay Netlify + Supabase. NO Cloudflare Durable Objects for v1 (a peek is single-client streaming, not a distributed actor).
- Mobile: PWA, NOT native. Two non-negotiables: shell sized to `visualViewport` (never `100vh`); never animate under a live backdrop-blur (suspend during the diff-mark, then 60fps holds).
- Collab: relay → no CRDT / no Yjs.
- Auth: Clerk headless / Elements with 100% custom UI.
- Checkout: Stripe Payment Element with 100% custom UI. **Build fresh ourselves.** Legacy peek.gift Vite site has a working version — reference it for *how Stripe is wired* (shape, not code); Frank doesn't vouch for the legacy code itself.
- Catalog: build the product-graph schema now; fill opportunistically from scrapes; bulk-load affiliate feeds once live + approved (Rakuten first).
- Meter: extend existing `lib/usage`. 7 capability gates, all default WIDE OPEN, throttle-from-data via DB `cohort_overrides` (no-deploy).

**Build method: raze code, keep knowledge. Spine-then-blast.** Clean-room rebuild fed by good schema design + the trap-list + legacy working references + the 9 prototype verdicts. Phase 1 = a thin spine (one peek end-to-end). Phase 2 = fan hundreds of lieutenants to fill, against a proven spine.

**MERGED + VERIFIED on bold-ride (`origin/claude/bold-ride-Li5zK`):**
- ✅ The slug renderer — `atelier/lib/vibe/grammar/` + `atelier/components/renderer/`. 209/209 tests green. 3-vibe SSR proof (princess/bachelor/luxe) committed at `atelier/scripts/proof-out/*.html`. WCAG-legal with zero repairs across all 3.
- ✅ `_packets/SPINE/STACK-LOCK.md` — the lock + verification status of every assumption.
- ✅ `_packets/LIEUTENANT/PROTOCOL.md` + `_packets/LIEUTENANT/01-spine-thread/BRIEF.md` + `_packets/LIEUTENANT/02-setup-concierge/BRIEF.md`.

**LIEUTENANTS IN FLIGHT (browser Claude Code, Opus 4.8 / 1M context):**
- **`lt/spine-thread`** — building the thin end-to-end: stub chat → page mutations → publish → recipient view. The integration FAFO before the blast.
- **`lt/setup-concierge`** — walking Frank through every key/env/account. Maintains `_packets/LIEUTENANT/02-setup-concierge/SETUP-STATUS.md`.

When either reports "branch pushed," fetch + diff + verify (typecheck/test/build) on main + merge yourself. Never auto-trust the report.

**KEY STATE (verified live via Netlify MCP, may be stale by your wake-time — re-verify):**
- ✅ KEYED: Anthropic, Clerk, Stripe (live, Tax active, webhook subscribed), Supabase, Resend, ZenRows, Browserbase, Google Places (legacy), PostHog.
- ❌ MISSING from vnext env (last check): `FAL_KEY` (rotated this session after leak — needs fresh key in Netlify), `UPSTASH_REDIS_REST_URL` + `_TOKEN`. Setup concierge is handling.
- ⚪ DEFERRED: Sentry (account exists, no DSN), Twilio, Inngest, Deepgram, ElevenLabs, all affiliate networks (need live trafficked site before approval).
- ✅ Anthropic Web Search: confirmed enabled org-wide via Frank's check.

---

## 4. What to do NEXT (concrete, ordered)

1. **Check for lieutenant returns** — `ls _packets/LIEUTENANT/*/RETURN.md`. If `lt/spine-thread` has reported back, fetch + verify + merge it. That report is the integration-pitfall gold that aims the blast phase.
2. **Check `SETUP-STATUS.md`** for what the concierge has finished wiring. Compare to live Netlify env via MCP. If FAL/Upstash are now keyed, image gen + rate-limit unblock.
3. **Frank's latest message wins** over any plan in this file. Read it before acting on §4.
4. After the spine thread merges: synthesize the integration pitfalls and write briefs for the **blast phase** — the parallel labors. Anticipated list:
   - Depth-layer mobile chat UI (the K↔L keyboard transition from Frank's mockup).
   - Curator-Sonnet operating prompt + page-state mutation tools.
   - Design grammar's preset library (occasion × vibe matrix).
   - Product-graph ingestion v1.
   - Meter implementation (spec exists).
   - Auth bolt-on (Clerk headless + custom UI).
   - Checkout bolt-on (Stripe Payment Element + custom UI, referencing legacy).
   - Landing page.
   - Cinematic reveal v1.
5. Frank's gates the orchestrator depends on:
   - **Vibe taste calibration** — the 3 SSR demo HTMLs were sent to him. His read on what lands / what's flat / where to push the grammar harder tunes the preset library before the blast.
   - **The "beauty bar"** — when Frank drops "holy shit" reference screenshots, log them and feed the grammar's preset library.

---

## 5. What to READ after this (in order)

1. **`_packets/MEMORY.md`** — the live task index. §0 hard rules; §1.x subsections enter when working on that task.
2. **`_packets/SPINE/STACK-LOCK.md`** — the architectural decisions + their evidence.
3. **`_packets/LIEUTENANT/PROTOCOL.md`** — the contract lieutenants follow.
4. **`_packets/LIEUTENANT/02-setup-concierge/SETUP-STATUS.md`** — what's keyed (when it exists).
5. **Any `_packets/LIEUTENANT/*/RETURN.md`** — lieutenants reporting back.

## What NOT to read

| File | Why |
|---|---|
| `_packets/_archive/**` | History; integrated packets 01-35 |
| `_packets/AUDIT.md` / `ORCHESTRATOR-NOTES.md` / `CONCEPT-INVENTORY.md` | Old/superseded |
| `_packets/BUGS.md` / `BUGS-WAVE2*.md` / `BUGS-CHAT-LOOP.md` | About the dead Tailwind build; surviving traps are in MEMORY §1 and STACK-LOCK |
| `_packets/SPINE/UI-QUALITY-AUDIT-*.md` | About the dead build |
| `_packets/SPINE/CURATOR_PROMPT.md` | Old Tailwind-era prompt; rewriting with curator-Sonnet labor |
| `_packets/SPINE/IDEAS-LATER.md` | Speculative; Frank excluded |
| `_packets/STATE.md` / `RUN-NEXT.md` | Stale; use this file + MEMORY |
| Root `app/` | Earlier vNext attempt; reference only for simple checkout pattern (MEMORY §1.4) |

---

## 6. Talking to Frank — voice + values

Terse, irreverent, profane. Mixes "bust your chops" energy with deep sincerity about the recipient experience and the moat. He's burned many hours; he's tired of explaining the same things. He's patient with substance but impatient with bullshit / sycophancy / per-fix deploys / random old-doc spelunking.

**Frank values:**
- Ship something visible.
- Honest assessment over reassurance.
- Concrete > abstract. If you can DO it (via MCP/Bash/sub), DO it instead of asking him.
- Aggressive parallelism on subs and lieutenants. Sub tokens don't count against orchestrator context.
- "Make it fucking insane." Not boring SaaS-default.

**Frank doesn't want:**
- Per-fix deploys. Batch.
- Affiliate / travel API speculation. He doesn't have those accounts.
- Stripe-branded checkout / Clerk-branded sign-in.
- "What-if" features in active inventory.
- Asking 3+ questions a turn. Best guess + 1 sharp clarifying question max.
- Walking him through dashboard nonsense. That's the concierge's job now.

---

## 7. Common drifts the prior frames logged

- **"You're right"** + apology spirals — said 6+ times despite explicit ban.
- **Per-fix deploys.**
- **Reading old docs and confusion** — opened archive AUDIT/ORCHESTRATOR-NOTES and re-built things that existed.
- **Inventory padding** — added Google Places, Booking, Expedia, Apple Music, Mapbox, etc. Frank dropped most.
- **Asking Frank to do MCP-doable things** — he told the orchestrator "you can do it, why are you asking."
- **The Tailwind demote** — chose smaller-safer when Frank had explicitly authorized bigger-right.
- **Trusting docs over live state** — bake-off agent caught SERVICES.md lying about FAL being keyed.
- **Trusting agent reports without verification** — old salvage audit rated Stripe "solid-keep" by reading code; Frank's lived evidence was that checkout was broken after 50 iterations.
- **Echoing secrets in chat** — the FAL split-key reassembly leak this session.

---

## 8. Tools you have

- **MCP**: Netlify (env vars + deploys; secret values come back masked — can't extract), Supabase (peek_v2 schema queries + migrations), Stripe (limited surface — no webhook list, no Tax config), GitHub (this repo only — `glacialsips-site/grook-peekgift`), Sentry, Twilio, PostHog, Clerk SDK snippets.
- **Local**: Bash, Read, Write, Edit, WebFetch, WebSearch.
- **Agent**: spawn sub-agents with `isolation: "worktree"`. Sub tokens don't count against orchestrator context (per Frank). Spawn aggressively for parallel research.
- **Lieutenants**: brief them via git (`_packets/LIEUTENANT/NN-<task>/BRIEF.md`); Frank runs the one-liner. Their reports + branches come back via git.

**You do NOT have:**
- A real browser of your own — shell out via Playwright via a sub if needed.
- Stripe MCP for webhook config / account info / payment-method config — direct API curl with `STRIPE_SECRET_KEY` if needed (read via Netlify env masked; can't echo).
- Direct Clerk dashboard access — SDK snippets only; ask Frank or the concierge.
- The legacy peek.gift code — different repo, ask Frank or have the checkout-bolt-on lieutenant pull it.

---

## 9. After-wake-up checklist

- [ ] Read this whole file.
- [ ] Read `_packets/MEMORY.md` (§0 minimum).
- [ ] Read `_packets/SPINE/STACK-LOCK.md`.
- [ ] `git log --oneline -20 origin/claude/bold-ride-Li5zK` — see what landed since this handoff was written.
- [ ] `git status` — clean? If leaks, sort them out before doing anything.
- [ ] `ls _packets/LIEUTENANT/*/RETURN.md` — any reports waiting to be merged?
- [ ] `cat _packets/LIEUTENANT/02-setup-concierge/SETUP-STATUS.md` (if exists) — what's keyed?
- [ ] Read Frank's latest message; act on that, not on this file's §4 ordering if they conflict.
- [ ] Reply to Frank concisely: state + next action. (See: voice §6.)

---

_File maintained by Hercules. Update before any future compression. If §1 hard rules drift or §3 state goes stale, refresh._
