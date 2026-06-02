# peek.gift — BUILD-CHAT LAUNCH KIT
### Exact, copy-paste setup for the session that runs the BUILD-BOOK. Built for LIVE production.

> Reflects all decisions through 2026-06-01. **Live production from day one — no mock, no "wire it later."**
> The build chat works on the branch Netlify already deploys and pushes via the connectors; **you never touch
> git or Netlify by hand.** Companion docs (read by the build chat, not you): `PEEK_GIFT_BUILD_BRIEF.md` (the
> settled source of truth) + the two `BUILD-BOOK` files (the gated plan).

---

## PART 1 — The cloud-environment setup screen
Three fields. That's it.

- **Name:** `peek.gift — build`
- **Network access:** **Full**
- **Setup script** — paste **exactly** this one line, nothing else:
  ```bash
  cd atelier && npm install
  ```
  *(That's the whole script. The live app is the Next app under `atelier/`; this installs its deps so the
  session boots build-ready. When the build reaches the monorepo step it will update this itself.)*
- **Environment variables field:** leave it **blank**. The running services read their config from the deploy
  environment, not from here.

---

## PART 2 — Branch & deploy (nothing for you to do here)
- The build chat works **directly on `atelier-integration`** — the branch Netlify already builds. It commits
  and pushes there **through the git connector**; you run **no git commands**.
- **Every push auto-deploys to `vnext.peek.gift`** via the existing GitHub→Netlify build. No new branch, no
  Netlify settings to change. (So the Netlify *connector* being offline doesn't matter — the deploy fires from
  the GitHub link, not the connector.)
- **The only Netlify action in the entire plan is the very last one:** pointing the **`peek.gift`** URL at the
  finished site (Ch 8 cutover) — done via the connector when you're ready, not by hand.
- Build session's git scope = **`atelier-integration`** (so it can push to the branch that deploys). That's the
  one config that removes the old "code never reached the deploy branch" failure.

---

## PART 3 — THE KICKOFF PROMPT  *(paste this as the first message to the build chat)*

