# Vibe Engine — Foundation Spec

> **Status:** v0.1 — draft for Frank's redline. Not final, not complete, deliberately overbuilt.
> **Scope:** the generative design engine the *in-site chat* drives. Produces a **best execution**
> automatically, offers **alternative primaries**, and accepts **surgical nitpick tweaks** — all as
> operations on a single high-dimensional design genome.
> **Prime directive:** infinite, one-of-one outputs where **every single one is beautiful.** Infinite
> variety is easy; infinite variety that is *all-awesome* is the entire product. This document is the
> machine that makes the second thing true.

---

## 0. The thesis (read this before anything else)

A peek's look is **not** a template, **not** one-of-N presets, and **not** a base style with palette
swaps. It is a point in a **continuous, high-dimensional design space** — the *Vibe Genome* — where:

- **Every aspect is an independent dial** (a "knob"): layout, type, color, motif, texture, shape,
  motion, density, imagery, voice, sound.
- The engine **sets the entire dial-vector from the inputs** (occasion, recipient, gifts, vibe words,
  uploaded photos, learned memory).
- The reachable space is **infinite**, but it is **bounded to taste by construction** — knobs are
  coupled by meta-dials and constrained by hard harmony rules, so the engine can only ever land on a
  *coherent* configuration. Then a vision judge gates the rest.

The ceiling that relegated past builds to vanilla had two causes, and we refuse both:
1. **A closed component/preset vocabulary** → we use an *open* knob + block registry (the space grows).
2. **A "safety clamp" that regressed bold output back toward a bland mean** → we never flatten toward a
   default. Coherence is enforced by *moving along taste-valid directions*, not by pulling toward center.

---

## 1. Core model: the Vibe Genome

The **Genome** is a serializable, versioned, typed object — the complete design specification of one
peek, independent of render target. It is the *theme* half of the Site IR (structure is the block tree;
the Genome is everything about *feel*). The renderer consumes Genome-resolved **tokens**; it never sees
raw values.

```
Genome
├── version                      schema version (pure-function migrations)
├── seed                         deterministic RNG seed (every peek is reproducible/diffable)
├── brief                        the interpreted design intent (§3) — why these choices
├── meta[]                       Tier-0 director dials (§2.1)        ← what chat usually moves
├── knobs{}                      Tier-1/2 atomic dials (§2.2)        ← the full design vector
├── tokens{}                     Tier-3 resolved design tokens (§2.3) ← what the renderer reads
├── rationale                    engine's explanation of its choices (for chat + trust)
└── lineage                      parent genome + diff (for tweaks, alternatives, undo)
```

**Three altitudes of operation** (this is the whole interaction model — §5):
- **Synthesis** → inputs become a *best* Genome.
- **Divergence** → sample a few *maximally-different-yet-coherent* sibling Genomes.
- **Mutation** → apply a *minimal, surgical* delta to one (or few) knobs, preserving everything else.

Every altitude is the same object under three transforms. That symmetry is what makes the chat feel
like one continuous instrument instead of three disconnected features.

---

## 2. The knob taxonomy

Four tiers. Inputs flow **down**; the renderer reads the **bottom**.

```
Inputs ─▶ Brief ─▶ Tier 0 meta-dials ─▶ (cascade + harmony) ─▶ Tier 2 atomic knobs ─▶ Tier 3 tokens ─▶ IR theme ─▶ render
```

