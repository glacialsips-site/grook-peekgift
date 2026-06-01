# peek.gift vNext — Project Summary (for Claude Code)
Status as of 2026-06-01. Companion docs: `WAKEUP.md` (live state), `PLAN.md`, `DECISIONS.md`, `DESIGN_QUESTIONS.md`, `docs/DESIGN_REVIEW_2026-06-01.md`. Branch: `claude/bold-feynman-SZzaO`.

## 1. Product
Chat-driven, single-recipient gift/invite page builder. Curator sends a short brief; an Opus model authors an art-directed page that builds live under the chat; recipient opens the link and picks from cards within curator-set rules (pick-one-of / beg-to-unlock / decorative-taunt). Publish = $12 Stripe checkout. Pages must meet the visual caliber of the hand mockups. Later north star: PerfectPurchase (cross-retailer commerce decision layer; same IR + product graph).

## 2. Working rules (from CLAUDE.md)
- Frank = product/design; Claude = tech. Frank does not read git.
- Frank's current instruction outranks repo code/docs. Existing files = reference, not authority. Repo vision docs are dated.
- Build for the end state, ground-up. No MVP, no skeletons.
- Prove with artifacts (build/test/screenshot/diff); do not claim unbuilt work; no comment-bloat.
- Terse; no flattery/finality language; surface at checkpoints, not per step.
- Secrets are Frank's call. Keys are set in the `vnext.peek.gift` Netlify env; deploy there. Do not raise key/secret handling.
- No Tailwind (runtime tokens → CSS custom properties). The model is the resolver — no mandatory deterministic design engine.
- Two seats: a design Opus seat (made the mockups, holds taste + contract, has repo write) and code (this seat). Shared language = the IR; never paraphrase.

## 3. Architecture (built, tsc-clean, committed)
Spine — `lib/ir/`:
- `contract.ts` — PeekIR: `Concept` + `ThemeSpec` + `sections[]` + `cards` + `MediaSlot`. Section kinds: hero, note, giftgrid, rail, lookbook, details, tiers, stubs, tracklist, courses, flightplan, gallery, countdown, claim, custom. Theme → `--peek-*` CSS vars.
- `schema.ts` — Zod mirror: `validatePeekIR`, `sanitizeCustomHtml`, `sanitizeCssVars`.
- `ports.ts` — every vendor behind a typed port + stub (LLM, persistence, payment, image, productSource, CardResolver cascade [order config: retailer_api→url_scrape→research], storage, email, analytics, auth, moderation, botGate). App runs on stubs with no keys.
- `INTERFACES.md` — renderer API, chat SSE protocol, tool→IR reducer contracts.

Renderer — `lib/peek-render/`: `mountPeek(root, ir)` + `<PeekRenderer>`. All 16 section kinds; shell = condense-on-scroll nav, staggered menu, sticky action bar + running total, bottom sheet, reveals, count-ups, countdowns, claim; dynamic Google-font loader; scenes/frames/motifs. Conformance route `app/render-check`.

Chat — `lib/peek-chat/` + `lib/adapters/anthropic.ts` + `app/api/peek-studio/route.ts`: PEEK_SYSTEM_PROMPT voice merged with `peek-jumpoff/JUMPOFF.md`; 16 tools via pure `reduceTool`; Opus 4.8 + streaming + prompt caching; deterministic keyless stub authors a valid demo IR; safeword `bananahead` → structured self-report.

Studio — `app/studio/`: chat docked over the full-bleed live preview.

Kept v0 (move behind ports later): Stripe/Clerk/Supabase/Resend/scrape/imagegen, recipient view `app/g/[slug]`, `/build` flow, `lib/{db,stripe,imagegen,storage,resend,anthropic,peek-tools,themes,types}.ts`. Superseded first-cut to remove (DQ-11): `lib/peek/*`, `app/peek/*`.

## 4. Decisions (DECISIONS.md, design-greenlit)
`--peek-*` vars · enriched ThemeSpec tokens (space/radius{card,pill}/motion easings/eyebrowTracking) · added `details`+`gallery`, first-class `countdown`+`claim`, wild moves stay `custom` · `value_display` for ranges · CardType = product/activity/aspirational/digital · arbitrary font loading · one renderer for builder + recipient (recipient adds pick/beg/unlock) · safeword `bananahead` · Opus 4.8 + streaming + caching · CardResolver tier order = config · remove first-cut (DQ-11).