```text
You are building peek.gift, for LIVE PRODUCTION. These rules override your defaults for this entire session. Read them, then do ONLY the first task and stop at its gate.

# OPERATING CONTRACT
1. Prove, never claim. "Done" = a passing test, a 200 response, a real deploy, or a screenshot. Words are not evidence.
2. Every task ends in a GATE. Run it. Paste the real output. If the gate cannot pass, STOP — do not proceed, do not edit the gate to pass. Report what blocks and wait.
3. No skeletons, no lorem, no "// TODO: implement". Write the body or stop and say you can't.
4. Small diffs — one concern per commit, show the diff. When unsure of scope, do less and stop, not more and guess.
5. Plan top-down. Never frantically do random work in one turn. Never use the word "always" in any doc you write.
6. Build for LIVE PRODUCTION. No mock, no PAY_MODE=mock, no "we'll wire it later." Wire the real adapters (Stripe live, Anthropic, Supabase, Clerk) from the start. The port stubs are only a zero-key fallback, never the plan.
7. KEYS: you MAY request or discuss a key a feature genuinely needs. You must NOT lecture about secret best-practices (rotation, vaults, "never commit secrets") or send the owner re-fetching a key he already provided — he knows they're secrets and manages hygiene himself. If a gate needs a service that's unconfigured, ask once if the key is genuinely required, else mark the gate UNVERIFIED and move on.

# REPO / BRANCH / DEPLOY
- Repo: glacialsips-site/grook-peekgift. You work on branch `atelier-integration` (the branch Netlify deploys). Commit + push there; every push auto-deploys to vnext.peek.gift. Do NOT create new branches or change Netlify settings. The live app is the Next app under `atelier/`.
- This is a multi-branch repo from prior iterations. Read your canonical inputs from their branches with `git show <branch>:<path>`:
  • READ FIRST — the settled source of truth:
    - git show origin/claude/gallant-planck-pu51x:recon-assets/PEEK_GIFT_BUILD_BRIEF.md
  • THE PLAN (the gated cascade):
    - git show origin/claude/gallant-planck-pu51x:recon-assets/peek-gift-BUILD-BOOK.md   (Ch 0–2)
    - git show origin/claude/gallant-planck-pu51x:recon-assets/BUILD-BOOK-Ch3-8.md       (Ch 3–8)
  • THE SPEC:
    - git show origin/claude/bold-feynman-SZzaO:peek-jumpoff/reference/vision/REQUIREMENTS_SPEC.md
    - git show origin/claude/gallant-planck-pu51x:recon-assets/DESIGN_PROJECT_BRIEF.md
  • DESIGN METHOD + THE BAR: origin/claude/bold-feynman-SZzaO: peek-jumpoff/{JUMPOFF,00_MAP,FOR_CODE,TIPS}.md, reference/SHELL_SPEC.md, reference/original-mockups/*, mockups/*, samples/*.ir.json, engine/parts.js
  • SALVAGE (reuse, don't rebuild):
    - origin/claude/bold-feynman-SZzaO: lib/peek-chat/* (lean Opus chat), lib/peek-render/* (renderer, a strict superset), lib/ir/* (content model), peek-jumpoff/* (design package)
    - origin/atelier-integration (your branch): the framework — Drizzle, the event-sourced peek_mutation_log, the bookends (atelier/components/{auth,landing}/*, atelier/app/api/checkout/*, app/api/publish/route.ts), _packets/SPINE/*
    - origin/claude/feat-stripe-embedded-checkout: atelier/app/api/checkout/route.ts  (the full-i18n Stripe Checkout Session — your checkout reference)

# THE DECISIONS (already made — do not re-litigate; full detail in PEEK_GIFT_BUILD_BRIEF.md)
- ARCHITECTURE: Turborepo monorepo + framework-agnostic packages/core + the event-sourced command→event→state gate (the maker-checker) + tRPC + Drizzle + pure render(document,theme). Built via the BUILD-BOOK's gated Ch 0→8.
- MARRIAGE: keep atelier's framework + bookends; bring in feynman's lean chat + renderer + design package; DROP atelier's rigid Sonnet chat + its grammar/vibe template engine.
- THE CHAT: the model is the resolver — a LEAN Opus chat (what to collect + guardrails + the design method), not a rulebook, not a deterministic design engine. Any vibe engine is a validation/repair/aesthetic safety-net + a cached pantry under the model's free authoring, never a generator. Model = Opus 4.8 (a Sonnet step-down is a later A/B behind the LLM port).
- PRODUCT/UX: ONE page — a transparent chat over a live preview; NO step-wizard and NO drawers/manual controls. The conversation is the only interface: the Creator gives sparse input (text/URL/image/camera/voice) + preferences; the CHAT does the artwork AND the arranging — it forms categories, wraps same-category items into horizontal carousels, applies the rules itself (minimal user effort). The Creator refines by just asking. Experiences render as an itinerary, not a card/scheduler. The hero image's palette SEEDS the model-authored theme. v1 = "Studio" self-serve; Concierge/Atelier are later tiers.
- CHECKOUT: full international, live, via a Stripe Checkout Session (adaptive_pricing + automatic_tax + tax_id_collection + billing_address_collection + allow_promotion_codes) — Stripe owns every country/currency/tax/coupon. Build no custom currency/tax/coupon layer. The standalone Google Places API is redundant (Stripe's Address Element has it). $12 publish, PAY_MODE=live. Reference: the feat-stripe-embedded-checkout route above.
- NO Tailwind (runtime CSS-variable theming). Never paraphrase the IR/document model.

# IGNORE (rejected / superseded)
- The deterministic design engines: peek-jumpoff/reference/engine-parametric-REJECTED/*, jolly-mccarthy's vibe-resolve + vibe-genome, atelier/lib/vibe/* grammar presets.
- The "feynman is canonical / vision docs are dated" framing — corrected; the BRIEF is current.
- ARCHITECTURE.md's Kafka/K8s fantasy (STACK_INTEGRATION.md is the corrected stack).

# YOUR FIRST AND ONLY TASK — BUILD-BOOK Chapter 0, Prompt 0.1 (Ground Truth)
Read _packets/SPINE/* on this branch and PEEK_GIFT_BUILD_BRIEF.md. Produce `_packets/SPINE/GROUND-TRUTH.md`: for each external service, state whether it is VERIFIED-LIVE / WIRED-BUT-NOOP / BLOCKED / UNVERIFIED in the actual deployed app — with the evidence you used. Do not infer "works" from a file existing. Where you cannot verify, write UNVERIFIED (a guess is a failing gate; UNVERIFIED is a passing one). Do not touch any service config or key.

GATE: `_packets/SPINE/GROUND-TRUTH.md` exists, every service row classified with evidence. Paste it. Then STOP and wait — do not start Chapter 1.
```

*(After Ch 0 passes, paste BUILD-BOOK Prompt 0.2, then 0.3, then Chapter 1, one gated prompt at a time. Full text in the two BUILD-BOOK files.)*

---

## PART 4 — Who does what (you touch nothing live)
- **All live-production work is Claude's, through the connectors — not yours.** The build chat commits + pushes
  through the git connector; pushes auto-deploy to vnext.peek.gift; and the **final `peek.gift` URL cutover is
  done by Claude through the Netlify connector.** You never run a git command or change a Netlify / Stripe /
  Supabase setting.
- **The Netlify connector being offline right now doesn't block any of this** — the only thing it's needed for
  is that final cutover (the last step). The build and every deploy in between run off the GitHub→Netlify link
  automatically. If it's still offline at cutover, that one toggle is the single moment it has to be back — and
  it's still Claude's to do, not yours.
- **If a push ever doesn't auto-deploy**, Claude diagnoses and fixes it via the connector (Ch 0/Ch 8) — not you.
- **Your whole role:** fill the 3-field env screen (PART 1), paste the kickoff prompt (PART 3), then review each
  gate's output and answer the chat's questions. That's it.

---

## PART 5 — After you paste it
The build chat reads the brief + the plan, runs **Ch 0 Ground-Truth** against the live deployed app, writes `GROUND-TRUTH.md`, and **stops at the gate**. You review, then feed it Ch 0.2 → 0.3 → Chapter 1 one prompt at a time. I stay on as advisor — send me any gate output for a second read, or ask me to flesh any Ch 3–8 deeper.
