# peek.gift — BUILD-CHAT LAUNCH KIT
### Exact, copy-paste setup for the session that runs the BUILD-BOOK. Hand this to Frank.

> Reflects every decision through 2026-06-01: BUILD-BOOK monorepo + event-sourced core (Addendum XVII),
> atelier framework + feynman salvage, model-is-resolver lean chat, **Opus 4.8 day one** (XIX.1), **full
> i18n checkout via a Stripe Checkout Session** (XIX.2), drop the standalone Google Places API. Nothing here
> is run yet — it's the kit you paste to start the build session, with me staying on as advisor.

---

## PART 1 — The cloud-environment setup screen ("Update cloud environment")
Paste these exactly into the form you screenshotted.

- **Name:** `peek.gift — build`  *(or keep your "Peek.Gift 8.0"; the name is cosmetic)*
- **Network access:** **Full**  *(needs package install + Anthropic/Supabase/Stripe + Google-Fonts + later the product feeds)*
- **Environment variables** *(this field is public — "don't add secrets". Real keys stay in the Netlify vault; the build runs on port-stubs.):*
  ```
  PAY_MODE=mock
  NEXT_TELEMETRY_DISABLED=1
  ```
  *(Add only **public** vars if Ch 0 shows the app needs one to boot — e.g. `NEXT_PUBLIC_SUPABASE_URL=https://ewqpujqerdnrkjqlpobo.supabase.co`. Never a `*_SECRET_KEY` / `*_SERVICE_ROLE_KEY` / `ANTHROPIC_API_KEY` here — those live in Netlify and the app reads them at deploy.)*
- **Setup script** *(robust across the current state — `atelier/` is an npm Next 16 app — and the post-Ch-1.1 pnpm Turborepo):*
  ```bash
  set -e
  corepack enable 2>/dev/null || true
  if [ -f pnpm-workspace.yaml ]; then
    pnpm install
  elif [ -f atelier/package.json ]; then
    cd atelier && npm install
  else
    npm install
  fi
  ```
