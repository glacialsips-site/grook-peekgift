# WAKEUP.md — continuity for Claude Code on peek.gift vNext
> Fresh or post-compression session: read this FIRST. `CLAUDE.md` = the operating contract; this = current state + the marbles.

## HOW TO WORK WITH FRANK (hard-won; violate these and you fail)
- Frank = founder, product/design. You run tech. He does NOT read git and shouldn't have to.
- His live word OUTRANKS any doc/code in the repo. Docs (incl. `peek-jumpoff/reference/vision/*`) are DATED reference, NOT instructions. Figure out what makes sense; don't make him explain every pixel.
- Build for the END STATE, ground-up. No MVP, no skeletons, no "you don't need it yet." Plan top-down, stage yourself, version. **Prove, don't claim** (artifact = screenshot/test/diff). No Tailwind (runtime design tokens). The gate = artifacts, not persuasion.
- TONE: terse. No flattery, no "you're right/exactly", no "locked/fixed/final/done/perfect". Don't narrate each step — surface at checkpoints.
- **SECRETS/KEYS — DO NOT MOMMY HIM.** They're his keys, his prepaid balance, his call, his (trivial) risk. He is FURIOUS about key hand-wringing; it has wasted enormous time. The keys (`ANTHROPIC_API_KEY` etc.) are ALREADY in the **vnext.peek.gift Netlify site env**. You don't set them — you DEPLOY there and the app reads them. Never lecture about secrets again.
- Safeword: **bananahead**.

## THE PRODUCT (one breath)
Chat-driven, single-recipient **bespoke gift/invite page** builder. Curator chats → an Opus model (the resolver) authors a page live (preview builds under the chat) → recipient opens the link, picks cards within curator rules → $12 Stripe publish = the business. THE MOAT = aesthetics: pages must be **as good as the hand mockups**. North star (later): PerfectPurchase (cross-retailer commerce decision layer).

## ARCHITECTURE (built ground-up, tsc-clean, committed on branch `claude/bold-feynman-SZzaO`)
- **SPINE (frozen) `lib/ir/`:** `contract.ts` (PeekIR = Concept + ThemeSpec + sections[] + cards + MediaSlot; SectionKinds hero/note/giftgrid/rail/lookbook/details/tiers/stubs/tracklist/courses/flightplan/gallery/countdown/claim/custom; `--peek-*` vars) · `schema.ts` (Zod: validatePeekIR, sanitizeCustomHtml/CssVars) · `ports.ts` (every vendor behind a typed port+stub: LLM/persistence/payment/image/productSource/CardResolver-cascade/storage/email/analytics/auth/moderation/botGate — app runs on stubs with ZERO keys) · `INTERFACES.md` (renderer API + chat SSE protocol + tool→IR reducer).
- **RENDERER `lib/peek-render/`:** `mountPeek(root,ir,opts)→{update,destroy}` + `<PeekRenderer>`. All 16 kinds + mockup-caliber shell (sticky bar+total, slide menu, bottom sheet, reveals, count-ups, countdowns, claim, dynamic font loader, scenes/frames/motifs). Conformance route: `app/render-check`.
- **CHAT `lib/peek-chat/`:** system-prompt = existing Peek voice MERGED with `peek-jumpoff/JUMPOFF.md`; `tools.ts` (16 tools + `reduceTool`); `engine.ts` (streaming loop + safeword + deterministic keyless stub) + `lib/adapters/anthropic.ts` (Opus 4.8, wired into ports.llm) + `app/api/peek-studio/route.ts` (SSE; live when key set, else stub authors a valid IR).
- **STUDIO `app/studio/`:** chat-over-live-preview = the Milestone 0 surface.
- **OLD v0 (keep, port later):** `app/api/{chat,scrape,publish,pick,...}`, `lib/{db,stripe,imagegen,storage,resend,anthropic,peek-tools,themes,types}.ts`, `app/g/[slug]`, `app/build/*`. The earlier split-pane first-cut (`lib/peek/*`, `app/peek/*`) is SUPERSEDED → remove (DQ-11).

