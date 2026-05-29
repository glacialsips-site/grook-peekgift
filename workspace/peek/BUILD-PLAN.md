# peek.gift — Build Plan

Living roadmap for the clean rebuild. **Mission:** a chat-driven generative gift-page
engine where every peek is *one-of-one* and genuinely beautiful, on a foundation that
never hits a ceiling.

## Non-negotiables (the substrate — overbuilt from commit #1)
- **Site IR** is the source of truth (structured, versioned) — never HTML strings.
- **Vibe Genome** = the theme half of the IR (the knob vector). Spec: `workspace/vibe-engine/`.
- **Event-sourced + CQRS** core; tenant/curator id on every aggregate (seam, even single-user).
- **Hexagonal ports/adapters** — every vendor (Anthropic, Supabase, Stripe, Clerk, Inngest,
  Upstash, fal, Voyage, Braintrust…) is a swappable adapter. "Not married to anything," enforced.
- **Open registries** — block/section kinds AND design knobs extend without a rewrite.
- **Coherence by construction** (no safety-clamp that flattens to vanilla) + a vision judge.

## Clean-room & the old code
- Built under `workspace/peek/` (this monorepo), 100% isolated from the legacy tree.
- The legacy code (repo root: `app/`, `lib/`, `scripts/`) is **untouched and OFF-LIMITS** — to me
  and to every subagent (it caused the prior mimicry + ceilings). Promote `peek/` to repo root only
  when it's ready to *be* the product.

## Strategy: contracts → vertical slice → swarm
Lock the contracts and prove a thin end-to-end slice **before** fanning out — eight agents on
unlocked contracts = eight divergent foundations. Then parallelize breadth hard.

## Phases & gates
- [x] **P0 — Scaffold.** pnpm + turbo monorepo, strict TS, workspace layout. ← *done*
- [ ] **P1 — Contracts (LOCK).** `packages/site-ir` (versioned block tree, Zod) +
      `packages/vibe-genome` (knob schema, meta-dials, open registry) + `packages/design-tokens`
      (token shape). The 10 reference sites encoded as IR + Genome fixtures.
- [ ] **P2 — Engine core PROOF (the "00").** `vibe-harmony` (OKLCH color, type-pairing, scales) +
      `vibe-resolve` (knobs → tokens) + minimal `ir-render-web` (IR + tokens → HTML).
      **GATE:** runnable; generates ≥3 wildly-divergent, genuinely beautiful pages from genomes
      (range-spanning proof) — rendered and shown to Frank.
- [ ] **P3 — Synthesis + judge.** `vibe-synthesize` (inputs → Brief → Genome via Claude) +
      `evaluation` (Claude-vision judge + Braintrust) + divergence sampling.
      **GATE:** automatic best-execution + 3 divergent primaries, judged on-brief.
- [ ] **P4 — The shell.** Next.js app + liquid-glass mobile chat over live preview + the 6 genome
      tools + IR-patch events + provenance pings.
      **GATE:** chat drives the engine on one screen; nitpick tweaks land surgically + reversibly.
- [ ] **P5 — SWARM (breadth).** Full knob set, full block registry, all 10 domains deep, generative
      motifs (fal), learning/memory (pgvector + PostHog), more block renderers. Partitioned across
      ≤8 agents against **locked** contracts.

## Deferred features — seams kept, features not built this push (Frank's call)
auth UI · checkout · publishing/custom domains · the affiliate/revenue **ledger** · catalog
scraping. Each gets its bounded-context seam + stub now; thickened later. **No rewrite to add.**

## Swarm partition (P5 — each a bounded unit vs. the locked contract)
color-harmony · type-system + pairing graph · motion library · each block-family web renderer ·
motif / generative ornament · chat UI components · the synthesize prompt + tools · the judge rubric ·
memory / priors.

## Verification discipline
Every phase ships a **runnable** proof. The range-spanning test + the vision judge gate vanilla
regressions forever. Nothing merges that breaks the conformance proof.

## Decisions in flight (vibe-engine-spec §10)
K candidates / N primaries (default 4–6 / 3) · generative motifs day-one? · judge model
(Opus-vision, final) · the "intentional clash" taste floor · any missing knob domain.
