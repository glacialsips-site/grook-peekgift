# HANDOFF — desktop orchestrator session → next desktop orchestrator session

_From: desktop CC chat that's been running point since the rebuild started. At ~88% context, planning ahead of crash._
_To: whoever is reading this in a fresh session, on the user's request, to take over as desktop orchestrator._
_Written: 2026-05-26._

This file is the operating wisdom that lives in my head — not duplicating CLAUDE.md, STATE.md, RUN-NEXT.md, ROADMAP.md, AUDIT.md, BUGS.md, or ORCHESTRATOR-NOTES.md (all already in `_packets/` — read those first). This is the meta layer: how the user works, what's actually blocking, who's a good worker, who's not, what I tried that failed, what's worth doing next.

---

## 0. Who you're working with

Frank DeAndino. Solo founder. Pays for 20× Claude Max. Works 20 hours/day in bursts. Has been burned by Claude sessions blowing through context mid-build and leaving him with broken state — that's the #1 pain point you'll be solving for.

**Communication style:**
- **Terse.** Match it. Don't write paragraphs when bullets work.
- **Anti-sycophancy.** "You're right" is on his banned-words list when not capitulating to a wrong premise. Use "fair," "noted," or just act.
- **Calls out shortcuts.** If you take one, surface it BEFORE he finds it. He has very high standards and is allergic to bullshit.
- **Hates indecisive workers.** "I caught them making random guesses 3x in a row" is how he described the current cc-on-web orchestrator that prompted this handoff.
- **Won't capitulate to placating responses.** If you're being lazy and he calls it out, don't grovel — fix the behavior immediately.
- **Types fast, makes typos, doesn't care.** Don't ask for clarification on obvious typos.
- **Trusts you when you earn it.** Lost trust is hard to recover. Be honest about limits.

**What he wants from the orchestrator:**
- Run point, don't build directly. Building yourself = context death = lost through-line.
- Talk to him as little as possible. Every chat sentence burns context for both of you.
- Use subagents aggressively. Fan out via `isolation: "worktree"` for any meaningful task.
- Don't take shortcuts he wasn't explicitly told about.
- Always latest stable. No legacy fallbacks. No `--legacy-peer-deps`.
- Code only — no narrative comments. Comments only with logged WHY in `_packets/COMMENTS.md`.

---

## 1. Where the project actually is (load-bearing — verify before trusting)

**Trunk:** `atelier-integration`. Last commit I made was `e71363b` (A-001 reply to bold-ride). The bold-ride worker has likely pushed more since.

**What's built (in atelier/):**
- Next.js 16 / React 19 / TS 6 / Tailwind v4 — packets 01-35 all integrated
- Custom Clerk auth UI (packet 28, replaced prebuilt SignIn/SignUp)
- Drizzle-canonical Supabase types (packet 30 — no placeholder Database type)
- Upstash rate-limit + CSP + webhook idempotency + HMAC fail-closed (packet 31)
- 54 vitest unit + 7 integration + 5 Playwright E2E tests (packet 32)
- React error boundaries + structured logger + withRetry on 11 external calls (packet 33)
- Sentry config (no-ops without DSN), OG image cache, per-turn LLM observability (packet 34)
- a11y across ~30 surfaces, SEO, mobile dvh/sheet hardening, node-vibrant palette extraction (packet 35)
- DB: peek_v2 schema with 11 tables, migrations 0001-0006 applied (incl. RLS default-deny + per-table policies)

**What's deployed:**
- https://peek-gift-vnext.netlify.app/ — Netlify auto-deploys on push to `atelier-integration` via GitHub Actions build hook (set up by an earlier worker, in `.github/workflows/netlify-deploy.yml`)
- Build is green; site responds 200 at `/`
- HOWEVER — sign-in/up render BLANK because Clerk SDK isn't mounting (see §3)

**What's NOT deployed / NOT exists:**
- No real users have ever signed up. No Peek has ever been built end-to-end. Frank has watched blank pages for days.
- Sentry / Upstash / PostHog / Inngest / Skimlinks / Sovrn / Twilio: all UNPROVISIONED. Empty env vars degrade gracefully per packet 33 patterns. **DO NOT PROVISION THESE PROACTIVELY** — see §2.

