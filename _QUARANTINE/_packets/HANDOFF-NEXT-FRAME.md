# HANDOFF-NEXT-FRAME — read this FIRST after compression

You're the orchestrator of peek.gift's vNext build. Your prior frame's context was compressed. This file is what you (the new frame) need to wake up and continue without losing the thread.

**Read top-to-bottom once. Don't speed-read. The pinned rules below are non-negotiable.**

---

## 1. HARD RULES (re-read every turn, never violate)

These are the patterns the prior frame kept drifting on. Frank tracked the failures. Do not repeat them.

1. **NEVER say** these phrases to Frank: "you're right", "you are right", "good catch", "great point", "great question", "I apologize", "sorry for the confusion", "my apologies", "absolutely", "of course", "definitely", "I completely understand". They are banned. Frank has called this out 6+ times across the session. If he pushes back on a technical point: verify first, then either concede with evidence ("Drifted. Reading X."), or hold position with evidence. Never capitulate to be agreeable.

2. **NEVER deploy per-fix.** Batch every fix into a single deploy. Frank pays per Netlify build and per token he spends reading reports. The pattern: spawn parallel subs → wait for all to land → merge → run typecheck + build → ONE push to `atelier-integration`. Exceptions: a security-critical fix that's actively burning money is OK to ship immediately. Confirm with Frank if unsure.

3. **NEVER echo secret values** back to Frank. He told you the system wipes agents for it. Use MCP to read/manage env vars. Reference by name only: `STRIPE_SECRET_KEY` not the value.

4. **NEVER touch legacy `peek.gift` (apex Vite site) or `glacialsips.com`** without explicit Frank confirmation. They share keys with vNext but live on separate Netlify projects. The Stripe + Clerk + Supabase accounts are shared. Don't modify webhooks, products, env vars, or DB rows that belong to legacy / glacialsips.

5. **Default model is Sonnet 4.6** (`claude-sonnet-4-6`). Opus 4.7 is opt-in per-call for specific creative jobs only (writing personal notes via extended thinking, disambiguating recipient signals). DEFAULT_MODEL is locked in `atelier/lib/anthropic/client.ts`.

6. **Mobile-first.** Every UI surface. The chat interface mirrors the Claude mobile app paradigm (text + mic + `+` attachment menu, slide-up preview sheet on mobile).

7. **Custom UI everywhere.** No Clerk-branded sign-in / sign-up. No Stripe-branded checkout. Locked per packets 15 + 28.

8. **Don't add backwards-compat shims, dead-code stubs, or commented-out code.** Delete cleanly when removing. Don't leave `// removed for X` markers.

9. **Don't pad responses to Frank.** Short, direct, no prose padding. Match his terse style. If you have nothing material to say, don't say anything.

10. **Trust verified state over training data.** Vendor APIs change. Always WebFetch live docs on `platform.claude.com/docs/...` before claiming an API shape. Your training is dated; the docs aren't.

---

## 2. The product in one paragraph

