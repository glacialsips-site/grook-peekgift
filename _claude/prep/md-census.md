# MASTER DOCUMENT CENSUS — peek.gift / grook-peekgift

> Read-only enumeration of every markdown / doc / spec / brief / handoff / notes / smoke-artifact
> file across the five doc-rich branches. Produced 2026-06-08 for the CTO, so no downstream prep
> agent misses a source. Purpose lines are pulled from each file's own first ~lines (not invented).
> Citations are `branch:path`. READ-ONLY — nothing was checked out, edited, or committed except this file.

## Coverage at a glance

| Branch | Doc files (.md) | + .txt artifacts | Total | Relationship |
|---|---|---|---|---|
| `origin/atelier-integration` | 125 | 5 | **130** | THE doc-rich trunk. The old packet-orchestration + SPINE world. Source for ~all `_packets/**`. |
| `origin/claude/studio-vnext` | 43 | 0 | **43** | Superset of gallant-planck (= planck + 2 in-site-chat docs). Newest plan layer. |
| `origin/claude/gallant-planck-pu51x` | 41 | 0 | **41** | The vNext monorepo (`apps/web` + `packages/core`) "studio" build. Carries recon-assets + SPINE/*. |
| `origin/claude/bold-feynman-SZzaO` | 25 | 0 | **25** | The lean `lib/ir` architecture origin. Subset of planck (no recon-assets, no RECON_*, no _packets/SPINE). |
| `origin/peek-clean` | 4 | 5 | **9** | Strict SUBSET of atelier-integration's `atelier/**` docs, byte-identical. Adds nothing new. |

**TOTAL DISTINCT DOCS COUNTED across all five branches: 130 unique paths** (atelier-integration is the
superset of file *paths*; the claude/* branches add the `recon-assets/`, `peek-jumpoff/`, `lib/ir/`,
root-`*.md`, `docs/`, and `_packets/SPINE/` (planck-flavored) families that atelier does NOT carry).
Counting every `branch:path` row in the tables below = **207 enumerated rows** (many are the same blob
shared verbatim across the 3 claude/* branches — flagged inline).

**De-dup findings (verified by blob hash):**
- The root docs `CLAUDE.md, DECISIONS.md, DESIGN_QUESTIONS.md, PLAN.md, README.md`,
  `docs/DESIGN_REVIEW_2026-06-01.md`, `docs/PROJECT_SUMMARY_2026-06-01.md`, `lib/ir/INTERFACES.md`,
  all `peek-jumpoff/**`, and `recon-assets/**` + `_packets/SPINE/**` + `RECON_*` are **byte-identical
  between gallant-planck and studio-vnext** (0 differences). Read ONCE per content.
- The shared root docs (`CLAUDE/DECISIONS/DESIGN_QUESTIONS/PLAN/README/docs/*/INTERFACES/00_MAP/
  REQUIREMENTS_SPEC`) are also **identical on bold-feynman** — feynman just lacks the recon/SPINE/RECON families.
- **`WAKEUP.md` is the one root doc that differs across all 3 claude/* branches** — each carries its own live-state version.
- `peek-clean` is fully contained in `atelier-integration` (same blobs).

---

## TABLE 1 — atelier-integration (the 130) — the packet/SPINE world

`branch:path` is abbreviated to `ai:` = `origin/atelier-integration`.

| branch:path | one-line purpose (from first lines) | category | status |
|---|---|---|---|
| ai:CLAUDE.md | Orchestrator briefing; "read `_packets/MEMORY.md` first" post-compression entry point. | decisions/handoff | CURRENT(branch) |
| ai:NOTES.md | Auth rip-out notes (Clerk v7 Signal API migration on affectionate-tesla). | handoff | SUPERSEDED |
| ai:README.md | peek.gift vNext one-pager (chat-driven gift-page builder; stack). | requirements | CURRENT |
| ai:_packets/PROTOCOL.md | Defines what a "packet" is (self-contained build task) + folder layout. | decisions | SUPERSEDED (packet model retired) |
| ai:_packets/MEMORY.md | Orchestrator retrieval index; §0 hard rules pinned every turn. | decisions/handoff | CURRENT(branch) |
| ai:_packets/HANDOFF-NEXT-FRAME.md | Post-compression wake-up for the orchestrator; hard rules + north star. | handoff | CURRENT(branch) |
| ai:_packets/STATE.md | Live build status; 2026-05-28 wave of 8 parallel subs (A-H). | decisions | SUPERSEDED |
| ai:_packets/RUN-NEXT.md | Live dispatch queue; "spine ships in waves, not numbered packets." | future | SUPERSEDED |
| ai:_packets/ROADMAP.md | Post-batch-3 roadmap; Phase A hardening → later phases. | future | CURRENT(ref) |
| ai:_packets/BRAIN-DUMP.md | Frank's raw words 2026-05-26 (Tier 1 product); flagged INCOMPLETE/NOT CANONICAL. | requirements | CURRENT(ref) |
| ai:_packets/CONCEPT-V2.md | Concept Breakdown (core concept, the problem with existing gifting). | requirements/design | CURRENT |
| ai:_packets/CONCEPT-INVENTORY.md | What's actually in the code: WIRED/PARTIAL/STUB/ABSENT per concept. | mechanics/decisions | CURRENT(branch) |
| ai:_packets/ANTHROPIC-API-CONTEXT.md | Anthropic side of the stack: account state, keys, mechanics. | services | CURRENT(ref) |
| ai:_packets/BUGS.md | Operational bug ledger (trunk @ cbbab1d); BLOCK/MAJOR/MINOR. | decisions/bugs | CURRENT(branch) |
| ai:_packets/BUGS-WAVE2.md | Audit of packets 40+41+wiring; NEW findings + STILL-OPEN carryover. | decisions/bugs | CURRENT(branch) |
| ai:_packets/BUGS-WAVE2-FOLLOWUPS.md | MAJORs left open after Wave-2 fixes shipped. | decisions/bugs | CURRENT(branch) |
| ai:_packets/BUGS-CHAT-LOOP.md | Chat-infrastructure hardening audit (chat.ts/streaming/observability). | decisions/bugs | CURRENT(branch) |
| ai:_packets/40-prompt-caching/prompt.md | Packet 40 spec: Anthropic prompt caching across curator chat (1h TTL). | mechanics/services | SUPERSEDED(integrated) |
| ai:_packets/40-prompt-caching/NOTES.md | Packet 40 orchestrator notes (considered + rejected). | decisions | SUPERSEDED |
| ai:_packets/40-prompt-caching/WORKER-NOTES.md | Packet 40 implementation choices (cache breakpoints). | mechanics | SUPERSEDED |
| ai:_packets/41-anthropic-surface/prompt.md | Packet 41 spec: web search/fetch/code-exec/tool-search/Memory/Files/ext-thinking. | mechanics/services | SUPERSEDED(integrated) |
| ai:_packets/41-anthropic-surface/NOTES.md | Packet 41 alternatives considered + risks (self-host vs managed memory). | decisions | SUPERSEDED |
| ai:_packets/SPINE/README.md | What peek.gift IS: curator prompt + slug model + tools manifest = the spine. | requirements/design | CURRENT |
| ai:_packets/SPINE/CURATOR_PROMPT.md | Peek's canonical system prompt (4 prompt-cached layers). | mechanics | CURRENT |
| ai:_packets/SPINE/TOOL_MANIFEST.md | Every tool Peek can call; must be in bootstrap.ts to be callable. | mechanics | CURRENT |
| ai:_packets/SPINE/CAPABILITY_INVENTORY.md | Vendors × features actually used / keyed / net-new path. | services | CURRENT |
| ai:_packets/SPINE/SERVICES.md | Master inventory: every service, account state, key location (Netlify vault). | services | CURRENT |
| ai:_packets/SPINE/VERIFIED-STATE.md | Ground truth from Netlify/Supabase/Stripe MCP 2026-05-27 (wins on conflict). | services/decisions | CURRENT(dated) |
| ai:_packets/SPINE/LIVE-STATE-SMOKE.md | Read-only smoke of live deploy @ eb1f164 (2026-05-28). | services/bugs | CURRENT(dated) |
| ai:_packets/SPINE/CURATOR-FLOW-AUDIT-2026-05-28.md | Live Playwright drive of build flow; anon meter wall blocker. | bugs | CURRENT(dated) |
| ai:_packets/SPINE/UI-AUDIT-POST-DEPLOY.md | UI audit post-deploy 17cd407; Playwright screenshots. | bugs/design | CURRENT(dated) |
| ai:_packets/SPINE/UI-QUALITY-AUDIT-2026-05-28.md | UI quality vs north star; "bland" = vibe engine only colors/fonts. | design/bugs | CURRENT(dated) |
| ai:_packets/SPINE/SCRAPE-COMPARISON.md | Legacy vs vNext scraper; legacy code not in repo (blocked). | services/decisions | CURRENT(ref) |
| ai:_packets/SPINE/URL-AUDIT.md | Backend-vendor URL config for vnext.peek.gift; webhook drift table. | services | CURRENT(dated) |
| ai:_packets/SPINE/LEGACY-PAYMODE-INVESTIGATION.md | Verdict: PAY_MODE on legacy is dead config; real $12 flows via legacy Vite. | decisions/services | CURRENT |
| ai:_packets/SPINE/CUTOVER.md | How vNext → peek.gift apex becomes production (zero key/user migration). | future/services | CURRENT |
| ai:_packets/SPINE/FRANK-TODO.md | Human-only actions blocking features (dashboard/account/signup). | decisions/handoff | CURRENT(branch) |
| ai:_packets/SPINE/IDEAS-LATER.md | Speculative capabilities deferred from CAPABILITY_INVENTORY ("all killer no filler"). | future/pantry | CURRENT(ref) |
| ai:_packets/SPINE/skills/affiliate-strategy.md | Skill: how product mutations land as real cards (affiliate routing). | mechanics/pantry | CURRENT |
| ai:_packets/SPINE/skills/copy-house-style.md | Skill: Peek's voice manual (canonical; extends CURATOR_PROMPT). | mechanics/pantry | CURRENT |
| ai:_packets/SPINE/skills/image-direction.md | Skill: Peek's image-brief engine (fal.ai Flux/Pika/Luma routing). | mechanics/pantry | CURRENT |
| ai:_packets/SPINE/skills/reveal-mechanics.md | Skill: cinematic reveal spec (the gift moment). | mechanics/pantry | CURRENT |
| ai:_packets/SPINE/skills/rules-engine-patterns.md | Skill: the rules engine = the genuinely novel core of peek.gift. | mechanics/pantry | CURRENT |
| ai:_packets/SPINE/skills/share-mechanics.md | Skill: how a peek travels publish→open→social outbound. | mechanics/pantry | CURRENT |
| ai:_packets/SPINE/skills/vibe-direction.md | Skill: Peek's visual engine (vibe dial set; set_vibe/update_vibe). | design/pantry | CURRENT |
| ai:_packets/SPINE/skills/voice-camera-protocol.md | Skill: modality rules for mic / camera modes. | mechanics/pantry | CURRENT |
| ai:_packets/SPINE/skills/occasion-templates/anniversary.md | Occasion template: wedding anniversary (one half gifting the other). | pantry | CURRENT |
| ai:_packets/SPINE/skills/occasion-templates/baby-shower.md | Occasion template: baby shower / gender reveal. | pantry | CURRENT |
| ai:_packets/SPINE/skills/occasion-templates/bachelorette.md | Occasion template: bachelorette / hen party. | pantry | CURRENT |
| ai:_packets/SPINE/skills/occasion-templates/holiday.md | Occasion template: Christmas/Hanukkah/Mother's/Father's/Valentine's. | pantry | CURRENT |
| ai:_packets/SPINE/skills/occasion-templates/just-because.md | Occasion template: no-occasion "thinking of you." | pantry | CURRENT |
| ai:_packets/SPINE/skills/occasion-templates/milestone-bday.md | Occasion template: milestone birthday 30/40/50/60/70/80. | pantry | CURRENT |
| ai:_packets/SPINE/skills/occasion-templates/princess-bday.md | Occasion template: child princess/fantasy birthday. | pantry | CURRENT |
| ai:_packets/SPINE/skills/occasion-templates/retirement.md | Occasion template: retirement (career exit, relationship-dependent register). | pantry | CURRENT |
| ai:_packets/SPINE/skills/occasion-templates/teen-grad.md | Occasion template: HS/college graduation (forward-facing, bittersweet). | pantry | CURRENT |
| ai:_packets/SPINE/skills/occasion-templates/wedding.md | Occasion template: wedding gift to a couple. | pantry | CURRENT |
| ai:_packets/_archive/README.md | `_archive/` = integrated work kept for lineage; nothing live. | noise | SUPERSEDED |
| ai:_packets/_archive/AUDIT.md | Packet-29 codebase audit (shortcuts found) @ 5376e52. | bugs | SUPERSEDED |
| ai:_packets/_archive/COMMENTS.md | Comment audit log (every comment + WHY it can't be code). | noise | SUPERSEDED |
| ai:_packets/_archive/ORCHESTRATOR-NOTES.md | Batch-4 dispatch critical review (cross-reset persistence). | decisions/handoff | SUPERSEDED |
| ai:_packets/_archive/orch-desktop/HANDOFF.md | Desktop orchestrator → next desktop orchestrator (2026-05-26). | handoff | SUPERSEDED |
| ai:_packets/_archive/orch-desktop/HANDOFF-CC-001.md | cc-on-web orchestrator handoff #1 (delta since desktop). | handoff | SUPERSEDED |
| ai:_packets/_archive/orch-desktop/HANDOFF-CC-002.md | Handoff #2 + Frank's mobile QA feedback. | handoff | SUPERSEDED |
| ai:_packets/_archive/orch-desktop/HANDOFF-CC-003.md | Handoff #3 (delta + open questions). | handoff | SUPERSEDED |
| ai:_packets/_archive/orch-desktop/HANDOFF-CC-004.md | Handoff #4 (quick dump; naming note resolving BRAIN-DUMP). | handoff | SUPERSEDED |
| ai:_packets/_archive/orch-desktop/A-001-runtime-state.md | Reply to Q-001: runtime state of vnext (desktop CC). | decisions | SUPERSEDED |
| ai:_packets/_archive/orch-desktop/Q-001-runtime-state.md | Question: runtime state of peek-gift-vnext (blank-page debug). | bugs | SUPERSEDED |
| ai:_packets/_archive/orch-desktop/AUDIT-ENVS-001.md | Full env/key/version audit across all vendors (2026-05-26). | services | SUPERSEDED |
| ai:_packets/_archive/orch-desktop/CLERK-V7-NOTES.md | Clerk v7 Signal-based API notes for the auth rip-out. | mechanics/handoff | SUPERSEDED |
| ai:_packets/_archive/orch-desktop/PROMPT-REVIEW-CC-005.md | Curator system-prompt keep/cut/rewrite proposal for Frank. | design/decisions | SUPERSEDED |
| ai:_packets/_archive/orch-desktop/PROMPT-V2-DRAFT.md | Proposed new STATIC_SYSTEM_PROMPT verbatim (for ratification). | mechanics | SUPERSEDED |
| ai:_packets/_archive/orch-desktop/TOOL-DESCRIPTION-TONE.md | Rewrite tool descriptions confident (skittish-Claude fix, QA#15). | mechanics | SUPERSEDED |
| ai:_packets/_archive/integrated-packets/01-foundation/prompt.md | Packet 01: Next.js 15 + TS + Tailwind v4 + env loader. | mechanics | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/02-schema/prompt.md | Packet 02: DB schema (Drizzle + Supabase peek_v2). | mechanics | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/03-anthropic/prompt.md | Packet 03: Anthropic client + tool-registry skeleton. | mechanics | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/04-supabase/prompt.md | Packet 04: Supabase clients + storage helpers. | mechanics | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/05-ui/prompt.md | Packet 05: UI primitives (shadcn + theme + adaptive Vibe renderer). | design/mechanics | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/06-clerk/prompt.md | Packet 06: Clerk integration (middleware, routes, webhook). | mechanics | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/07-proxy-rename/prompt.md | Packet 07: rename middleware.ts → proxy.ts (Next 16). | mechanics | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/10-chat-api/prompt.md | Packet 10: Chat API route (streaming + tool-use loop). | mechanics | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/10-chat-api/NOTES.md | Packet 10 notes: anon-session ownership / missing metadata col. | decisions/bugs | SUPERSEDED |
| ai:_packets/_archive/integrated-packets/11-tools/prompt.md | Packet 11: tool implementations (the verbs Peek uses). | mechanics | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/12-chat-ui/prompt.md | Packet 12: Chat UI shell + live preview pane (mobile-first). | design/mechanics | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/12-chat-ui/NOTES.md | Packet 12 notes (naming). | decisions | SUPERSEDED |
| ai:_packets/_archive/integrated-packets/13-schema-fix/prompt.md | Packet 13: schema fix (anon draft flow + Vibe type align). | mechanics | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/13-schema-fix/NOTES.md | Packet 13 notes (migration generation). | decisions | SUPERSEDED |
| ai:_packets/_archive/integrated-packets/14-recipient-view/prompt.md | Packet 14: recipient view /g/[slug] + cinematic reveal + picks API. | mechanics | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/14-recipient-view/NOTES.md | Packet 14 notes (decisions/deviations). | decisions | SUPERSEDED |
| ai:_packets/_archive/integrated-packets/15-checkout/prompt.md | Packet 15: Stripe checkout publish gate + webhook + success flow. | mechanics/services | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/15-checkout/NOTES.md | Packet 15 notes (Stripe apiVersion). | decisions | SUPERSEDED |
| ai:_packets/_archive/integrated-packets/16-share-og/prompt.md | Packet 16: share flow + OG image gen + Resend confirmation email. | mechanics/services | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/16-share-og/NOTES.md | Packet 16 notes (CRITICAL merge with packet 14 /g/[slug]). | decisions | SUPERSEDED |
| ai:_packets/_archive/integrated-packets/17-chat-cleanup/prompt.md | Packet 17: chat plumbing cleanup (shared SseEvent, onToolResult). | mechanics | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/17-chat-cleanup/NOTES.md | Packet 17 notes (Vibe cast removal pending). | decisions | SUPERSEDED |
| ai:_packets/_archive/integrated-packets/18-deploy-fix/prompt.md | Packet 18: get peek-gift-vnext actually deploying on Netlify. | services | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/18-deploy-fix/NOTES.md | Packet 18 notes (final deploy state). | services | SUPERSEDED |
| ai:_packets/_archive/integrated-packets/20-chat-polish/prompt.md | Packet 20: image upload + chat history + mobile slide-up + publish CTA. | mechanics | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/20-chat-polish/NOTES.md | Packet 20 notes (migration chain fix). | decisions | SUPERSEDED |
| ai:_packets/_archive/integrated-packets/21-vibe-progressive/prompt.md | Packet 21: progressive vibe engine (palette extract + tone classifier). | design/mechanics | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/21-vibe-progressive/NOTES.md | Packet 21 notes (deliverables). | decisions | SUPERSEDED |
| ai:_packets/_archive/integrated-packets/22-image-gen/prompt.md | Packet 22: fal.ai image gen harden + Supabase re-host + URL scraper. | mechanics/services | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/22-image-gen/NOTES.md | Packet 22 notes (fal.ai endpoint shape). | services | SUPERSEDED |
| ai:_packets/_archive/integrated-packets/24-affiliate/prompt.md | Packet 24: outbound affiliate link layer (Skimlinks/Sovrn + webhook). | services/mechanics | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/24-affiliate/NOTES.md | Packet 24 notes (conflict with packet-22 scrape_url). | decisions | SUPERSEDED |
| ai:_packets/_archive/integrated-packets/25-analytics/prompt.md | Packet 25: PostHog server+client + LLM observability + events writer. | services/mechanics | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/25-analytics/NOTES.md | Packet 25 notes (what landed). | decisions | SUPERSEDED |
| ai:_packets/_archive/integrated-packets/26-inngest-jobs/prompt.md | Packet 26: Inngest jobs (relationship nudges + scrape queue + retries). | services/mechanics | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/28-custom-auth-ui/prompt.md | Packet 28: custom auth UI replacing Clerk prebuilt components. | mechanics | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/28-custom-auth-ui/NOTES.md | Packet 28 notes (deviations). | decisions | SUPERSEDED |
| ai:_packets/_archive/integrated-packets/29-audit/prompt.md | Packet 29: codebase audit (find every shortcut, no fixes). | bugs | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/30-type-safety/prompt.md | Packet 30: type-safety pass (kill placeholders/casts/anys). | mechanics | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/30-type-safety/NOTES.md | Packet 30 notes (counts). | decisions | SUPERSEDED |
| ai:_packets/_archive/integrated-packets/31-security/prompt.md | Packet 31: security hardening. | mechanics/decisions | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/31-security/NOTES.md | Packet 31 security notes (build green). | bugs | SUPERSEDED |
| ai:_packets/_archive/integrated-packets/32-tests-ci/prompt.md | Packet 32: tests + CI. | mechanics | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/32-tests-ci/NOTES.md | Packet 32 notes (what landed). | decisions | SUPERSEDED |
| ai:_packets/_archive/integrated-packets/33-reliability/prompt.md | Packet 33: reliability (error boundaries, logging, retry/backoff). | mechanics | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/34-observability/prompt.md | Packet 34: Sentry + OG cache + internal scrape + client share events. | services/mechanics | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/34-observability/NOTES.md | Packet 34 notes (env vars orchestrator must add). | services | SUPERSEDED |
| ai:_packets/_archive/integrated-packets/35-quality/prompt.md | Packet 35: quality pass (a11y + SEO + mobile + palette extraction). | mechanics/design | SUPERSEDED(integrated) |
| ai:_packets/_archive/integrated-packets/35-quality/NOTES.md | Packet 35 notes (validation). | decisions | SUPERSEDED |
| ai:atelier/README.md | atelier = Next 16 + TS 6 + Tailwind v4 foundation; root app is scrap. | requirements | CURRENT(branch) |
| ai:atelier/lib/auth/setup-notes.md | Clerk one-time dashboard config for accounts.peek.gift (shared app). | services/handoff | CURRENT |
| ai:atelier/tests/e2e/AUTH-CHECKOUT-SMOKE.md | Auth+checkout E2E smoke @ eb1f164 (WebFetch/curl/Stripe+Supabase MCP). | bugs | CURRENT(dated) |
| ai:atelier/tests/e2e/MOBILE-AUDIT.md | Mobile-first audit (Playwright; 375/414 viewports). | bugs/design | CURRENT(dated) |
| ai:atelier/tests/e2e/screenshots/curator-flow-2026-05-28/desktop-console-errors.txt | Smoke artifact: desktop console errors. | noise | SUPERSEDED |
| ai:atelier/tests/e2e/screenshots/curator-flow-2026-05-28/desktop-recipient-status.txt | Smoke artifact: desktop recipient status. | noise | SUPERSEDED |
| ai:atelier/tests/e2e/screenshots/curator-flow-2026-05-28/mobile-console-errors.txt | Smoke artifact: mobile console errors. | noise | SUPERSEDED |
| ai:atelier/tests/e2e/screenshots/curator-flow-2026-05-28/mobile-recipient-status.txt | Smoke artifact: mobile recipient status. | noise | SUPERSEDED |
| ai:atelier/tests/e2e/screenshots/post-batch-deploy/api-chat-sse.txt | Smoke artifact: `{"error":"forbidden"}` — chat SSE blocked unauth. | noise/bugs | SUPERSEDED |

---

## TABLE 2 — gallant-planck-pu51x (the monorepo studio) — 41 docs

`gp:` = `origin/claude/gallant-planck-pu51x`. **All rows below are byte-identical on `studio-vnext`
EXCEPT `WAKEUP.md` (studio has its own variant) — and all the root/docs/jumpoff rows are also
identical on `bold-feynman` (feynman lacks the recon-assets/RECON_*/SPINE families).**

| branch:path | one-line purpose (from first lines) | category | status |
|---|---|---|---|
| gp:CLAUDE.md | Operating contract for vNext (roles, hard rules, SPEC=source of truth). | decisions | CURRENT |
| gp:DECISIONS.md | Settled calls + dead-ends (model is the resolver; overbuild the contract). | decisions | CURRENT |
| gp:DESIGN_QUESTIONS.md | Open design calls to resolve at greenlight (DQ-1..n with recommendations). | design/decisions | CURRENT |
| gp:PLAN.md | STEP-0 plan for founder+design greenlight (keep v0, freeze spine, swap brain). | design/requirements | CURRENT |
| gp:README.md | vNext one-pager (chat-driven builder; stack; isolation from prod). | requirements | CURRENT |
| gp:WAKEUP.md | Live-state wake-up for the monorepo build (apps/web + packages/core, 53 tests). | handoff | CURRENT(branch-specific) |
| gp:RECON_FINDINGS.md | Full repo recon + decision/correction trail (ARCHIVE; build from BUILD_BRIEF instead). | decisions/transcript | SUPERSEDED(provenance) |
| gp:RECON_RAW.md | Verbatim file dumps companion to RECON_FINDINGS (from bold-feynman HEAD). | transcript/noise | SUPERSEDED(provenance) |
| gp:docs/DESIGN_REVIEW_2026-06-01.md | Design-seat review of the renderer (real lib/peek-render run in harness). | design | CURRENT(dated) |
| gp:docs/PROJECT_SUMMARY_2026-06-01.md | Project summary for Claude Code (product, working rules, status). | requirements/decisions | CURRENT(dated) |
| gp:lib/ir/INTERFACES.md | The three frozen seams (chat authors / renderer consumes / checkout consumes PeekIR). | mechanics | CURRENT |
| gp:_packets/SPINE/GROUND-TRUTH.md | What is ACTUALLY real in the deployed system, verified vs primary evidence (2026-06-02). | services/decisions | CURRENT(dated) |
| gp:_packets/SPINE/BUILD-MAP.md | exists-and-works vs to-build (BUILD-BOOK Ch 0.3); reuse-left / build-right. | decisions/future | CURRENT |
| gp:_packets/SPINE/PROGRESS.md | vNext build progress; the studio main page done + live-verified. | decisions | CURRENT(branch) |
| gp:_packets/SPINE/DEPLOY.md | Deploying the vNext studio (set Netlify production branch). | services/handoff | CURRENT |
| gp:_packets/SPINE/WAKEUP.md | SPINE-folder wake-up duplicate of root WAKEUP (don't restart). | handoff | CURRENT(branch) |
| gp:peek-jumpoff/README.md | The code-ready design package; read order. | design | CURRENT |
| gp:peek-jumpoff/00_MAP.md | THE MAP — whole picture on one page; framework every part must fit. | design/requirements | CURRENT |
| gp:peek-jumpoff/FOR_CODE.md | Paste-ready build instructions for the Claude Code chat. | design/handoff | CURRENT |
| gp:peek-jumpoff/JUMPOFF.md | From the instance that made the original 10 mockups — taste/voice transfer. | design | CURRENT |
| gp:peek-jumpoff/TIPS.md | Traps + the test loop (the "every page is the same font" collapse). | design/mechanics | CURRENT |
| gp:peek-jumpoff/reference/REFERENCE.md | Vetted reference (not authority); trust order mockups > renderer > prose. | design | CURRENT |
| gp:peek-jumpoff/reference/DESIGN_DIRECTOR_AGENT.md | The taste/inference agent: casual chat → designed sites. | design/mechanics | CURRENT(ref) |
| gp:peek-jumpoff/reference/DESIGN_EXPORT_MANIFEST.md | Honest weeding guide (⭐/🔧/⚠️/🗑) for the design-export files. | design/decisions | CURRENT(ref) |
| gp:peek-jumpoff/reference/GAP_ANALYSIS.md | Aesthetic gap analysis: renderer vs hand mockups, gap→file→root-cause. | design/bugs | CURRENT |
| gp:peek-jumpoff/reference/NOTE_TO_SELF.md | "Read this then GO"; the BAR is the hand mockups, not the engine. | design | CURRENT |
| gp:peek-jumpoff/reference/SHELL_SPEC.md | Renderer interaction-shell blueprint (thresholds/easings from mockups). | design/mechanics | CURRENT |
| gp:peek-jumpoff/reference/vision/README.md | vision/ = end-vision reference (DATED; not authority). | requirements | SUPERSEDED(dated ref) |
| gp:peek-jumpoff/reference/vision/CONCEPT_BREAKDOWN.md | Concept breakdown (the problem with existing gifting). | requirements/design | CURRENT(ref) |
| gp:peek-jumpoff/reference/vision/REQUIREMENTS_SPEC.md | Requirements & system spec from the two transcripts, grounded vs live DB. | requirements/transcript | CURRENT |
| gp:peek-jumpoff/reference/vision/BACKEND_SERVICES.md | Backend & vendor services snapshot (status tiers × horizon). | services | CURRENT(dated) |
| gp:peek-jumpoff/samples/README.md | samples/ — sloppy line → valid IR → page as good as originals. | mechanics/design | CURRENT |
| gp:recon-assets/PEEK_GIFT_BUILD_BRIEF.md | THE settled single source of truth for the build chat (22 addenda consolidated). | requirements/decisions | CURRENT |
| gp:recon-assets/PEEK_GIFT_BUILD.md | Everything the build chat needs in one file + launch instructions. | requirements/handoff | CURRENT |
| gp:recon-assets/peek-gift-BUILD-BOOK.md | THE BUILD BOOK Ch 0-2: cascading gated prompt sequence + operating contract. | requirements/decisions | CURRENT |
| gp:recon-assets/BUILD-BOOK-Ch3-8.md | BUILD BOOK Ch 3-8 (post-monorepo-decision continuation). | requirements/decisions | CURRENT |
| gp:recon-assets/BUILD-CHAT-LAUNCH-KIT.md | Copy-paste setup for the session that runs the BUILD-BOOK (live prod day one). | handoff | CURRENT |
| gp:recon-assets/DESIGN_PROJECT_BRIEF.md | Product & technical brief (cold-start reference; factual spec). | requirements/design | CURRENT(ref) |
| gp:recon-assets/DESIGN_ENGINE_TOOLKIT.md | Master design vocabulary catalog (fonts/type-art/color/scenes/motifs/frames). | pantry/design | CURRENT |
| gp:recon-assets/CODE_PROJECT_SUMMARY_2026-06-01.md | Project summary (dup of docs/PROJECT_SUMMARY; status 2026-06-01). | requirements/decisions | SUPERSEDED(dup) |
| gp:recon-assets/backendservices-revised.md | Backend & vendor services revised snapshot (dup-family of vision/BACKEND_SERVICES). | services | CURRENT(dated) |

---

## TABLE 3 — studio-vnext-only docs (the 2 deltas over gallant-planck) — newest layer

`sv:` = `origin/claude/studio-vnext`. (Everything else on studio = the planck rows above, identical blobs.)

| branch:path | one-line purpose (from first lines) | category | status |
|---|---|---|---|
| sv:IN-SITE-CHAT-MASTER-PLAN.md | Canonical plan to stand the curator chat to overbuilt standard; **DUAL REPRESENTATION** decision (HTML + structured spine); security launch-blockers. Consolidated from 5 workstreams. | decisions/design/future | CURRENT (newest plan) |
| sv:BUILDOUT-STATUS.md | Live progress for the in-site-chat buildout (PR #13); pantry.ts, exemplar, system-prompt, self-critique gate; green baseline 57+47 tests. | decisions/mechanics | CURRENT (newest status) |
| sv:WAKEUP.md | studio-vnext live-state wake-up (its own blob; differs from planck/feynman). | handoff | CURRENT(branch-specific) |

---

## TABLE 4 — bold-feynman-SZzaO — 25 docs (the lean lib/ir origin)

`bf:` = `origin/claude/bold-feynman-SZzaO`. **Every doc here is byte-identical to the same path on
gallant-planck/studio EXCEPT `bf:WAKEUP.md` (feynman's own variant).** Feynman is the SUBSET that lacks
`recon-assets/**`, `RECON_*`, and `_packets/SPINE/**`. Listed for completeness; no unique content beyond WAKEUP.

| branch:path | note | status |
|---|---|---|
| bf:WAKEUP.md | feynman-specific live-state wake-up (unique blob). | CURRENT(branch-specific) |
| bf:CLAUDE.md / DECISIONS.md / DESIGN_QUESTIONS.md / PLAN.md / README.md | = planck rows (identical blobs). | CURRENT |
| bf:docs/DESIGN_REVIEW_2026-06-01.md / docs/PROJECT_SUMMARY_2026-06-01.md | = planck rows. | CURRENT(dated) |
| bf:lib/ir/INTERFACES.md | = planck row (the frozen seams; feynman is where lib/ir originated). | CURRENT |
| bf:peek-jumpoff/** (16 files: 00_MAP, FOR_CODE, JUMPOFF, README, TIPS, samples/README, reference/* incl. vision/*) | = planck rows (identical blobs). | CURRENT |

---

## TABLE 5 — peek-clean — 9 files (strict subset of atelier-integration, byte-identical)

`pc:` = `origin/peek-clean`. NOTHING UNIQUE. All 9 are the `atelier/**` README/setup-notes/2 e2e MD +
5 smoke .txt, identical to `ai:` blobs (verified). Adds zero new content to the census.

| branch:path | maps to | status |
|---|---|---|
| pc:atelier/README.md | = ai:atelier/README.md | DUP |
| pc:atelier/lib/auth/setup-notes.md | = ai:atelier/lib/auth/setup-notes.md | DUP |
| pc:atelier/tests/e2e/AUTH-CHECKOUT-SMOKE.md | = ai: same | DUP |
| pc:atelier/tests/e2e/MOBILE-AUDIT.md | = ai: same | DUP |
| pc:atelier/tests/e2e/screenshots/**/*.txt (5 files) | = ai: same | DUP/noise |