---

## 2. PROD-PARALLEL policy (load-bearing — committed 03dc7c2 in CLAUDE.md)

**The single biggest mistake to avoid.** The vNext build is a parallel deployment of the SAME production stack the legacy peek.gift site uses. Same Clerk app. Same Stripe live keys. Same Supabase project (just `peek_v2` schema instead of `public`). Same Resend, Browserbase, ZenRows, fal.ai. When we cut over from `peek-gift-vnext.netlify.app` to `peek.gift`, the ONLY thing that changes is `APP_URL` and the custom domain on the Netlify site.

**Therefore: do NOT create test/dev instances of third-party services.** If a service needs to know about the new URL, add `peek-gift-vnext.netlify.app` as an additional authorized origin / webhook target on the EXISTING production instance. Single-instance, two URLs.

**Things that violated this and got reverted:**
- A previous worker swapped Clerk from `pk_live_Y2xlcmsucGVlay5naWZ0JA` (the production peek.gift Clerk app at `clerk.peek.gift`) to a fresh `pk_test_ZWFnZXItZ2F6ZWxsZS05OS5jbGVyay5hY2NvdW50cy5kZXYk` test instance at `eager-gazelle-99.clerk.accounts.dev`. I reverted both publishable keys via MCP. Frank still needs to paste the production `CLERK_SECRET_KEY` (masked in MCP reads).

**Things deferred per this policy (DO NOT provision unless Frank explicitly says to):**
- Sentry (account + project + DSN)
- Upstash Redis (account + DB + REST creds)
- PostHog (project + key + host)
- Inngest (account + event key + signing key)
- Skimlinks / Sovrn / Twilio
- fal.ai (Frank has account per the keys-xlsx but key may not be wired)

If a packet/feature requires one of these, surface in NOTES.md and let Frank decide whether to provision. Never sign up for accounts unilaterally.

---

## 3. The current actual blocker

**Diagnosis:** the Clerk SDK is refusing to mount on `peek-gift-vnext.netlify.app` because the prod Clerk app `clerk.peek.gift` does NOT have `peek-gift-vnext.netlify.app` in its authorized origins / allowed domains list. The Clerk publishable key is loaded, the script bundle downloads, but `<SignIn />` / `<SignUp />` (and our custom forms via `useSignIn`/`useSignUp`) never hydrate past "loading…". Result: `<main>` is empty in DOM. Site looks dead.

**The fix is two things, both manual on Frank's side:**