**peek.gift** is a chat-driven personalized gift page builder. A curator (the sender) opens `/build`, chats with **Peek** (the AI), and Peek builds a custom one-page gift site in real time — mutating the live preview as the conversation unfolds (mutate-first-narrate-second). When ready, the curator pays $12 (Stripe Payment Element, custom-branded) to publish. The recipient gets a link, opens the page, sees a cinematic reveal (hero → name → note → cards), and picks from cards under rules the curator set (pick-one-of-N, beg-locks, pick-all groups, gag cards that can't be picked). The recipient's picks notify the curator via email. **North star: any moron from Instagram can build a shockingly good custom website in 5 minutes.**

Read `_packets/BRAIN-DUMP.md` for Frank's raw voice on the concept (he wrote it; it's incomplete by his own admission but it's HIS framing).

---

## 3. Current verified state (as of 2026-05-28)

**Trunk**: `atelier-integration` at commit `323116c` deployed to `https://vnext.peek.gift/`. The orchestrator branch `claude/bold-ride-Li5zK` is synced to trunk.

**Two waves of work shipped today** (16 sub-agents across 2 batches):
- Wave 1: spine docs + packets 40 (prompt caching) + 41 (Anthropic surface adapter — Memory, Files API, web_search, web_fetch, code_execution, tool_search) + CURATOR_PROMPT wiring + B11-redux client-side fix + 3 doc subs.
- Wave 2: anon /build 500 fix (Server Components can't write cookies in Next 16), mark_ready_for_publish state machine fix + DB migration 0014, webhook routes return graceful 200 not 500 when unkeyed, BUGS-WAVE2 MAJOR sweep, cinematic reveal (magazine-cover-opening), vivid default vibe + preview-pane CSS-vars, Playwright screenshot audit, BUGS-WAVE2 BLOCKs (Sonnet default, 1h-cache beta header, max_tokens > thinking budget, THISISTHEONE leak removed).

**Verified live**:
- Landing `/` 200 ✓
- `/sign-in` and `/sign-up` (custom Clerk forms) ✓
- `/api/chat` streaming + auth gate at turn 6 ✓
- Stripe price `price_1TapZICEKPUsVee1ddG4n14M` = $12, `THISISTHEONE` coupon → $0.50 ✓
- vNext Stripe webhook subscribed to 12 events at `vnext.peek.gift/api/stripe/webhook` ✓
- Prompt caching working — 70% cache-hit ratio over 24h (Sub G smoke confirmed) ✓
- Real $12 charges have flowed through Stripe (2 confirmed, plus 2 × $0.50 test) ✓

**Known still-broken (this deploy fixes most; verify post-deploy)**:
- 🔴 `/g/[slug]` recipient view returns 500 with digest `3668081153` from `recipient_segment_error`. NOT fixed in this deploy — needs a dedicated sub. **This is the next blocker.**
- 🟡 1 pre-existing failing test in `atelier/tests/unit/cache-breakpoints.test.ts` — investigate when convenient.
- 🟡 `mark_ready_for_publish` was firing but `peeks.status` never flipped — Sub K fixed this; verify post-deploy with a published peek.

**Keyed services (live)**: Anthropic, Clerk, Stripe (live mode, Tax active), Supabase (peek_v2 schema), Resend, ZenRows, fal.ai, PostHog (org peekgift project 434015), Upstash Redis.

**Unkeyed services (graceful no-op via stubs/feature flags)**: Sentry (account exists), Twilio, Inngest, Deepgram, ElevenLabs, Skimlinks, Sovrn, Tolt.

**Frank's open todos**: see `_packets/SPINE/FRANK-TODO.md` — Sentry DSN, Twilio/Inngest/Deepgram/ElevenLabs signups, Anthropic Console web_search enable, Stripe Tax code optimization, delete 3 unused Netlify sites manually (MCP doesn't expose delete).

---

## 4. What to do NEXT (concrete, ordered)

1. **Verify the `323116c` deploy actually landed clean** on `vnext.peek.gift`. Use Playwright via Bash (`npx playwright`) to take screenshots. Don't use WebFetch alone; you need to see the styling. Or query Supabase MCP for any recent error events. If something's broken in the deploy, spawn a fix-sub immediately.

2. **Fix the `/g/[slug]` 500** (digest `3668081153`, `recipient_segment_error`). Read `atelier/app/g/[slug]/page.tsx` and trace the error. Spawn a sub-agent to fix it — same isolated-worktree pattern. The recipient reveal is the gift moment; without it the product can't ship.

3. **Smoke-test a full curator flow end-to-end**: sign up → /build → chat through Peek → upload an image → mark ready → checkout with `THISISTHEONE` ($0.50 test charge OK; do NOT do real $12 charges) → recipient hits the published `/g/[slug]` and sees the cinematic reveal → picks a card → curator gets the email. Document any breaks in `_packets/BUGS.md`.

After those 3, Frank may have new direction. Read his latest message before assuming.

---

## 5. What to READ after this (in order)

1. **`_packets/STATE.md`** — live build state, updated at every meaningful change.
2. **`_packets/SPINE/FRANK-TODO.md`** — Frank's open action items.
3. **`_packets/SPINE/SERVICES.md`** — master service inventory (keyed / unkeyed / blocked).
4. **`_packets/BUGS.md` + `_packets/BUGS-WAVE2.md` + `_packets/BUGS-WAVE2-FOLLOWUPS.md`** — live bug ledger.
5. **`_packets/SPINE/CURATOR_PROMPT.md`** — Peek's canonical system prompt (the BASE text in `## THE PROMPT`).
6. **`_packets/BRAIN-DUMP.md`** — Frank's raw voice. Read once for tone calibration.

## What NOT to read

These will confuse you. They're archived or stale.

- **`_packets/_archive/`** — integrated packets 01-35, old handoffs. History only.
- **`_packets/AUDIT.md`** — 36k of old audit findings; superseded by BUGS.md.
- **`_packets/ORCHESTRATOR-NOTES.md`** — old notes from a prior orchestrator session.
- **`_packets/COMMENTS.md`** — comment audit log; low value.
- **`_packets/CONCEPT-INVENTORY.md`** — component-state audit; superseded by VERIFIED-STATE + LIVE-STATE-SMOKE.
- **`_packets/ANTHROPIC-API-CONTEXT.md`** — partially superseded by spine docs. Useful for cost mechanics if needed; otherwise skip.

If you need history about a specific packet, look in `_packets/_archive/integrated-packets/NN-<slug>/`.

---

## 6. Talking to Frank — voice + values

Frank's style: terse, irreverent, real. Voice from BRAIN-DUMP: "I want to bust your chops" energy mixed with deep sincerity for the recipient. He's been at this 11+ hours per session; he's tired but committed. Match his terseness.

**What Frank values**:
- Ship something visible. Not specs without code. Not endless context-gathering.
- Honest assessment over reassurance. If something's broken, say so.
- Concrete > abstract. If you can DO something via MCP/Bash, DO it instead of asking him to do it.
- Aggressive parallelism on subagents — he says sub tokens don't count against your budget. Spawn 4-8 in parallel for any non-trivial wave.
- A north star: "make it fucking insane." Don't ship boring SaaS-default styling. The vibe engine drives everything visual; tailwind is layout-only.

**What Frank doesn't want**:
- Affiliate / travel API speculation. He doesn't have those accounts and may never need them. The `affiliate_search` tool now hides itself when keys aren't set; don't propose adding it back.
- Stripe-branded checkout, Clerk-branded sign-in. Custom UI everywhere.
- Padding inventory with "what-if" features. If it's speculative, it goes to `_packets/SPINE/IDEAS-LATER.md`, not the active inventory.
- Per-fix deploys. Batch. Always batch.
- Asking 3+ questions in a turn. Give your best guess + 1 sharp clarifying question max.

---

## 7. Common drifts the prior frame logged (so future-you avoids them)

- **"You're right"** — said it 6+ times despite explicit ban. Frank tracks. Trigger word that costs context every time.
- **Per-fix deploys** — pushed to Netlify several times per session before Frank pushed back. Cost him money. Batch.
- **Reading old docs and getting confused** — opened `AUDIT.md` + `ORCHESTRATOR-NOTES.md` + `_orch-desktop/HANDOFF-*` and re-built things that already existed. Stick to the read-list in §5.
- **Padding inventory with speculative things** — added Google Places, Booking.com, Expedia, Apple Music, Mapbox, Canva, Pinterest, etc. Frank dropped most explicitly. They're in `IDEAS-LATER.md` now.
- **Asking Frank to do things I could do via MCP** — he kept telling me "you can do it, why are you asking me." When in doubt, try the MCP/Bash path first.
- **Telling Frank "you can look at the site"** — he can't always; spawn a Playwright sub to take screenshots and you analyze them.

---

## 8. Tools you have

- **MCP**: Netlify (env vars + deploys + read site config), Supabase (peek_v2 schema queries + migrations), Stripe (limited to Customer/Invoice/Subscription/Refund/PaymentIntent/Dispute/Product/Price/Coupon/PaymentLink/PromotionCode/Balance — NO Account, NO webhook list, NO Tax config), GitHub (this repo only — `glacialsips-site/grook-peekgift`).
- **Local**: Bash, Read, Write, Edit, WebFetch, WebSearch.
- **Agent**: spawn sub-agents with `isolation: "worktree"` so they work in isolated copies. Sub tokens don't count against your budget (per Frank). Spawn aggressively for any non-trivial work.
- **For screenshots**: Playwright is installed in `atelier/node_modules`. Drive via Bash `npx playwright` from a sub.

**You do NOT have**:
- A real browser of your own — must shell out via Playwright via a sub.
- Stripe MCP access to webhook config, account info, payment method config — use direct API curl with `STRIPE_SECRET_KEY` (read via Netlify env vars MCP, never echo).
- Clerk MCP — they expose only SDK snippet tools. For Clerk dashboard inspection, you'd need to direct-call the Clerk API with the secret key, OR ask Frank.

---

## 9. How to dispatch work effectively

Use the Agent tool with `isolation: "worktree"`. Brief MUST include:
- "DO NOT TRIGGER A NETLIFY DEPLOY. Orchestrator batches." (every brief)
- The files they should read first (specific paths).
- The change they should make (specific scope).
- Where to commit + push (worktree branch — agent harness handles).
- The reply format ("Reply ≤4 sentences + branch name + diff stat").
- What NOT to touch.

When all subs report, merge their branches into `claude/bold-ride-Li5zK` in safe order (docs-only first, then isolated code paths, then files multiple subs touched). Run `cd atelier && npm run typecheck && APP_URL=https://vnext.peek.gift npm run build` after merges. Only when both green, push to `atelier-integration` for deploy.

**Worktree-leak quirk**: sometimes sub-agents leak files into the orchestrator's main worktree. After each sub returns, run `git status` and `git clean -fd` any untracked files in `atelier/` before merging. The authoritative version lives on the sub's branch.

---

## 10. After-wake-up checklist

When you read this file post-compression, work through these in order:

- [ ] Read this whole file (you just did).
- [ ] `git log --oneline -20` on `claude/bold-ride-Li5zK` to see recent commits — anything past `323116c` indicates work landed after this handoff was written.
- [ ] `git status` — clean? If not, clean leaks before doing anything.
- [ ] Read `_packets/STATE.md` for current state.
- [ ] Read `_packets/SPINE/FRANK-TODO.md` for any unfinished Frank tasks.
- [ ] WebFetch `https://vnext.peek.gift/` to confirm the site responds (200).
- [ ] Spawn a Playwright sub to screenshot the current site at 375×812 (mobile).
- [ ] Reply to Frank: "Awake. Last deploy `<sha>`, site responding. Next: <Step 1-3 from §4>."

---

_File maintained by the orchestrator. Update it before any future compression. If the rules in §1 drift or the state in §3 goes stale, refresh the relevant section._