---

# HIGH-VALUE DOCS the other prep agents should NOT miss

Indexed by the prep-agent that owns each category. If an agent's section is thin, that is the gap to close.
**Cross-branch caution:** the project forked. `atelier-integration` is the OLD packet/structured-IR world;
the `claude/*` branches (feynman → planck → studio) are the NEWER lean-IR / monorepo / freeform-HTML world.
`studio-vnext`'s `IN-SITE-CHAT-MASTER-PLAN.md` explicitly reverses an atelier-era rule ("never raw HTML")
via the DUAL REPRESENTATION decision. Agents must read BOTH eras and note the reversal.

### transcripts (raw human signal / verbatim source)
- **gp:peek-jumpoff/reference/vision/REQUIREMENTS_SPEC.md** — extracted from the two 2026-05-28/05-29 transcripts (closest thing to the raw transcript signal; ⟦spec⟧/⟦live⟧/⟦thin⟧ tagged).
- **ai:_packets/BRAIN-DUMP.md** — Frank's raw words 2026-05-26 (the founder voice).
- **gp:RECON_RAW.md** — verbatim file dumps (provenance, not narrative).
- GAP: there is **no literal chat-transcript file** in any branch — the closest sources are the three above (extracted/recompiled, not verbatim dialogue). Flag for the transcripts agent.