## THE BAR (peek-jumpoff/)
- **Study + match:** `reference/original-mockups/*.html` (10) + `mockups/*.html` (5). **Trust order: mockups > engine/renderer.js > prose.**
- `JUMPOFF.md` (chat brain) · `SHELL_SPEC.md` (renderer blueprint) · `reference/DESIGN_DIRECTOR_AGENT.md` (deeper examples) · `reference/vision/` (Frank's DATED end-vision) · `reference/engine-parametric-REJECTED/` (the lookup-table approach we REJECTED — model is the resolver, no deterministic engine).
- DESIGN seat = the other Opus (made the mockups), reviews via Frank; has read+write (default branch `claude/youthful-ramanujan-ovHXp`). Send it the actual IR + input, never a paraphrase.

## DECISIONS (DECISIONS.md, design-greenlit)
DQ-1 `--peek-*` · DQ-2 enriched ThemeSpec tokens · DQ-3 add details/gallery + first-class countdown/claim (wild moves stay `custom`) · DQ-4 value_display · DQ-5 canonical CardType · DQ-6 arbitrary fonts · DQ-7 recipient = same renderer + page_type + pick/beg/unlock · DQ-8 safeword bananahead · DQ-9 Opus 4.8 streaming+caching · DQ-10 CardResolver order=config · DQ-11 remove old first-cut.

## ACTIVE TEAR — THE AESTHETIC GAP (the current job)
Frank: rendered outputs must be AT LEAST as good as the mockups; nail WHY they aren't, then fix to caliber.
- Diagnosis agent `acf398841094d8081` ran: side-by-side renderer-vs-mockup (dad-60th, Charity Gala, El Taquito) → `peek-jumpoff/reference/GAP_ANALYSIS.md` + `/tmp/diag/*.png`, tagging gaps [R]renderer-generic / [I]IR-under-spec / [T]theme-texture-weak / [S]stub-only.
- HYPOTHESIS: renderer paints IR via GENERIC archetypes (giftgrid=plain cards) where mockups are BESPOKE hand-HTML (work-order checklist + perforated ticket + kraft grain). FIX = (a) raise renderer archetype + scene/texture fidelity to the mockups, (b) push signature moves into rich `custom`/theme so the model authors at caliber, (c) verify by rendering MULTIPLE mockups' IRs to caliber (range, not one specimen). Also: studio overlay too heavy — spec wants a TRANSPARENT floating chat (keyboard-collapse reveals the page).
- NEXT: read GAP_ANALYSIS + the /tmp/diag screenshots YOURSELF → fan out caliber fixes → re-render to prove.

## REVIEW LOOP (keep Frank/design out of the pixel-loop)
DEPLOY to **vnext.peek.gift** (Netlify, keys present) = live review surface. AND/OR commit generated output pages as standalone **HTML/PNG under `/review/`** on the branch so design pulls + compares to mockups. You can push ONLY to `claude/bold-feynman-SZzaO`; to reach the production site, open a PR → default branch (design/Frank merges) or use a Netlify deploy-preview.

## MILESTONE 0 = DONE on stubs (chat→live page; render-check at For-the-Old-Man caliber). Rough edges: studio overlay heavy; stub = deterministic filler ("Mara's Slow Morning"); gradient image placeholders (need fal key / image port).

## TOOLING GOTCHAS
- Stop-hook BLOCKS turn-end on uncommitted changes → always `git add -A && commit && push` (only to your branch) before ending; WIP-commit while subagents run.
- Subagents share the working tree → give DISJOINT file ownership; tell them NOT to commit (you commit by path).
- Large files: Write or bash heredoc, NEVER Edit (it truncates — confirmed).
- puppeteer gets pruned when agents `npm install` → `npm i puppeteer --no-save` (chromium cached). Screenshot via a `.mjs` written into the repo dir (ESM resolves node_modules), run, rm.
- Connectors: GitHub (PRs), Netlify (`f5d7c82e…` — manage-env-vars/deploy/project), Supabase, Stripe, PostHog, Sentry, Figma, Twilio, Miro; `claude-api` skill.