- Node version: **22** (the repo's `.nvmrc`). If the env lets you pin a Node version, pin 22.

---

## PART 2 — Git / branch prep (do this once, before or in the first session)
The single rule that removes the old dead-end: **the branch the build session pushes to must be the branch Netlify deploys.**

1. **Cut the build branch off the deployed lineage:**
   ```bash
   git fetch --all
   git checkout -b build/peek-vnext origin/atelier-integration
   git push -u origin build/peek-vnext
   ```
2. **Point Netlify at it** (Netlify → Site `peek-gift-vnext` → Build & deploy → Branches):
   - Either set **Production branch = `build/peek-vnext`** (so every push auto-deploys it), **or** enable **branch deploys** for `build/peek-vnext` (a preview URL per push) and promote to production at Ch 8 cutover. *Recommended: branch-deploys first, promote at cutover — prod isn't touched until the end-to-end gate (Ch 8.2) is green.*
   - Confirm the **git↔Netlify integration is live** (push a trivial commit, watch a build fire). If it isn't, that's the first blocker to clear.
3. **Session push scope:** the build session must be allowed to push to **`build/peek-vnext`** (the same branch Netlify watches). That's the fix for "code never reached the deploy branch."

---

## PART 3 — THE KICKOFF PROMPT  *(paste this as the first message to the build chat)*

```text
You are building peek.gift. These rules override your defaults for this entire session. Read them, then do ONLY the first task and stop at its gate.

# OPERATING CONTRACT
1. Prove, never claim. "Done" = a passing test, a 200 response, a real deploy, or a screenshot. Words are not evidence.
2. Every task ends in a GATE. Run it. Paste the real output. If the gate cannot pass, STOP — do not proceed, do not edit the gate to pass. Report exactly what blocks and wait for me.
3. No skeletons, no lorem, no "// TODO: implement". Write the body or stop and say you can't.
4. Small diffs — one concern per commit, show me the diff. When in doubt about scope, do less and stop, not more and guess.
5. Plan top-down. Never "frantically do random work in one turn." Do not use the word "always" in any instruction doc you write.

# REPO / BRANCH
- Repo: glacialsips-site/grook-peekgift. You work on branch `build/peek-vnext` (cut from `atelier-integration`). Push only to it; it is the branch Netlify deploys.
- This is a MULTI-BRANCH repo from many prior iterations. Your canonical inputs live on specific branches — read them with `git show <branch>:<path>` (do not assume the current branch has them):
  • THE BUILD BRIEF — read this FIRST (the single settled source of truth; everything below is detail/plan/provenance):
    - git show origin/claude/gallant-planck-pu51x:recon-assets/PEEK_GIFT_BUILD_BRIEF.md
  • THE PLAN (the gated build cascade):
    - git show origin/claude/gallant-planck-pu51x:recon-assets/peek-gift-BUILD-BOOK.md        (Ch 0–2)
    - git show origin/claude/gallant-planck-pu51x:recon-assets/BUILD-BOOK-Ch3-8.md            (Ch 3–8)
    - git show origin/claude/gallant-planck-pu51x:RECON_FINDINGS.md                            (ARCHIVE — full recon + provenance; only if you want the "why" behind a decision)
  • THE PRODUCT SPEC (authoritative — NOT "dated"):
    - git show origin/claude/bold-feynman-SZzaO:peek-jumpoff/reference/vision/REQUIREMENTS_SPEC.md
    - git show origin/claude/gallant-planck-pu51x:recon-assets/DESIGN_PROJECT_BRIEF.md
  • THE DESIGN METHOD + THE BAR (the quality target):
    - origin/claude/bold-feynman-SZzaO: peek-jumpoff/{JUMPOFF,00_MAP,FOR_CODE,TIPS}.md, reference/SHELL_SPEC.md, the mockups under reference/original-mockups/* and mockups/*, samples/*.ir.json, engine/parts.js
  • SALVAGE (reuse, don't rebuild):
    - origin/claude/bold-feynman-SZzaO: lib/peek-chat/* (the lean Opus chat), lib/peek-render/* (the renderer — a strict superset), lib/ir/* (the content model)
    - origin/atelier-integration: the framework (the atelier/ app, Drizzle, the event-sourced peek_mutation_log), the bookends (atelier/components/{auth,landing}/*, atelier/app/api/checkout/*, app/api/publish/route.ts), _packets/SPINE/*
    - origin/claude/feat-stripe-embedded-checkout: atelier/app/api/checkout/route.ts  (the FULL-i18n Stripe Checkout Session — your checkout reference)

# THE DECISIONS (already made — do not re-litigate)
- ARCHITECTURE: a Turborepo monorepo + a framework-agnostic packages/core + the event-sourced command→event→state gate (the maker-checker) + tRPC + Drizzle + pure render(document,theme). Build it via the BUILD-BOOK's gated Ch 0→8.
- THE MARRIAGE: keep atelier's framework + bookends; bring in feynman's lean chat + renderer + the design package; DROP atelier's rigid Sonnet chat + its governed grammar/vibe template engine.
- THE CHAT: the model is the resolver — a LEAN Opus chat (minimal prompt = what to collect + guardrails + the design method), NOT a rigid rulebook and NOT a deterministic design engine. Any "vibe engine" is a validation/repair/aesthetic safety-net + a cached pantry under the model's free authoring, never a generator.
- MODEL: Opus 4.8 for the in-app chat from day one. (A Sonnet 4.6 step-down is a later A/B behind the LLM port, once the flow is functional — not now.)
- CHECKOUT: full international from day one via a Stripe CHECKOUT SESSION (adaptive_pricing + automatic_tax + tax_id_collection + billing_address_collection + allow_promotion_codes) — Stripe handles every country/currency/tax/coupon. Do NOT build a custom currency/tax/coupon layer. The standalone Google Places API is redundant (Stripe's Address Element has it). Reference: the feat-stripe-embedded-checkout route above.
- PRODUCT/UX: ONE page — a transparent chat over a live preview; NO step-wizard and NO drawers/manual controls (the old 6-step wizard is legacy). The conversation is the ONLY interface: the Creator gives sparse input (text/URL/image/camera/voice) + preferences; the CHAT does the artwork AND the arranging — it forms the categories, wraps same-category items into horizontal carousels, and applies the rules itself (minimal user effort, "something a typical user could never make"). The Creator refines by just asking. Experiences render as an itinerary, not a card/scheduler. The hero image's palette SEEDS the model-authored theme. v1 = "Studio" (self-serve, Creator fulfills); Concierge/Atelier (peek-fulfilled / peek-assembled) are later tiers.
- NO Tailwind (runtime CSS-variable theming). Never paraphrase the IR/document model.

# IGNORE (rejected / superseded — do not build on these)
- The deterministic design engines: peek-jumpoff/reference/engine-parametric-REJECTED/*, jolly-mccarthy's packages/vibe-resolve + vibe-genome, atelier/lib/vibe/* grammar presets.
- The "feynman is canonical / vision docs are dated" framing in any CODE_PROJECT_SUMMARY / WAKEUP — it's the misdirection this project already corrected (see RECON_FINDINGS Addendum XI/XVII).
- ARCHITECTURE.md's Kafka/K8s/event-store fantasy (its companion STACK_INTEGRATION.md is the corrected stack).

# YOUR FIRST AND ONLY TASK RIGHT NOW — BUILD-BOOK Chapter 0, Prompt 0.1 (Ground Truth)
Read _packets/SPINE/* (on origin/atelier-integration) and the recon BUILD-MAP context. Then produce `_packets/SPINE/GROUND-TRUTH.md`: for each external service in SERVICES.md / backendservices, state (a) is the env var present in the Netlify env for site 932646db-e8be-42f1-a94b-a57bb733e308, (b) is there code that reads it, (c) does that path actually run or silently no-op. Do not infer "works" from a file existing. Where you cannot verify, write UNVERIFIED — do not guess.

GATE: `_packets/SPINE/GROUND-TRUTH.md` exists and every service row is marked VERIFIED-LIVE / WIRED-BUT-NOOP / BLOCKED / UNVERIFIED with the evidence used. Paste the file. Then STOP and wait for me — do not start Chapter 1.
```

*(After Ch 0 passes, paste BUILD-BOOK Prompt 0.2, then 0.3, then Chapter 1's prompts one at a time, each gated. The full Ch 0–8 prompt text is in the two BUILD-BOOK files above.)*

---

## PART 4 — Frank's pre-flight checklist (the human-only steps)
- [ ] **Netlify production branch** = `build/peek-vnext` (or branch-deploys enabled for it). Confirm a push triggers a build.
- [ ] **Git↔Netlify integration live** (you weren't sure it is — verify with a trivial commit).
- [ ] **Anthropic Web Search enabled** (platform.claude.com → Settings → Privacy) — the BUILD-BOOK Ch 0 flags this.
- [ ] **Session push scope** = `build/peek-vnext` (so the build chat can commit to the deployed branch).
- [ ] *(Optional, for Ch 7.3)* Sentry DSN + auth token keyed in Netlify when you want error tracking live.
- [ ] Real keys (Anthropic/Supabase/Stripe/Resend/fal/Upstash/ZenRows) confirmed present in the **Netlify** env (per backendservices) — NOT in the environment form.

---

## PART 5 — What happens after you paste it
1. The build chat reads the plan + spec + salvage, runs **Ch 0 Ground-Truth**, produces `GROUND-TRUTH.md`, and **STOPS at the gate** (it will not barrel into building).
2. You review the ground-truth (this is where "don't trust the claim, verify the artifact" starts), then paste Prompt 0.2 (build & boot), 0.3 (BUILD-MAP), then Chapter 1 one prompt at a time.
3. I stay here as advisor — paste me any gate output you want a second read on, or any chapter you want me to flesh further (Ch 3–8 are drafted; I can deepen any of them).

> One reminder baked into the kit: the end-to-end loop (create → theme → publish $12 → recipient picks within caps → curator notified) has **never run** — getting Ch 8.2's gate green is the real milestone, and every gate before it exists to get there without a tail-spin.
