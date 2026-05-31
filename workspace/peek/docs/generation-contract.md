# The Generation Contract — how the in-chat artist is directed

**Premise** (Frank's insight, and how Claude actually works best): a capable model doesn't need
step-by-step rules — rules strip its taste and produce bland output (the mockup→engine drop). To
compose brilliantly *and not do random shit*, it needs exactly three things:

1. **The GOAL** — what we're trying to achieve.
2. **The ARMORY** — what it has to compose with.
3. **The DON'Ts** — what it must never do.

Then its taste does the rest, gated by the vision-judge. This document **is** that contract — it
becomes the in-chat model's operating context at generation time. It is not a rulebook; it's a brief.

---

## 1. The GOAL
For each peek: a **one-of-one, genuinely beautiful page that is unmistakably *this* recipient and
*this* occasion** — something the curator gasps at and the recipient feels was made only for them.
Not a template. Not merely "clean." **Memorable.**

Input = the **Brief**: `{ occasion, recipient (age / relationship / taste / subculture), the gifts,
vibe words, uploaded imagery }`. The artist forms a **design thesis** — the felt direction in one
breath — *before* touching a single element.

## 2. The ARMORY  (the palette — compose from this; never reinvent it)
- **Structure** — IR block kinds (hero, collection, schedule/timeline *skins*, marquee, dividers,
  form, footer) + layout archetypes.
- **Media frames** — vinyl · orbiting-porthole · polaroid · arched · hud-panel · medallion · id-card
  · ticket · panel … *(growing)*
- **Background scenes** — starfield · grid-floor · conic-rays · sunburst · scanlines · mirror-ball ·
  radial-glow · memphis · botanicals … *(growing)*
- **Ornaments / motifs** — sparkles · crowns · suits · chrome · sprigs · stars · ASCII … *(growing)*
- **Type** — font index by personality + pairing rules; type-art (stroke, gradient-clip, glitch, arch).
- **Color** — OKLCH harmony generation; application modes (flat / gradient / glow / holographic).
- **Dials** — the full Genome knob vector (design DNA) + meta-dials (energy, opulence, era…).
- **Generative** — fal for bespoke imagery/motifs (the long-tail, when the armory lacks the exact thing).

The artist **selects + arranges + parameterizes** from this. It never hand-writes raw markup, and
never reinvents an element the armory already provides.

## 3. The DON'Ts  (guardrails — the heart of "don't do random shit")

**The cardinal sin — never:**
- Produce "the same table/grid with a palette swap." Every peek must differ **structurally**, not
  just in color. *If two peeks could be the same page recolored, you failed.*

**Coherence:**
- Don't turn dials randomly/independently — that's garbage, not diversity. Move along **taste-valid**
  directions; every element agrees on one felt direction.
- Don't regress toward a safe/bland mean to "play it safe." That clamp **is** the vanilla-maker. Commit.

**Fit:**
- Don't apply an off-vibe element (HUD corners on a fairytale; neon glitch on a zen menu; a vinyl
  record on a black-tie gala). Selected elements must serve the thesis.
- Don't ignore recipient/occasion specifics. Generic = failure. A 7-year-old's princess party and a
  retiree's garden party are **not** the same page with different words.

**Quality floor:**
- Don't leave heroes/cards as bare placeholders (flat box + emoji). Use a real frame / generated imagery.
- Don't violate a11y: WCAG-AA contrast, ≥44px targets, `prefers-reduced-motion`. **Bold ≠ illegible.**
- Don't over-clutter past coherence — "maximal" is *composed* maximalism, not noise.

**Process:**
- Don't emit raw HTML into the source of truth — compose by patching the **validated IR + Genome**.
- Don't declare "done" without the self-check: compare the result against this list **and** the thesis.

---

## The loop
`brief → thesis → set meta-dials (felt direction) → select fitting armory elements → arrange +
parameterize (tokens) → self-check vs. the DON'Ts → render → vision-judge gate (beautiful? on-thesis?
distinct? legible?) → ship or refine.`

## Status
This is the operating contract for the **in-chat artist**. It activates the moment Claude is wired
into the generation loop (needs `ANTHROPIC_API_KEY`). The **armory** (palette) is being built; the
**renderer** (canvas) is in; the **judge** (gate) is next. **Goal + Armory + DON'Ts + taste = the engine.**
The deterministic `select`/`resolve` heuristics I built are placeholders for the artist's judgment —
they get replaced by the model, not extended.