### requirements (what to build)
- **gp:recon-assets/PEEK_GIFT_BUILD_BRIEF.md** — THE settled source of truth (22 addenda consolidated).
- **gp:peek-jumpoff/reference/vision/REQUIREMENTS_SPEC.md** — the product/system spec grounded vs live DB.
- **gp:recon-assets/peek-gift-BUILD-BOOK.md** + **BUILD-BOOK-Ch3-8.md** — the gated build plan (operating contract + chapters).
- **ai:_packets/CONCEPT-V2.md** / **gp:peek-jumpoff/reference/vision/CONCEPT_BREAKDOWN.md** — concept (near-duplicate; CONCEPT-V2 is the atelier copy).
- **ai:_packets/SPINE/README.md** — the load-bearing definition of the product.
- **sv:IN-SITE-CHAT-MASTER-PLAN.md** — the newest requirements/architecture statement (supersedes scattered notes on the studio side).

### vision-design (taste, aesthetic moat, the bar)
- **gp:peek-jumpoff/00_MAP.md**, **JUMPOFF.md**, **NOTE_TO_SELF.md**, **TIPS.md** — the taste/voice/method transfer from the mockup author. The aesthetic-moat core.
- **gp:peek-jumpoff/reference/SHELL_SPEC.md** + **GAP_ANALYSIS.md** — renderer caliber spec + where it falls short of the mockups.
- **gp:peek-jumpoff/reference/DESIGN_DIRECTOR_AGENT.md** + **DESIGN_EXPORT_MANIFEST.md** + **REFERENCE.md** — the director agent + honest weeding/trust-order.
- **gp:docs/DESIGN_REVIEW_2026-06-01.md** — design-seat review of the actual renderer.
- **gp:DESIGN_QUESTIONS.md** + **PLAN.md** — open taste calls + the greenlight plan.
- **ai:_packets/SPINE/UI-QUALITY-AUDIT-2026-05-28.md** — the "bland / vibe only moves colors+fonts" critique (atelier era).