## 5. Design package (`peek-jumpoff/`)
Trust order on conflict: mockups > renderer > prose docs.
- Bar: `reference/original-mockups/*.html` (10) + `mockups/*.html` (5: For the Old Man, The Send-Off, Soft Landing, Decree Absolute, El Taquito).
- Brain/method: `JUMPOFF.md`, `00_MAP.md`, `FOR_CODE.md`, `TIPS.md`, `SHELL_SPEC.md`, `reference/DESIGN_DIRECTOR_AGENT.md`.
- Vision (dated, reference only): `reference/vision/` (concept, requirements-spec grounded in the live peek_v2 14-table schema, backend/vendor catalog).
- Rejected: `reference/engine-parametric-REJECTED/` (lookup-table engine).
- Samples: `samples/{dad-60th,charity-gala,el-taquito}.ir.json`.

## 6. Milestone 0 (done, on stubs)
`/studio` streams a brief → page builds live (theme varies, sections + cards appear); edits compose. `/render-check` paints `dad-60th` at "For the Old Man" caliber. Built by subagents: shell-spec → spine → renderer → chat → studio.

## 7. Aesthetic-gap diagnosis + fix (`peek-jumpoff/reference/GAP_ANALYSIS.md`)
- Root cause: the renderer used structurally-fixed, single-skin archetypes. `--peek-*` restyled color/type but could not restructure a section, so work-order / auction / lotería collapsed to the same card grid. IR + `custom` were fine; deficit was renderer archetypes + missing "loud" decorative tokens.
- Fix (committed; hold further iteration until Frank tests live): parametrized `giftgrid` (carousel/grid/checklist + featured card); added loud tokens (display/card shadow, border weight, texture strength); wired the count-up engine via `stats`/`lede`; hero inline accent; `details` variants; running-total at rest; removed `form` from sanitizer forbid list. Result: dad = work-order checklist + perforated ticket + rust accent + "$74 + dinner"; gala = stats band + auction headline-lot+grid; taquito = cobalt fiesta-menu + offset shadows. Card/hero art still gradient placeholders (need image port/key).

## 8. Deploy state
- Target: Netlify site `peek-gift-vnext` (id `932646db-…`) → https://vnext.peek.gift. Keys incl. `ANTHROPIC_API_KEY` are set in that site env → chat runs live once code is there.
- Issue: the Netlify connector deploy builds the site's git-connected branch (`atelier-integration` = old prototype). The git proxy restricts pushes to `claude/bold-feynman-SZzaO`, so my code can't reach `atelier-integration` by push. Current live site = old code (`/studio`, `/render-check` 404; `/build` redirects). My `next build` includes all routes (`/studio` 6.2 kB, `/render-check`, `/build`, `/api/peek-studio`).
- Unblock (one step): (a) repoint the `vnext.peek.gift` deploy branch to `claude/bold-feynman-SZzaO` (Netlify → Build & deploy → Branches), or (b) merge PR #8 (`claude/bold-feynman-SZzaO` → `atelier-integration`).
- PRs: #9 = canonical PR for this branch (pushes update it); #8 = deploy-route PR into `atelier-integration`. Subscribed to CI/review on both. No GitHub Actions CI on the repo; no Netlify deploy-preview had built at last check.
- After deploy, routes: `/studio`, `/render-check` (no key needed), `/build`, `/g/3fa05cce2c6c` (real slug).

## 9. Open items
1. Flip the deploy (step 8); verify the four URLs; review caliber fixes live.
2. Hold further aesthetic iteration until Frank tests live.
3. Studio composition: spec wants a transparent floating chat over the page (current overlay is heavier).
4. Fill real ports one at a time (Anthropic wired; fal images, Supabase persistence/versions, Stripe publish, Turnstile, image moderation).
5. DQ-11 cleanup of the first-cut.
6. Unspecified: collaboration rules, social integration, Netlify ops; catalog moat (pg_products/offers + multimodal embeddings) for PerfectPurchase.

## 10. Repo map (branch `claude/bold-feynman-SZzaO`)
Root: `CLAUDE.md`, `WAKEUP.md`, `PLAN.md`, `DECISIONS.md`, `DESIGN_QUESTIONS.md`, `docs/DESIGN_REVIEW_2026-06-01.md`, this file.
App: `lib/ir/` · `lib/peek-render/` · `lib/peek-chat/` + `lib/adapters/anthropic.ts` + `app/api/peek-studio/` · `app/studio/` · `app/render-check/` · kept v0.
Tooling notes: large files via Write/heredoc, not Edit (truncates); subagents share the tree (commit by path; commit+push before stopping or the stop-hook blocks); puppeteer gets pruned by `npm install` → `npm i puppeteer --no-save` (chromium cached).