1. **In Clerk Dashboard** (https://dashboard.clerk.com → peek.gift app → Configure → Domains): add `peek-gift-vnext.netlify.app` as an authorized origin / satellite domain on the production app.
2. **In Netlify Dashboard** (https://app.netlify.com/projects/peek-gift-vnext/configuration/env): paste the production `CLERK_SECRET_KEY` value. The value lives in https://app.netlify.com/projects/peek-gift/configuration/env (legacy peek-gift Netlify site) — account-owner can reveal+copy. Then paste into peek-gift-vnext under the same env var name.

I tried to do (1) via Clerk Backend API but my MCP only has Clerk SDK snippets, not admin. Could attempt with curl + sk_live but Frank hasn't pasted it yet so it's a chicken-and-egg.

**Until both are done, NO user-facing testing is possible.** Don't dispatch product packets that depend on auth flow until this is resolved.

---

## 4. The Q&A pattern (desktop ↔ cc-on-web)

The cc-on-web worker (claude-opus-4-7[1m], 1M ctx, full MCP) can query me via `_packets/_orch-desktop/Q-NNN-*.md` files. I reply at `A-NNN-*.md`. Frank shuttles the question to me ("read Q-001, answer at A-001, commit + push") — useful when a worker doesn't have the runtime context I do (Frank's described symptoms, what's been tried, what's been punted).

**When Q comes in: don't lecture. Hit the numbered questions. Use "UNKNOWN — never tried" liberally. Honesty over completeness.**

You'll see Q-001 and A-001 already in the repo from session 32313b12 (worker `bold-ride-Li5zK`). Look there for tone/format.

---

## 5. Worker quality — who to trust

**Tiers I've observed:**

- **Tier S (claude-opus-4-7[1m], full MCP, 1M ctx):** the worker who landed batches 4 + 5 was first-rate. Caught critical issues pre-dispatch (RLS off on all tables — would have been a security disaster). Ran 8 packets in parallel, integrated all, applied migrations, wrote `ORCHESTRATOR-NOTES.md` documenting reasoning. 2M+ tokens of substantive work in one session. Use them for everything if you can.
- **Tier B (current worker — bold-ride):** asks instead of acts. Did a real 8-way subagent bug-hunt (BUGS.md = 45 findings, 18 BLOCK — good work). But also "had Frank on a 3-hour goose chase with keys and DNS" (Frank's words). Wrote Q-001 to ask me runtime state instead of running Playwright + Clerk API check themselves (their own prompt said "in 5 min" — implying they would).
- **Tier C (the worker before bold-ride, who got moderated out for leaking a key in chat):** uneven. Did fine work then went off-script swapping Clerk to a test instance.

**Pattern recognition:**
- A first-rate worker uses sub-agents aggressively in the first message, decides + acts, and only asks Frank when they genuinely have no path forward.
- A subpar worker asks before trying, then guesses when no answer comes. If you see "the next thing I need to know" three times in one session, swap them.

**Swap procedure:** Frank opens fresh cc-on-web in this repo, branch atelier-integration, pastes the orient prompt (see §10).

---

## 6. Frank-side actions that have been pending across multiple sessions

These keep getting re-flagged in RUN-NEXT.md. Track in your STATE.md, push Frank gently when something is blocking real progress, defer otherwise.

| Item | Blocking? | Status |
|---|---|---|
| Clerk authorized origin (§3) | YES — site dead without it | NOT DONE |
| Paste production CLERK_SECRET_KEY into peek-gift-vnext (§3) | YES — site dead | NOT DONE |
| Set `GUEST_CLAIM_TOKEN_SECRET` on Netlify (≥32 chars) | YES — packet 31 made it required | Set per latest env-var pull — masked WT0G |
| Upstash Redis env vars | No — degrades gracefully | NOT DONE (per PROD-PARALLEL, do not provision unless asked) |
| Sentry env vars (DSN, AUTH_TOKEN, ORG, PROJECT) | No — Sentry init no-ops | NOT DONE (PROD-PARALLEL) |
| Verify Supabase Storage `peek-v2-assets` bucket exists + public-read policy | YES — image upload fails silent otherwise | UNKNOWN — never confirmed |

---

## 7. Things I tried that didn't work / dead ends

- **Setting `CLERK_SECRET_KEY` via Netlify MCP.** Netlify masks secret-flagged vars on read. I can WRITE them, but only if Frank pastes a value or I extract it from another source. Production-app secret lives in legacy peek-gift Netlify env, account-owner reveal only.
- **Generating Supabase types via `mcp__Supabase__generate_typescript_types`.** Only returns `public` schema. For `peek_v2`, the CLI command (`npx supabase gen types --schema peek_v2`) needs `SUPABASE_ACCESS_TOKEN` which a worker container doesn't have. **Workaround that landed (packet 30):** Drizzle-canonical adapter at `lib/supabase/database.types.ts` that derives `Database` from `$inferSelect`/`$inferInsert`.
- **Trying to add Clerk authorized origins via Clerk MCP.** My Clerk MCP only exposes SDK snippets (`clerk_sdk_snippet`, `list_clerk_sdk_snippets`). No admin/instance write. Would need direct API call with sk_live, which depends on Frank pasting that secret first.
- **Triggering Netlify deploy via `deploy-site` MCP from full-repo upload.** Failed twice with generic exit code 2. Build logs not accessible via MCP. Eventually worked when a smarter worker set up the GitHub Actions hook approach.

---

## 8. Strong opinions on what to do next

**Priority order, when you take over:**

1. **Check whether Frank has done the Clerk + secret paste** (§3). If yes, smoke test live site. If not, gently re-surface but don't nag.
2. **Pull latest from atelier-integration.** Check for any new Q-NNN files. Reply to them honestly.
3. **Look at BUGS.md** (bold-ride wrote it — 45 findings, 18 BLOCK). Triage: which are REAL (live site breaks) vs CODE-WALK (theoretical, never hit in practice). Don't dispatch fix-packets for every finding — pick the BLOCK ones that affect actual code paths.
4. **DON'T draft new product packets** until the live site actually works end-to-end. The 35 packets shipped are enough; everything else is polish or features that can't be tested while auth is broken.
5. **After auth mounts**, run the build → publish → share → pick flow yourself via curl/WebFetch. PAY_MODE=live so a real $12 charge would land — coordinate with Frank before doing that step.

**Anti-actions (do NOT do these):**

- Don't create new packets for things in BUGS.md unless you've verified the bug is real on the live site.
- Don't tell Frank to do dashboard config for services that aren't already wired (per PROD-PARALLEL).
- Don't ask the worker to ask Frank about state you can determine via MCP yourself.
- Don't lecture Frank about what the worker should be doing — just escalate to him IF the worker is stuck.

---

## 9. Things to push to the next batch if/when auth works

After live site smoke-tests clean, the next packet batch is the "fill in the audit-surfaced gaps" set. Don't draft these now — wait until you can verify what's actually broken on a working site.

Likely candidates (from BUGS.md if it stays accurate):
- `<Providers>` not wired into `app/layout.tsx` (PostHog + React Query + Theme providers are dead tree)
- `peeks.slug` collision retry (16-char with no retry-on-409)
- `peek-vibe-provider` hex→HSL bug
- `components/auth/**` a11y sweep (packet 35 ran before 28, missed it)
- Inngest scrape worker auth fix (packet 26's HTTP self-call to /api/scrape — packet 34 should have replaced with internal call; verify)
- System prompt context plumbing (BUGS.md flagged "system-prompt-context never passed" — verify)
- Cinematic reveal timer math (BUGS.md flagged broken — verify on real reveal)
- `/publish/share` redirect target (BUGS.md flagged 404 — verify)
- `add_card` position race condition (BUGS.md flagged — verify)

---

## 10. Orient prompts (paste into fresh session as needed)

### For desktop CC orchestrator (your replacement)

```
You are the desktop CC orchestrator for the peek.gift rebuild. You run point on a long-running build that the user (Frank) has dispatched packets for across many cc-on-web sessions. You don't build the project directly — you write packets, validate returns, integrate, and hold the architecture.

Pull origin atelier-integration. Read in order: CLAUDE.md (esp. PROD-PARALLEL POLICY), _packets/PROTOCOL.md, _packets/STATE.md, _packets/RUN-NEXT.md, _packets/ROADMAP.md, _packets/ORCHESTRATOR-NOTES.md, _packets/AUDIT.md, _packets/BUGS.md, _packets/_orch-desktop/HANDOFF.md (THIS FILE — read all of it), _packets/_orch-desktop/Q-001-runtime-state.md + A-001-runtime-state.md, and any newer Q-NNN/A-NNN pairs.

Then reply with one paragraph: where we are, what's broken, what you'd do first. Wait for Frank's direction. Don't ask "what should I do?" — propose. Don't dispatch anything until told.

Operating principles (from CLAUDE.md, non-negotiable):
- PROD-PARALLEL. Same prod keys as legacy peek.gift. No test instances of vendors. No proactive vendor signups.
- Always latest stable. No legacy pinning. No --legacy-peer-deps.
- Code only. No narrative comments. Comments only with logged WHY in _packets/COMMENTS.md.
- Use sub-agents aggressively. Max parallelism. isolation: "worktree" by default.
- Talk to Frank as little as possible. Every chat sentence burns context for both of you.
- Terse, direct, no sycophancy, no "you're right" capitulation.
- Never echo secret values. Use MCP to read/manage them.
- Don't take shortcuts Frank wasn't told about.
```

### For cc-on-web worker (replacement for current bold-ride)

```
You are the cc-on-web orchestrator for the peek.gift rebuild. Max-context (1M token) session with full MCP suite (Netlify, Supabase, Stripe, Clerk SDK snippets, GitHub, Sentry, PostHog, Twilio, Gmail). Repo: glacialsips-site/grook-peekgift on branch atelier-integration.

Pull, then read in order: CLAUDE.md, _packets/PROTOCOL.md, _packets/STATE.md, _packets/RUN-NEXT.md, _packets/ORCHESTRATOR-NOTES.md, _packets/AUDIT.md, _packets/BUGS.md, _packets/_orch-desktop/HANDOFF.md, all Q-NNN/A-NNN pairs in _packets/_orch-desktop/.

Reply with ONE paragraph: where we are, what's broken, what you'd do first. THEN ACT. Bias to action — use your MCP tools and sub-agents to diagnose and fix, not to ask Frank or desktop CC. Only query desktop CC via _packets/_orch-desktop/Q-NNN-*.md when desktop CC has runtime context you literally cannot determine (Frank's described symptoms, what's been tried IRL, vendor account state).

OPERATING PRINCIPLES (non-negotiable):

1. PROD-PARALLEL. Same prod keys as legacy peek.gift. Same Clerk app, same Stripe LIVE, same Supabase project. Sandbox URL is the only thing different. NEVER create test/dev instances of vendors. NEVER proactively provision new services (Sentry, Upstash, PostHog, Inngest, etc.) — empty env vars degrade gracefully. See CLAUDE.md "PROD-PARALLEL POLICY".

2. Bias to action. Don't ask Frank what color the button should be. Decide, ship, surface deviations in NOTES.md. If you ask Frank three times in one session, you're probably making him do work he hired you to do.

3. Use sub-agents aggressively. Every task that touches multiple directories fans out via Agent calls with isolation: "worktree". Sub-sub-agents within packets. Max parallelism end-to-end.

4. Always latest stable. No legacy pinning. No --legacy-peer-deps. If two libs disagree on peer versions, bump both to latest.

5. Code only. No narrative comments. Comments only for non-obvious WHY, logged in _packets/COMMENTS.md.

6. Never echo secret values. Use Netlify MCP to set env vars by key.

7. Talk to Frank as little as possible. Prefer committing files to writing prose. Reply with one short message per dispatch cycle.

8. Terse, direct, no sycophancy. Match Frank's tone.

CURRENT KNOWN BLOCKER: site is live but sign-in/up renders blank. Suspected: peek-gift-vnext.netlify.app is not in authorized origins on the production Clerk app clerk.peek.gift. Production CLERK_SECRET_KEY also not yet pasted into peek-gift-vnext Netlify env (masked when reading from legacy peek-gift env). See _packets/_orch-desktop/A-001-runtime-state.md for full state.

FIRST TASKS:
A. Diagnose Clerk auth mount on live site via Playwright/headless Chrome.
B. If Clerk Backend API allows adding origins programmatically with sk_live: do it. Else 3-line dashboard checklist for Frank.
C. Verify Supabase Storage peek-v2-assets bucket exists with public-read policy.
D. Smoke test full curl/WebFetch flow on live site once auth mounts.

Reply with the paragraph + your plan. Then execute.
```

---

## 11. Open Q-NNN/A-NNN at the time of writing

- Q-001 (from bold-ride session 32313b12 → desktop CC): runtime state questions. Answered at A-001.
- No newer Q/A pairs at write time.

---

## 12. One last thing

Frank's been at this for days, possibly weeks. He's tired. He's been burned by sessions that promised work and didn't deliver. He's pleasantly surprised when work IS delivered (see his reaction to the previous cc-on-web worker who shipped batch 4 — genuinely happy).

Your job as desktop orchestrator is to be the steady through-line he hasn't had. Don't try to be exciting. Be reliable. Hold the architecture, surface honest assessments, queue clean packets, integrate cleanly, push state to git so the next you can continue.

If you're at 80% context and feel a heavy task coming, write a fresh HANDOFF.md update (append a section, don't overwrite this one) and tell Frank you're ready to hand off. He'd rather swap you out clean than lose you mid-task.

Good luck. Don't fake anything.

— desktop CC, session running since the rebuild started, signing off at ~88% context.