### mechanics-ir (the IR contract, tools, prompt, rules engine)
- **gp:lib/ir/INTERFACES.md** — the three frozen seams (chat authors / renderer consumes / checkout consumes PeekIR). THE contract doc.
- **ai:_packets/SPINE/CURATOR_PROMPT.md** + **TOOL_MANIFEST.md** — Peek's canonical system prompt + every callable tool (atelier era; note bootstrap.ts requirement).
- **gp:peek-jumpoff/samples/README.md** — the sloppy-line → IR → page proof path.
- **ai:_packets/SPINE/skills/rules-engine-patterns.md** — the rules engine = the novel core.
- **sv:BUILDOUT-STATUS.md** — the newest mechanics state (pantry.ts, exemplar, system-prompt split, 10-axis self-critique gate).
- **ai:_packets/_archive/orch-desktop/PROMPT-V2-DRAFT.md** + **PROMPT-REVIEW-CC-005.md** — prior system-prompt rewrite proposals (lineage).

### services-ops (vendors, keys, deploy, live state)
- **gp:_packets/SPINE/GROUND-TRUTH.md** — what is ACTUALLY real in the deployed system (2026-06-02, MCP-verified). The newest ground truth.
- **ai:_packets/SPINE/VERIFIED-STATE.md** — atelier-era verified state (wins-on-conflict for that branch, 2026-05-27).
- **ai:_packets/SPINE/SERVICES.md** + **CAPABILITY_INVENTORY.md** — the service/key matrix + vendor×feature inventory.
- **ai:_packets/ANTHROPIC-API-CONTEXT.md** — Anthropic account/keys/mechanics.
- **gp:peek-jumpoff/reference/vision/BACKEND_SERVICES.md** / **gp:recon-assets/backendservices-revised.md** — the vendor catalog (status×horizon).
- **ai:_packets/SPINE/CUTOVER.md** — vNext → apex production cutover.
- **gp:_packets/SPINE/DEPLOY.md** — the one-switch Netlify deploy for the monorepo studio.
- **ai:_packets/SPINE/URL-AUDIT.md** + **LEGACY-PAYMODE-INVESTIGATION.md** + **LIVE-STATE-SMOKE.md** — vendor URL drift, the real $12 revenue path, live smoke.
- **ai:atelier/lib/auth/setup-notes.md** — Clerk dashboard one-time config.

