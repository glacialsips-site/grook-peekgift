# peek.gift vNext — Project Summary
### Everything we've worked on and decided, as of 2026-06-01. (Companion to `WAKEUP.md` = live continuity state; `PLAN.md` = build plan; `DECISIONS.md` = settled calls.)

---

## 0. TL;DR
We took peek.gift vNext from a frustrating, drifting state to a working **Milestone 0**: a chat-driven, single-recipient **bespoke gift/invite page builder** where you chat and an art-directed page builds live underneath. Built ground-up on a **frozen contract + ports** architecture by a fleet of subagents, all `tsc`-clean and committed to branch **`claude/bold-feynman-SZzaO`**. We diagnosed *why* outputs didn't match the hand mockups (the renderer used structurally-fixed archetypes), **fixed it to caliber** (dad / gala / taquito now restructure per concept), and are at the **deploy step** — blocked only by a branch-routing detail (below), not by code.

---

## 1. What peek.gift is
A person texts a chat one sloppy line ("my dad's 60th, yardwork guy, taking him to dinner"). An Opus model — **the resolver** — authors a **radically art-directed, single-recipient gift or invite page** that builds in real time *under* the conversation. The recipient opens the link, feels *seen*, and **picks** from curated cards (real products, shared activities, aspirational "taunts", digital things) within rules the curator set (pick-one-of, beg-to-unlock, decorative taunt). Publishing = a **$12 Stripe checkout** — that's the business.
- **The moat is aesthetics.** Pages must be *at least as good as the hand mockups* — "screenshot-worthy," not "good." Beauty + radical personalization is the entire value vs. a gift card.
- **North star (later): PerfectPurchase** — a supplier-neutral, cross-retailer commerce decision layer (photograph a reef tank / room → agents identify, price-tier, render into your space, one money button). Same architecture + product graph.

---

## 2. How we work together (the hard-won operating contract — see `CLAUDE.md`)
This took real friction to settle; it's now the contract:
- **You're product/design; I run tech.** You don't read git and shouldn't have to.
- **Your live word outranks anything in the repo.** Existing code/comments/docs are dated residue — reference, never authority. I figure out what makes sense; I don't make you explain every detail.
- **Build for the end state, ground-up.** No MVP, no skeletons, no "you don't need it yet." Half-measures get redone, and redoing is the waste.
- **Plan top-down, stage the work, prove don't claim** — the artifact (test/screenshot/diff/deploy) is the only evidence; never bury work in comment-bloat or claim what isn't built.
- **Tone:** terse, no flattery, no "you're right / locked / final / done / perfect." Surface at checkpoints, don't narrate every step.
- **Secrets are your call, not mine to police.** The keys live in the `vnext.peek.gift` Netlify env; I deploy there, I don't mommy you about them.
- **No Tailwind** (runtime theming via design tokens → CSS custom properties). **No "always"** in instruction docs. **The gate:** fence the model with artifacts, don't rely on persuading it.
- **Two seats, one intelligence:** a **design** Opus seat (made the original mockups, holds taste + the contract, has repo write access) and **code** (me — the live repo + build/deploy). The shared language is the **IR**, never paraphrase.

---