### 2.1 Tier 0 — Director meta-dials (the coupling layer)
A small set of high-level dials, each of which **cascades into coordinated changes across many atomic
knobs** via a transfer function (§4.1). These are the dials the chat manipulates most ("make it more
elegant", "edgier", "cozier"). Continuous 0–1 unless noted.

| Meta-dial | Low end ↔ High end | Couples (examples) |
|---|---|---|
| **Energy** | serene ↔ explosive | saturation, motion intensity, weight, density, contrast |
| **Refinement** | raw ↔ haute-couture | type contrast, spacing generosity, easing elegance, restraint |
| **Formality** | casual ↔ black-tie | type (serif/structure), palette sobriety, ornament discipline |
| **Warmth** | cold/clinical ↔ cozy | hue temperature, texture softness, radius, voice |
| **Playfulness** | solemn ↔ whimsical | motif density, shape (blob), motion bounce, copy wit |
| **Opulence** | minimal ↔ lavish | jewel/gold palette, foil/gloss texture, ornament, imagery richness |
| **Boldness** | understated ↔ loud | scale contrast, accent strength, full-bleed, clash palettes |
| **Naturalism** | synthetic/geometric ↔ organic | shape, motif vocabulary, texture, motion easing |
| **Era** | timeless ↔ period-locked | a *style-period vector* (70s, Y2K, Memphis, Bauhaus, futurist…) biasing every domain |
| **Density** | zen-sparse ↔ maximalist | whitespace, content pacing, layering, ornament |

Meta-dials are **not** independent of each other either — a few are antagonistic (Refinement vs.
Playfulness rarely both max) and the solver (§4.3) handles tension. The chat can also bypass meta-dials
and hit atomic knobs directly (§5.3).

### 2.2 Tier 1/2 — Aspect domains & atomic knobs
Ten domains (open set — §2.4). Each lists representative atomic knobs `{type · range}`. This is the
*real* design vector; a Genome carries a concrete value for each.

**① Layout grammar** *(spans into IR structure)*
- `archetype` · enum(open): grid · editorial-column · cinematic-fullbleed · collage-scrapbook ·
  trail-journey · gallery-showcase · timeline · split-asymmetric · zine-chaos · …
- `rhythm` · cont: metronomic ↔ syncopated (section-size variance)
- `containment` · cont: edge-to-edge ↔ framed-inset
- `focal-strategy` · enum: single-hero · distributed · crescendo
- `layering` · cont: flat ↔ collaged/overlapping
- `section-transition` · enum: hard-cut · flow · scallop · torn · diagonal

**② Type system**
- `display-family` · categorical (from a curated superfamily graph, not "a font name")
- `body-family` · categorical (chosen via the pairing graph against display)
- `pairing-strategy` · enum: harmonious · contrast · superfamily · expressive+neutral
- `scale-ratio` · cont: 1.18 (minor third) ↔ 1.7 (augmented) — modular scale base
- `weight-contrast` · cont: flat ↔ extreme (e.g. 300 body / 900 display)
- `case-policy` · enum: sentence · TITLE · lowercase · expressive-mixed
- `tracking` · cont per role; `leading` · cont; `optical-sizing` · bool; `italic-policy` · enum
- `display-animacy` · cont: static ↔ variable-font/kinetic; `stylistic-sets` · flags

**③ Color system** *(authored in OKLCH for perceptual uniformity)*
- `hue-anchors` · 1–3 seed hues; `harmony` · enum: mono · analogous · complementary · split · triadic ·
  tetradic · intentional-clash
- `saturation` · cont + curve; `lightness-mood` · cont: dark/moody ↔ light/airy; `temperature` · cont
- `contrast-intensity` · cont (hard WCAG floor, expressive ceiling)
- `accent-strategy` · enum: single-pop · dual · rainbow-disciplined
- `application` · enum-set: flat · linear/radial/conic/mesh-gradient · wash · duotone · neon-bloom
- `surface` · cont: solid ↔ translucent-glass; `background-field` · cont: plain ↔ textured/gradient

**④ Motif & ornament**
- `vocabulary` · categorical(open + generative): botanical · celestial · chrome · geometric ·
  hand-drawn · retro-tech · heraldic · none …
- `density` · cont: none ↔ pervasive; `placement` · enum: accents · borders · pervasive-field
- `generation-mode` · enum: curated-SVG-set · **bespoke-generative** (fal.ai per-theme) · hybrid
- `stroke-style` · enum: line · solid · sketch · glow

**⑤ Texture / material**
- `material` · enum(open): paper · foil · glass · grain · chrome · matte · fabric · concrete · holo
- `grain-intensity` · cont; `sheen` · cont; `depth-language` · cont: flat ↔ dramatic
- `shadow-style` · enum: soft · hard · long · neon-cast; `elevation-scale` · cont

**⑥ Shape language**
- `radius` · cont: 0 (sharp) ↔ 999 (pill) ↔ blob; `radius-coherence` · cont (uniform ↔ playful-varied)
- `edge-treatment` · enum: clean · torn · scalloped · dashed · taped
- `border-policy` · enum: none · hairline · bold · decorative-frame
- `clip-shapes` · flags (blob, arch, ticket-notch, hexagon…)

**⑦ Motion & choreography** *(honors `prefers-reduced-motion`)*
- `intensity` · cont: still ↔ kinetic; `easing-personality` · enum: mechanical · organic · bouncy ·
  snappy · floaty (maps to cubic-bezier libraries)
- `reveal` · enum-set: fade · rise · stagger · curtain · confetti · glitch · typewriter
- `ambient` · cont: none ↔ alive (float, shimmer, parallax, gradient-drift)
- `micro-flavor` · cont: subtle ↔ playful; `duration-scale` · cont

**⑧ Density / rhythm / space**
- `whitespace` · cont: airy/zen ↔ dense/maximalist; `spacing-scale` · modular base+ratio
- `content-pacing` · cont: sparse ↔ rich; `gutter`/`margin` · cont; `focal-breathing` · cont

**⑨ Imagery treatment**
- `source` · enum: illustration · photography · **generated(fal)**; `framing` · enum: full-bleed ·
  framed · masked-shape; `treatment` · enum-set: natural · duotone · grain · collage · cutout
- `image-to-type-ratio` · cont; `crop-policy` · enum

**⑩ Voice / copy**
- `tone` · categorical: regal · playful · deadpan-luxe · hype · warm · minimal …
- `verbosity` · cont: terse ↔ lush; `wit` · cont; `address` · enum (you/we/3rd)
- `cta-personality` · derived per occasion (Shop · RSVP · Reserve · Claim · Send-aboard…)

*(No-budget extension — ⑪ **Sound design:** themed hover/reveal/confirm audio, `intensity` cont,
muted by default; a real differentiator at the ultimate tier.)*

### 2.3 Tier 3 — Token resolution
Atomic knobs **resolve** (pure functions) into the concrete **design-token set** the IR renderer reads:
OKLCH color ramps + role assignments, a full modular type scale, spacing scale, radius scale, shadow/
elevation set, motion-curve + duration tokens, gradient/texture definitions, motif asset refs, font
faces. **No renderer ever reads a knob — only tokens.** This is the seam that lets us change the knob
math without touching a single component.

### 2.4 The knob registry (anti-ceiling for the design space itself)
Knobs and domains are an **open, versioned registry**, exactly like the IR block registry. A new
aspect (say, "data-viz style" or "AR layer") registers `{schema, range, default-synthesis, couplings,
token-resolver, chat-vocabulary}` and lights up across synthesis, divergence, mutation, and the judge —
**no rewrite.** The genome is designed to *grow dimensions*, not just values.

---

## 3. Inputs → Brief → Genome

The engine never maps inputs straight to tokens. It first produces a **Brief** (structured intent), via
Claude — this is where design *intelligence* lives.

**Input taxonomy**
- **Occasion** — type, cultural/religious context, formality, season/holiday.
- **Recipient** — age, relationship to curator, known interests/subcultures, taste signals.
- **Curator intent** — explicit vibe words, references, brand (if any), do/don't constraints.
- **The gifts** — categories, price tier, their own aesthetics (a reef-tank kit vs. a tiara *imply* a vibe).
- **Uploaded media** — room photo / inspiration image → **vision + multimodal embeddings (Voyage)**
  extract palette, materials, formality, era → seed knobs.
- **Memory** — `curator_memory`, past peeks, what converted (a learned prior, §8).

**Brief** = `{ design-thesis, meta-dial seeds, hard constraints, must-include motifs, anti-patterns,
references }`. The Brief seeds Tier-0; the cascade + solver produce the full vector. The Brief is also
the **rationale source** the chat uses to explain itself.

---

## 4. The coherence engine (the hard part — "infinite yet all-awesome")

This is where the product is won. Five mechanisms, in order of application.

### 4.1 Meta → atomic transfer functions
Each Tier-0 dial maps to weighted nudges across Tier-2 knobs (e.g. `Opulence↑ →` jewel/gold hues +
high type-contrast serif + foil/gloss texture + generous spacing + ornate motif + slow elegant easing).
Transfer functions are **pure, composable, unit-tested** functions in a framework-free domain package.

### 4.2 Hard harmony constraints (taste laws that cannot be violated)
- **Color:** generated in **OKLCH**; enforced contrast (WCAG AA floor, expressive ceiling); harmony
  schemes are *generative algorithms*, not fixed palettes; chroma/lightness ramps are perceptually even.
- **Type:** a curated **pairing graph** (which families harmonize/contrast well) + superfamily logic;
  modular scales; sane measure (line length).
- **Space & shape:** one modular spacing scale per genome; radius coherence rules.
- **Motion:** named easing libraries; reduced-motion fallbacks; duration scales tied to intensity.
These are *constraints*, not styles — they shape the *manifold of valid taste*, not a single look.

### 4.3 Taste-manifold projection (coherence WITHOUT flattening)
Any proposed knob-vector (from cascade, from a tweak, from random divergence) is **projected onto the
nearest coherent configuration** that satisfies §4.2 — by *moving along taste-valid directions*, never
by pulling toward a global "safe default." This is the precise distinction from the failure mode that
manufactures vanilla: we resolve *conflicts*, we do not *neutralize boldness*. (A maxed-Boldness clash
palette stays a clash palette — we only ensure it's a *legible, intentional* clash.)

### 4.4 The taste judge (outer guardrail + selection)
Each candidate is **rendered and scored by a Claude-vision judge** against the Brief on: aesthetic
quality, on-brief fit, internal coherence, accessibility, and **distinctiveness**. Below threshold →
diagnose → re-synthesize (bounded loop). Scores logged to **Braintrust** as the eval harness; this is
how we *prove* we beat vanilla and *gate regressions* forever.

### 4.5 Design-distance metric (for divergence)
A defined distance in genome-space (weighted across domains, perceptual where possible) so "alternative
primaries" can be sampled to be **maximally different from each other while each on-brief** — divergence
is deliberate, not random.

---

## 5. The three interaction altitudes (Frank's explicit requirement)

The in-site chat operates the engine at three altitudes. All three are the same Genome under a transform.

### 5.1 Best Execution — automatic
1. Inputs → Brief (§3).
2. Synthesize **K candidate Genomes** (varied seeds / Brief interpretations).
3. Render + judge (§4.4); **self-select the winner.**
4. Stream it into the live preview with the "JUST PLACED / updated by claude" provenance pings.
The user types nothing about design and gets a genuinely-resolved, beautiful, *specific* page.

### 5.2 Alternative Primaries — a few strong, divergent directions
- From the winner, sample **N (≈3) sibling Genomes** maximally separated by the design-distance metric
  (§4.5), each independently judged on-brief. *Different interpretations*, not slider nudges — e.g.
  "storybook-pastel" vs "modern-regal-minimal" vs "whimsy-maximalist" for the same princess brief.
- Presented as switchable primaries; selecting one makes it the working Genome (lineage preserved).

### 5.3 Nitpick Tweaks — surgical, single-knob
- Chat parses a fuzzy request ("make the red neon", "less busy", "hero should breathe more", "warmer")
  into a **precise knob delta** via the NL→knob translation layer (§6).
- Apply the **minimal mutation**; re-project (§4.3) only if needed; **everything else is preserved.**
- Because knobs are independently addressable and the Genome is event-sourced, every tweak is **diffable
  and reversible** (undo, history, "what changed").

---

## 6. The chat interface (how the genome is driven)

The in-site chat agent (Claude via the gateway) carries **typed tools** mapping language → genome ops:

```
synthesize_best(inputs)              → Genome           (§5.1)
propose_alternatives(genome, n)      → Genome[]          (§5.2)
tweak(genome, intent)                → Genome (delta)    (§5.3)  // NL intent → knob delta
set_meta(genome, dial, value)        → Genome            // "more elegant"
set_knob(genome, path, value)        → Genome            // direct atomic control
explain(genome)                      → rationale         // uses Brief + lineage
```

- **NL→knob translation** is its own learned + rule-backed layer: a vocabulary mapping design language
  ("cozier", "pop", "refined", "y2k") onto meta/atomic deltas, grounded by the rationale and the judge.
- Each tool emits a **validated IR theme patch** as a domain **event** (provenance, diff, undo) — never
  raw markup. Live preview re-renders from the same renderer the published page uses (no preview/real fork).
- Streaming is first-class: the build *feels* alive.

---

## 7. Architecture (so it cannot be overbuilt further)

```
packages/
  vibe-genome/      THE schema (Zod), versioning + migrations, registry, distance metric
  vibe-knobs/       domains, atomic knob defs, ranges, defaults  (data, not code paths)
  vibe-transfer/    pure meta→atomic transfer functions (framework-free, unit-tested)
  vibe-harmony/     OKLCH color engine, type-pairing graph, scales, easing libs (pure)
  vibe-resolve/     knobs → design tokens (pure)
  vibe-synthesize/  Brief→Genome, candidate generation, divergence sampling
services/
  generation/       agent loop + the 6 tools (§6); calls the above behind ports
  evaluation/       the vision judge + Braintrust harness + thresholds
packages/
  vibe-memory/      learned input→knob priors, curator/brand memory (pgvector)
testing/
  the 10 reference sites encoded as Genome fixtures = the range-spanning test
```

- **Everything pure/framework-free** except `services/*` (ports/adapters): Claude behind the gateway
  port, fal behind a media port, Voyage behind an embeddings port, Braintrust behind an eval port.
- **Determinism:** `seed` makes every Genome reproducible — essential for diffing, testing, A/B, undo.
- **The Genome is the theme half of the Site IR.** Structure (blocks) + Genome (feel) = a peek.

---

## 8. Learning & memory (the engine gets more tasteful over time)

- **Input→knob priors** learned from judge scores + **conversion data (PostHog)** — the engine biases
  toward what's beautiful *and* converts, per occasion/vertical. Bandit on alternative primaries.
- **Curator/brand memory** — a curator's accepted tweaks become a personal style prior.
- **Generative motif/imagery** — `vocabulary: bespoke-generative` makes even the *ornament* one-of-one
  (fal.ai per theme), so two princess peeks don't share a single crown SVG.
- **Aesthetic corpus** — an expanding, embedded library of design movements as *seeds* (not templates)
  the synthesizer can draw from and recombine.

---

## 9. Build order (foundation-first, within the engine)

1. `vibe-genome` schema + registry + distance metric + the 10 sites as Genome fixtures.
2. `vibe-harmony` + `vibe-resolve` → tokens; prove the **range-spanning test** (reach all 10 extremes).
3. `vibe-transfer` + `vibe-synthesize` → Brief→best Genome.
4. `evaluation` judge + Braintrust thresholds (the anti-vanilla gate).
5. Divergence sampling (alternative primaries).
6. `generation` tools + NL→knob (the chat instrument); IR-patch events + live preview.
7. `vibe-memory` + generative motifs + learning loop.

---

## 10. Open decisions for Frank
1. **Best-Execution K** and **alternatives N** (cost vs. choice) — how many candidates do we render+judge per turn? (No-budget answer: generous, e.g. K=4–6, N=3.)
2. **Generative motifs day one** (fal per-theme bespoke ornament) vs. start curated+grow? (Leaning day-one generative given "no budget.")
3. **Judge model** — Opus-vision for max taste vs. Sonnet for speed, or both (Sonnet draft / Opus final).
4. **How loud is "intentional-clash"** allowed to get — where's the taste floor on deliberate ugliness (Cyber-Rave/Memphis territory)?
5. Anything in §2.2 you'd add as a dial — what aspect of "awesome" is missing from the ten domains?