### decisions-bugs (settled calls, dead-ends, the bug ledgers)
- **gp:DECISIONS.md** — the durable decision record (model-is-resolver, overbuild-the-contract, REJECTED engine).
- **sv:IN-SITE-CHAT-MASTER-PLAN.md** — the DUAL REPRESENTATION decision that REVERSES the "never raw HTML" rule (needs Frank's blessing) + the security launch-blockers.
- **ai:_packets/BUGS.md** (live ledger) + **BUGS-WAVE2.md** + **BUGS-WAVE2-FOLLOWUPS.md** + **BUGS-CHAT-LOOP.md** — the four bug ledgers (atelier era).
- **gp:_packets/SPINE/BUILD-MAP.md** — reuse-vs-rebuild decisions.
- **ai:_packets/CONCEPT-INVENTORY.md** — WIRED/PARTIAL/STUB/ABSENT per concept (what's real vs claimed).
- **ai:_packets/SPINE/CURATOR-FLOW-AUDIT-2026-05-28.md** + **UI-AUDIT-POST-DEPLOY.md** + **atelier/tests/e2e/AUTH-CHECKOUT-SMOKE.md** + **MOBILE-AUDIT.md** — live audit findings (anon meter wall, 500s).
- **gp:RECON_FINDINGS.md** — the full decision/correction trail (provenance; the "why" behind settled calls).

### future-roadmap (what's after MVP)
- **ai:_packets/ROADMAP.md** — the post-batch-3 phased roadmap.
- **ai:_packets/SPINE/IDEAS-LATER.md** — deferred speculative capabilities (graduation rules).
- **ai:_packets/SPINE/CUTOVER.md** — the path to apex/production.
- **sv:IN-SITE-CHAT-MASTER-PLAN.md** (eval + PerfectPurchase workstream) + **ai:_packets/RUN-NEXT.md** — forward dispatch / the PerfectPurchase north star.
- PerfectPurchase (the cross-retailer commerce north star) recurs in: gp:docs/PROJECT_SUMMARY, gp:recon-assets/DESIGN_PROJECT_BRIEF, sv:IN-SITE-CHAT-MASTER-PLAN.

### pantry-tokens (design vocabulary / raw materials / tokens)
- **gp:recon-assets/DESIGN_ENGINE_TOOLKIT.md** — THE master design vocabulary catalog (fonts/type-art/color/backgrounds/motifs/frames/sections; §10 theme-selection policy). This is the pantry source.
- **ai:_packets/SPINE/skills/*** (8 skills + 10 occasion-templates) — the conditionally-loaded house playbooks/pantry (vibe-direction, image-direction, copy-house-style, reveal/share/rules mechanics, voice-camera, affiliate-strategy + the 10 occasion templates).
- **sv:BUILDOUT-STATUS.md** notes `pantry.ts` was transcribed FROM `DESIGN_ENGINE_TOOLKIT §1–§9` into code on the studio branch — the pantry-tokens agent must reconcile the doc (toolkit) vs the code (pantry.ts) vs the atelier skills/* set (three representations of the same vocabulary).

### noise (low value; safe to skip but enumerated)
- All `ai:_packets/_archive/**` (integrated-packets prompt.md + NOTES.md, orch-desktop handoffs, AUDIT/COMMENTS) — lineage/provenance only; work already integrated.
- All 5 `.txt` smoke artifacts under `atelier/tests/e2e/screenshots/**`.
- `gp:RECON_RAW.md` (verbatim dumps), duplicate summaries (`gp:recon-assets/CODE_PROJECT_SUMMARY_2026-06-01.md` ≈ `gp:docs/PROJECT_SUMMARY`).
- `peek-clean` entirely (subset/dup of atelier).

---

## BIGGEST GAP (for CTO attention)
No verbatim chat-transcript file exists anywhere — the "transcripts" category is served only by
*extracted/recompiled* docs (REQUIREMENTS_SPEC, BRAIN-DUMP, RECON_RAW). Second: the project is split
across two architectural eras (atelier structured-IR vs claude/* lean-IR + freeform-HTML), and the
reconciling decision — DUAL REPRESENTATION — lives in ONE doc on ONE branch
(`studio-vnext:IN-SITE-CHAT-MASTER-PLAN.md`). If any agent reads only the atelier branch, it will carry
the now-reversed "never raw HTML" rule as current. The pantry vocabulary also exists in 3 unreconciled
forms (DESIGN_ENGINE_TOOLKIT doc / studio pantry.ts / atelier skills/*).