## 3. Capability / environment setup (the opening arc)
You asked to be "wide open" and to have me proactively map what's available. Findings, now in use:
- **Connectors live:** GitHub, **Netlify**, Supabase, Stripe, PostHog, Sentry, Figma, Twilio, Miro; plus the Claude **claude-api** skill.
- **Where config persists:** repo-committed `CLAUDE.md` (operating contract, auto-loads every session), `.claude/settings.json` (permissions + a SessionStart bootstrap hook + `legacy/` deny-fence), and `WAKEUP.md` (live state). The web **environment** holds network policy + env-vars/secrets (your side; my session can't write them).
- **Secrets reality (resolved):** there is no shared store I can write to from here; the durable answer is the env-vars box / the `vnext.peek.gift` Netlify site env (set once → every session/deploy inherits). The key churn was from pasting into ephemeral chats instead of that persistent box.
- **Continuity:** this session is near the 1M-token limit; `WAKEUP.md` is the marbles-in-one-spot handoff so a fresh/compressed session picks up cleanly.

---

## 4. The design handoff (what grounds the build)
You handed over the design seat's package; I **weeded it** (you flagged the design chat had started hallucinating), guided by its own honest `MANIFEST`. It lives under **`peek-jumpoff/`**:
- **THE BAR (trust these for quality):** `reference/original-mockups/*.html` (the original 10) + `mockups/*.html` (5 newer: For the Old Man, The Send-Off, Soft Landing, Decree Absolute, El Taquito). **Trust order when anything conflicts: the mockups > the renderer > the prose docs.**
- **The brain:** `JUMPOFF.md` (the chat's system-prompt design layer — concept / one bold move / every-choice-earns-a-because / vary the display font / anti-slop / infer-don't-ask / the safeword) + `00_MAP.md`, `FOR_CODE.md`, `TIPS.md`, `SHELL_SPEC.md`, `reference/DESIGN_DIRECTOR_AGENT.md`.
- **Vision (DATED reference, not instructions):** `reference/vision/` — concept breakdown, requirements/spec (grounded in the live `peek_v2` 14-table schema), backend/vendor catalog.
- **Cut/quarantined:** the drifted earlier doc sprawl; the parametric "lookup-table" engine is fenced as `reference/engine-parametric-REJECTED/` — **the model is the resolver; no mandatory deterministic design engine.**

---

## 5. Architecture — what got built (ground-up, `tsc`-clean, committed)
**The spine (frozen) — `lib/ir/`:**
- `contract.ts` — the **PeekIR**: `Concept` + `ThemeSpec` + `sections[]` + `cards` + `MediaSlot`; section kinds hero/note/giftgrid/rail/lookbook/details/tiers/stubs/tracklist/courses/flightplan/gallery/countdown/claim/**custom**; themed via `--peek-*` CSS vars.
- `schema.ts` — Zod mirror (`validatePeekIR`, `sanitizeCustomHtml`, `sanitizeCssVars`).
- `ports.ts` — every vendor behind a typed port + **stub** (LLM, persistence, payment, image, productSource, the tiered **CardResolver** cascade `retailer_api→url_scrape→research`, storage, email, analytics, auth, moderation, botGate). **The app runs end-to-end on stubs with zero keys.**
- `INTERFACES.md` — the renderer API + chat SSE protocol + tool→IR reducer contracts (so parts integrate by construction).

**The renderer — `lib/peek-render/`:** `mountPeek(root, ir)` + `<PeekRenderer>`; all 16 section kinds, the mockup-caliber shell (condense-on-scroll nav, staggered menu, sticky action bar + live total, bottom sheet, reveals, count-ups, live countdowns, claim theater), dynamic arbitrary-Google-font loader, scenes/frames/motifs. Conformance route `app/render-check`.

**The chat brain — `lib/peek-chat/` + `lib/adapters/anthropic.ts` + `app/api/peek-studio/route.ts`:** existing Peek voice **merged** with the JUMPOFF design layer; 16 tools that author the IR via a pure `reduceTool`; Opus 4.8 + streaming + prompt-caching; a **deterministic keyless stub** that authors a valid demo IR with no key; the **bananahead** safeword self-report.

**The studio — `app/studio/`:** chat docked over the full-bleed live preview (Milestone 0 surface).

**Kept from v0 (behind ports later):** Stripe/Clerk/Supabase/Resend/scrape/imagegen plumbing, the recipient view (`app/g/[slug]`), the `/build` curator flow, `lib/{db,stripe,imagegen,...}`. The earlier split-pane first-cut (`lib/peek/*`, `app/peek/*`) is superseded — slated for cleanup (DQ-11).

**Settled decisions (`DECISIONS.md`, design-greenlit):** `--peek-*` namespace; enriched ThemeSpec tokens; added `details`/`gallery` + first-class `countdown`/`claim`; `value_display`; canonical CardType; arbitrary fonts; one renderer for both builder + recipient (recipient adds pick/beg/unlock); safeword = **bananahead**; Opus 4.8 + streaming + caching; CardResolver order = config; remove the old first-cut.

---

## 6. Milestone 0 — proven
- **`/studio`**: type a brief → the chat streams → the page **builds live** under it (theme varies, sections + cards appear), on the keyless stub. Edits compose across turns. Verified end-to-end.
- **`/render-check`**: the renderer paints the authored `dad-60th` IR at **"For the Old Man" caliber**.
- Built by a fleet of subagents (shell-spec → spine → renderer → chat → studio), each on the frozen contract.

---

## 7. The aesthetic-gap work (the core recent focus)
You said the generated outputs must be **at least as good as the sample mockups** and to nail down *why* they weren't. Evidence-based diagnosis (`peek-jumpoff/reference/GAP_ANALYSIS.md`, with side-by-side screenshots):
- **Root cause:** the renderer painted every IR through **structurally-fixed, single-skin archetypes.** `--peek-*` restyled color/type (so pages read "good"), but it could not **restructure** a section — so a hardware work-order, an engraved auction catalogue, and a lotería invite all collapsed onto the same tasteful card grid. The IR and the `custom` escape hatch were sound; the deficit was renderer archetypes + a missing "loud" decorative-token vocabulary.
- **The fix (done, screenshots sent):** parametrized `giftgrid` (carousel / grid / **checklist** + featured card), added "loud" tokens (display/card shadows, border weight, texture strength), wired the already-built count-up engine via `stats`/`lede`, hero inline accents, `details` variants, fixed the running total, un-forbade `<form>` in the sanitizer. Result: **dad** = dashed work-order checklist + perforated dinner ticket + rust "OLD MAN" + "$74 + dinner" bar; **gala** = stats count-up band + auction headline-lot+grid + italic "Gala"; **taquito** = cobalt fiesta-menu + hard-offset sticker shadows. Structural caliber now matches; card/hero art are still gradient placeholders pending the image port/key.
- These caliber fixes are committed but **on hold for your live testing** before further aesthetic iteration (per the design review).

---

## 8. Deploy state (where we are right now)
- **Target:** the `peek-gift-vnext` Netlify site → **https://vnext.peek.gift** (site id `932646db-…`). Keys (incl. `ANTHROPIC_API_KEY`) are set in that site's env, so once my code is live there, the chat runs **fully live** (not the stub).
- **The snag (code is fine, routing isn't):** the Netlify connector's deploy builds the site's **git-connected branch (`atelier-integration` = the old prototype)**, and the git proxy only lets me push to **my** branch (`claude/bold-feynman-SZzaO`). So the current live site is old code (`/studio` + `/render-check` 404 there; `/build` redirects). My branch's `next build` cleanly includes all routes (`/studio` 6.2 kB, `/render-check`, `/build`, `/api/peek-studio`).
- **The ~10-second unblock (your pick):** **(a)** repoint the `vnext.peek.gift` deploy branch to `claude/bold-feynman-SZzaO` (Netlify → Build & deploy → Branches) — my pushed branch then builds, no merge; or **(b)** merge **PR #8** (`claude/bold-feynman-SZzaO` → `atelier-integration`) so the connected branch carries my code.
- **PRs:** **#9** is the canonical PR for this branch (per your note — pushes update it); **#8** is the deploy-route PR into `atelier-integration`. I'm subscribed to CI/review activity on both; no GitHub Actions CI exists on the repo, and no Netlify deploy-preview had built yet at last check.
- Once live: the four routes are **`/studio`** (chat → live page) · **`/render-check`** (renderer conformance, needs no key) · **`/build`** (curator flow) · **`/g/3fa05cce2c6c`** (a real recipient slug).

---

## 9. Open items / next steps
1. **Flip the deploy** (the one human step above), then verify the four URLs live and review the caliber fixes on the real site.
2. **Hold further GAP iteration** until you've tested live (your call).
3. **Studio composition polish** — the spec wants a *transparent floating* chat over the page (keyboard-collapse reveals it); the current overlay is heavier than that.
4. **Fill real ports** one adapter at a time (live Anthropic is wired; fal images, Supabase persistence/versions, Stripe publish, Turnstile, image moderation).
5. **DQ-11 cleanup** of the superseded first-cut.
6. **Thin/unspecified (your "100 more"):** collaboration rules, social integration, Netlify ops conventions; and the **catalog moat** (pg_products/offers + multimodal embeddings) toward PerfectPurchase.

---

## 10. Where things live (repo map, branch `claude/bold-feynman-SZzaO`)
- Root docs: `CLAUDE.md` (contract) · `WAKEUP.md` (live state) · `PLAN.md` · `DECISIONS.md` · `DESIGN_QUESTIONS.md` · `docs/DESIGN_REVIEW_2026-06-01.md` · this file.
- `peek-jumpoff/` — the design bundle: `JUMPOFF.md`, `00_MAP.md`, `ir/{contract,ports}.ts` (design's copy), `mockups/`, `reference/` (the 10 original mockups = the bar, `SHELL_SPEC.md`, `GAP_ANALYSIS.md`, `DESIGN_DIRECTOR_AGENT.md`, `vision/`, `engine-parametric-REJECTED/`), `samples/{dad-60th,charity-gala,el-taquito}.ir.json`.
- The app: `lib/ir/` (spine) · `lib/peek-render/` (renderer) · `lib/peek-chat/` + `lib/adapters/anthropic.ts` + `app/api/peek-studio/` (chat) · `app/studio/` (studio) · `app/render-check/` (conformance) · plus the kept v0.
