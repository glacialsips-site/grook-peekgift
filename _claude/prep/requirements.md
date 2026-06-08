# peek.gift — CANONICAL REQUIREMENTS (consolidated, de-duplicated)

> **Role:** CTO-facing single requirements set. Every product-requirements / spec / concept doc across the
> mined branches consolidated into one numbered spec. For each requirement: the **source(s)** and whether it
> is **CURRENT** or **SUPERSEDED**. Every cross-doc **contradiction is flagged** with a ⚠ block.
>
> **Read-only synthesis.** Nothing was checked out or edited. Sources read via `git show <branch>:<path>`,
> plus the working-tree `_claude/docs/*` and `/tmp/prep/*`, `/home/user/peek-zips/*`.

---

## 0. SOURCE LEDGER (what was mined, recency, status)

| # | Source (branch:path) | Bytes | Date/era | Status | Role |
|---|---|---|---|---|---|
| S1 | `studio-vnext:IN-SITE-CHAT-MASTER-PLAN.md` (also on `studio-vnext` only) | 20.7k | latest | **CURRENT — most recent architectural decision** | Introduces **Dual Representation** (freeform HTML + structured spine); reverses "never raw HTML" |
| S2 | `/home/user/peek-zips/deployed/peek-design-seat.md` (== `iterated/`) | — | **deployed** | **CURRENT — the live system prompt + tag contract** | The design-seat method + the `data-peek-*` authoring contract actually shipped |
| S3 | `gallant-planck-pu51x:recon-assets/PEEK_GIFT_BUILD.md` (== `studio-vnext`; ~== working-tree `_claude/docs/PEEK_GIFT_BUILD.md`) | 50.3k | 2026-06-02 | **CURRENT — the master build brief** | Operating contract + full spec + source map + gated Chapters 0–8 |
| S4 | `gallant-planck-pu51x:recon-assets/PEEK_GIFT_BUILD_BRIEF.md` (== `studio-vnext`) | 20.1k | 2026-06-02 | **CURRENT — settled-decisions digest** | De-duped distillation of S3 + §14 hard rules |
| S5 | `gallant-planck-pu51x:peek-jumpoff/reference/vision/REQUIREMENTS_SPEC.md` (== `studio-vnext`, `bold-feynman`) | 15.5k | 2026-05-29 | **CURRENT (older transcript-grounded baseline; some areas superseded)** | The "extracted signal" requirements; ⟦spec⟧/⟦live⟧/⟦thin⟧ tags; live-DB grounding |
| S6 | `gallant-planck-pu51x:recon-assets/peek-gift-BUILD-BOOK.md` (== `studio-vnext`) | 22.0k | earlier | **SUPERSEDED by S3** for spec text; **CURRENT** for Ch 0–2 prompt form | Earlier BUILD-BOOK (Ch 0–2 full, 3–8 slots) |
| S7 | `gallant-planck-pu51x:recon-assets/BUILD-BOOK-Ch3-8.md` (== `studio-vnext`) | 20.3k | 2026-06-02 | **CURRENT** | Fleshed Ch 3–8 prompts (same content folded into S3) |
| S8 | `gallant-planck-pu51x:recon-assets/DESIGN_PROJECT_BRIEF.md` (== `studio-vnext`) | 8.8k | earlier | **CURRENT (factual baseline; one stale line)** | Cold-start product+tech brief |
| S9 | `gallant-planck-pu51x:peek-jumpoff/reference/vision/CONCEPT_BREAKDOWN.md` (== `atelier:_packets/CONCEPT-V2.md`) | 5.6k | earliest | **SUPERSEDED in parts (model-tier, suggested-items) / CURRENT for core concept** | The original concept doc |
| S10 | `atelier-integration:_packets/CONCEPT-INVENTORY.md` | 15.2k | 2026-05/06 | **CURRENT — code-grounded "what's actually built"** | WIRED/PARTIAL/STUB/ABSENT inventory w/ file:line |
| S11 | `gallant-planck-pu51x:DECISIONS.md` (== `studio-vnext`) | 3.5k | 2026-06-01 | **CURRENT** | Settled calls + DQ resolutions + dead-ends |
| S12 | `gallant-planck-pu51x:DESIGN_QUESTIONS.md` (== `studio-vnext`) | 4.1k | ~2026-05-31 | **CURRENT (resolved by S11)** | The DQ-1…DQ-11 list w/ recommendations |
| S13 | `gallant-planck-pu51x:PLAN.md` (== `studio-vnext`) | 9.1k | ~2026-05-31 | **SUPERSEDED migration plan / CURRENT spine-mapping detail** | STEP-0 migration plan (pre-monorepo-decision) |
| S14 | `gallant-planck-pu51x:CLAUDE.md` (== `studio-vnext`) | 2.5k | 2026-06 | **CURRENT** | vNext operating contract / roles |
| S15 | `atelier-integration:CLAUDE.md` | 6.5k | 2026-05 | **CURRENT (atelier-lineage ops; PROD-PARALLEL policy)** | Orchestrator briefing + PROD-PARALLEL key policy |
| S16 | `atelier-integration:_packets/SPINE/SERVICES.md` (== `/tmp/prep/SERVICES_atelier.md`) | 10.9k | 2026-05-28 | **CURRENT — service ground truth** | Master service inventory; affiliate DEMOTION |
| S17 | `atelier-integration:_packets/ROADMAP.md` | 8.0k | 2026-05 | **CURRENT — phasing** | Post-MVP phases A–E (social, fulfillment T2, pricing A/B) |
| S18 | `atelier-integration:_packets/SPINE/skills/rules-engine-patterns.md` | 34.3k | 2026-05 | **CURRENT — rules detail** | Rules engine pattern catalog + the real 4 unlock kinds |
| S19 | `/tmp/prep/GROUND-TRUTH.md` | 9.0k | 2026-06-02 | **CURRENT — live-verified state** | Chapter-0 ground truth (live MCP queries) |
| S20 | working-tree `_claude/docs/peekgift_product_intent_source_orientation.md` | 27.3k | earlier | **SUPERSEDED UI (6-step wizard / drawers) / CURRENT product-meaning + rules/notifications detail** | The screenshot-walkthrough product brief |

**Branch note:** `peek-clean` carries **no** spec/concept docs — it is a code branch (`atelier/` subtree). The
vision docs (`REQUIREMENTS_SPEC`, `PEEK_GIFT_BUILD*`, `CONCEPT_BREAKDOWN`) are byte-identical across
`gallant-planck-pu51x`, `studio-vnext`, and `bold-feynman`. `studio-vnext` uniquely adds S1.

**The single most important recency fact:** the build documents (S3–S8, REQUIREMENTS_SPEC) describe a
**structured-IR, "never raw HTML"** architecture. The **deployed code + the latest plan (S1, S2)** have
**pivoted to freeform-HTML authoring** with a structured spine kept alongside ("Dual Representation"). This is
the central contradiction in the corpus and is flagged throughout (see §6.A, §16-C1).

---

## 1. PRODUCT DEFINITION

- **R1.1 — What it is.** A **Creator** (a.k.a. curator / User 1 / "the sender") builds a personal,
  art-directed **gift page** for one **Recipient** (User 2). **The page *is* the gift**: a hero, a personal
  note, and a curated set of **picks** the Recipient chooses from, inside rules the Creator sets. The Creator
  makes the emotional frame; the Recipient gets agency inside it. *Source: S3 §1, S4 §1, S5 §1, S8 §1, S20 §1.
  CURRENT.* Framing line: "The Creator creates the emotional frame; the Recipient gets agency inside that
  frame." (S20 §1).
- **R1.2 — The problem it kills.** The generic/boring gift: random Amazon stuff, the guessed-wrong present,
  the gift card ("an errand"), Hallmark-card-plus-cash "effort theater." *Source: S5 §1, S9 §1, S3 §1. CURRENT.*
- **R1.3 — Two page types, one structure.** **Gift page** (primary) and **Invite/Invitation** (hero, event
  details, plan/schedule, RSVP/tickets action). *Source: S3 §1, S4 §1, S8 §1. CURRENT.*
- **R1.4 — Platform.** **Mobile-first** (near-term traffic is social/Instagram), **desktop-compatible** from
  the same document. *Source: S3 §1, S5 §1, S8 §4a, S20 §26. CURRENT.*
  - ⚠ **CONTRADICTION (platform form-factor).** S5 §1 records Frank's stated conclusion that it "*should* be an
    **app**, not a website — 'websites are basically dinosaurs.'" Every build doc (S3, S4, S8) specifies a
    **Next.js web PWA** with Expo native as a *later* addition. **Resolution as built:** web PWA now, native
    later (S3 §5). The "app not website" line is an aspiration, not the v1 target.
- **R1.5 — North star (context, not v1): PerfectPurchase.** A supplier-neutral, cross-retailer commerce
  decision layer on the **same IR + product graph**: photograph a space/outfit → agents identify, research,
  assemble price-tiered package options across retailers, render into the user's space, present a "money
  button" that orders across stores. Thesis: **own the decision, not the catalog**. peek.gift (and
  GlacialSips) are revenue-generating stepping stones. *Source: S5 §12, S3 §1. CURRENT (explicitly out of v1).*

---

## 2. THE TWO SURFACES

### 2A. Creator surface (the studio)
- **R2.1 — One screen: a transparent chat floating over a live preview** of the page building behind it; the
  keyboard collapses to reveal the full page. *Source: S3 §2, S4 §2, S5 §2, S8 §7, S2. CURRENT.*
- **R2.2 — The conversation is the ONLY interface.** No step-wizard, no drawers, no manual controls. The
  Creator refines by *just asking* ("darker," "different font," "group these," "make it pick-one," "add a soup
  option"). *Source: S3 §2, S4 §2, S2 ("How you talk"). CURRENT.*
  - ⚠ **CONTRADICTION (UI model).** S20 (the screenshot walkthrough) describes a **6-step wizard** (Step 1 The
    Basics → 2 The Look → 3 The Picks → 4 The Rules → 5 What They'll See → 6 Checkout) with **side drawers**
    (design drawer with ink/paper/accent/font/corners/density controls; items drawer; rules drawer). This is
    **SUPERSEDED** — S3/S4 explicitly **DROP** "the drawers / manual controls (no manual UI)" (S3 §10). S20 is
    valuable only for the *meaning* of each concern (what data Basics/Look/Picks/Rules carry), not the UI.
- **R2.3 — The chat does the artwork AND the arranging.** It authors the theme, writes the copy, creates the
  cards, and **forms the categories, carousels, and rules itself** — "something a typical user could never make
  on their own." *Source: S3 §2, S4 §2. CURRENT.*
- **R2.4 — Sparse input → inference.** Creator gives casual input; the model infers the rest and asks **at most
  one** question, only when a detail is taste-critical and unguessable (e.g. "surprise party — show their name
  or hide it?"). Never ask about fonts/colors/layout/theme. *Source: S3 §2, S8 §7, S2. CURRENT.*
- **R2.5 — "Pinged the sections I just touched."** After a turn applies changes, the preview visually flags
  exactly the changed regions — derived from the emitted events, not a diff guess. *Source: S3 Ch 2.5, S6 Ch 2.5.
  CURRENT.*
- **R2.6 — Publish offered as soon as the page is *useful*, not perfect.** *Source: S3 §2, S8 §7, S2, S9 §10.
  CURRENT.*

### 2B. Recipient surface
- **R2.7 — Shared page, radically re-themed per occasion** (see §3). Recipient browses cards and selects within
  the rules + caps the Creator set; the surface **enforces** the rules (server-validated picks). *Source: S5 §2,
  S3 §4, S8 §4b. CURRENT.*
- **R2.8 — One renderer, two surfaces.** The published recipient page and the live preview derive from the
  same source — *no fork*. The recipient surface layers its own interactions (pick / beg / unlock / claim) on
  top. *Source: S3 §5/§4.1, S11 DQ-7, S12 DQ-7. CURRENT.*
- **R2.9 — Reveal ceremony.** A "door / reveal" ceremony is a `page_type`, not a hardcoded flow (the old v0
  was a hardcoded `door→note→cards→done` machine). *Source: S11 DQ-7, S13 §2, S12 DQ-7. CURRENT.*
- **R2.10 — Public route.** Served at `/g/<slug>` (SSR; view-source shows content for unfurl). *Source: S3 Ch
  4.1, S8 §4b, S19 §F. CURRENT.*
- **R2.11 — Recipient growth loop (later).** Recipient invited to make an account → send their own page →
  credits/discounts. *Source: S3 §8, S5(implied), S20 §22, S17 (Phase). CURRENT but explicitly later.*

---

## 3. THE PERSONALIZATION / VIBE ENGINE (the differentiator)

- **R3.1 — Radical re-theming per occasion is the core value.** Canonical example: a little girl's **princess
  birthday** vs a 30-year-old dude's **bachelor party** look completely different. *Source: S5 §3, S9 §5, S3 Ch
  3. CURRENT.*
- **R3.2 — The model is the resolver, not a deterministic engine.** The model authors design **freely from
  taste**: no fixed template set, no constrained enumeration, no deterministic design engine; the renderer
  accepts arbitrary model-authored output. *Source: S3 §6, S4 §6, S8 §3/§9, S11 (Architecture), DECISIONS.
  CURRENT.* The deterministic engines are explicitly **REJECTED** (`engine-parametric-REJECTED/`, jolly
  `vibe-resolve`/`vibe-genome`, atelier `lib/vibe/*` grammar/template engine) — S3 §10, S11.
  - ⚠ **CONTRADICTION (resolved, historical).** S9 §10 originally framed a "vibe engine" as a generator and
    leaned to "a general template that morphs." S5 §3 calls it a "styles/vibe/font engine." Both are
    **SUPERSEDED** by "the model is the resolver; the vibe engine is a *safety net*, not a generator" (S3 §6).
- **R3.3 — The design method (the move).** Find the emotional core → **kill the noun** (category = generic) →
  commit to **one concrete OBJECT specific enough to forbid things** → cascade it into every choice (typeface,
  one accent, section names, copy voice, motion, mechanics) → **vary the display font every page** (the #1
  anti-generic lever; two pages sharing a face = one defaulted) → steal the real genre's codes → make it
  unmistakably *this* recipient → finish the seams. *Source: S2, S3 §6, S8 §11. CURRENT.*
- **R3.4 — GENERIC is the only failure.** Not ugly — generic. "Nice/clean/reasonable" is the loss. *Source: S2,
  S3 §2, S8 §9. CURRENT.*
- **R3.5 — Avoid the new generic.** The faux-vintage paper artifact (newspaper, work order, decree) has curdled
  into its own rut; the object should be a *screen, device, creature, place* at least as often as a page; watch
  reflexes (a creature is not automatically a "specimen card"). *Source: S2. CURRENT.*
- **R3.6 — Make it MOVE (non-negotiable).** One signature motion **born from the object**, built by hand from
  CSS/SVG primitives (`@keyframes`, gradients, SVG filters); no clip-art bank; motion lives *behind* the words,
  never veiling the name; loop gently; **always honor `prefers-reduced-motion`**. *Source: S2, S3 Ch 3.5.
  CURRENT.*
- **R3.7 — The vibe engine = a safety/repair/aesthetic net under free authoring (NOT a generator):**
  - **R3.7a — OKLCH palette repair**: `ensureAccessiblePalette` nudges lightness in OKLCH only where a pairing
    fails **WCAG AA (≥4.5:1 body, ≥3:1 large)**, preserving hue/intent; pure/deterministic; never invents a
    palette, only repairs one. Salvage the color math from `jolly:packages/vibe-harmony`. *Source: S3 Ch 3.2,
    S7 3.2. CURRENT.*
  - **R3.7b — Coherence invariants** (`validateTheme`, auto-repair-or-reject, runs on every `APPLY_THEME`): AA
    contrast; **≤ 2 type families + 1 script accent**; script never as body; **ornament budget =
    round(ornamentation×4)** motifs max; **one dominant accent** (a 2nd hue only with a real `accent2`); era
    consistency. *Source: S3 Ch 3.3, S7 3.3 (toolkit §10.5). CURRENT.*
  - **R3.7c — Hero-image-seeded palette**: the hero image's extracted palette **seeds** the theme the model
    then art-directs ("do nothing → it already looks good"). *Source: S3 §6, S5 §3, S20 §11. CURRENT.*
  - **R3.7d — Motion as data**: "fancy/animated" driven by `theme.motion.intensity` + scene, not hand-coded per
    page; ambient loops gated on intensity; `prefers-reduced-motion` honored. *Source: S3 Ch 3.5. CURRENT.*
- **R3.8 — The design pantry (cached context, a floor not a ceiling).** Feed the chat the parts-bin as
  **prompt-cached** context: the **~211-font** personality taxonomy (17 personality groups + "pairs-with"),
  the **type-art CSS library** (glitch/holo/chrome/outline/gradient-clip/`textPath`/letterpress = the "loud
  vocabulary"; the renderer's known "loud" gap), the **20 named palettes**, the **10 WORLD bundles**, the
  scene/motif/frame menu, color-harmony schemes. A pantry the model draws from but is **never limited to**.
  *Source: S3 §6/Ch 3.4, S4 §6, S1 §3. CURRENT.* NB S1 §3 flags the pantry is **injected nowhere** in deployed
  code — the #1 caliber gap.
  - ⚠ **MINOR INCONSISTENCY (font count):** S3/S4 say "~211-font personality taxonomy"; S1 §3 says "211-font";
    S7 3.4 says "17 personality groups." Treat as ~211 fonts grouped into 17 personality groups.
- **R3.9 — The aesthetic eval gate (the moat — do not skip).** A **Braintrust** eval set across occasions (the
  10 original mockups + 5 new as the bar) → cold chat runs → rendered pages → scored by **human aesthetic
  rating** on a **10-axis rubric** (concept / bold-move / hierarchy / restraint / type / color / authenticity /
  copy / specificity / slop). A vibe/theme change does not ship below the per-occasion threshold. *"Valid but
  ugly" is a failing gate.* *Source: S3 Ch 3.6 & §6, S7 3.6, S5 §14.2. CURRENT.*
  - **R3.9a — Inline vs offline split (latest refinement, S1 §6):** inline per-turn = a **deterministic lint
    floor** (JUMPOFF hard-bans + OKLCH-AA invariants) + the model's own **thinking-time self-grade** (free, no
    latency); the **vision judge** (Claude screenshots the rendered phone page, grades 10 axes, gate-zeros on
    concept/bold-move/type/specificity/slop are fatal) runs **offline in CI** over a golden set. Screenshots
    must wait for `document.fonts.ready` or they grade fallback fonts. *Source: S1 §6. CURRENT (refines R3.9).*
- **R3.10 — The taste loop (the compounding moat).** A `commit_concept`/`commit the OBJECT` step + a one-tap
  **Keep / "Too safe — again"** UI; verdicts land in a `taste_verdicts` table; rejected→kept *pairs* compile
  into a second cached prompt suffix. Turns "explain my taste" into "react"; the no's become the spec. *Source:
  S1 §6. CURRENT (net-new, latest).*
- **R3.11 — `ThemeSpec` model.** The theme the chat authors, as a Zod schema: `TypeSystem` (incl.
  `displayTracking`/`eyebrowTracking`/`displayCase`/`scaleRatio`), structured `Palette`, `scene`/`motifs[]`/
  `frame`, `radius{card,pill}`, `space`, `motion` eases, additive `loud` tokens, a `cssVars` escape hatch; plus
  an OPTIONAL advisory **12-dim Design-DNA** vector (`formality/energy/whimsy/era/warmth/luminosity/saturation/
  contrast/ornamentation/density/texture/motionIntensity`). Port from `bold-feynman:lib/ir/contract.ts`.
  *Source: S3 Ch 3.1, S7 3.1, S11 DQ-2, S12 DQ-2. CURRENT.*

---

## 4. ITEM / PICK CARDS — the 4 ingestion roads, variants, caps, locks, taunts

### 4A. The 4 ingestion roads ("add something" = one intent, four roads → one editable card)
Behind `ports.cardResolver`, a **configurable cascade**; all roads normalize into an **editable card**.
*Source: S3 §9, S4 §9, S8 §6a, S20 §13. CURRENT.*
- **R4.1 — Road 1: URL** (scrape a product link).
- **R4.2 — Road 2: Screenshot / camera image** (Vision extract: photograph a real thing → a card).
- **R4.3 — Road 3: Search / API** (LLM + web_search; "candle under $40," "cactus gift").
- **R4.4 — Road 4: Manual** (the road for **IOU / donation / joke / experience / handmade / personal offer /
  custom** — *not* just a fallback).
- **R4.5 — Cost ladder:** URL/screenshot **before** paid API/LLM. *Source: S3 §9, S20 §13. CURRENT.*
- **R4.6 — Default cascade order:** `retailer_api → url_scrape → research` (web_search+vision); order is
  **config/data, reorderable** without editing core. *Source: S11 DQ-10, S12 DQ-10, S8 §6a. CURRENT.*
- **R4.7 — Imperfect parse → editable draft.** If parsing creates imperfect data, the next state is an editable
  item draft. *Source: S20 §13. CURRENT.*

### 4B. Card kinds
- **R4.8 — Card kinds (build-doc vocabulary):** retail **product** (multi-source) · **activity/experience** ·
  **aspirational/"taunt"** · **digital** · **custom/homemade** · **IOU** · **donation** · **joke/gag** ·
  **manual**. Retail cards carry image/source-label/title/price + a selection control; custom ones may have a
  user photo + free text and no price. *Source: S3 §3, S4 §3, S20 §12. CURRENT.*
- **R4.9 — Canonical schema CardType (the four enum values):** `product | activity | aspirational | digital`.
  Other kinds (homemade, experience, IOU) map onto these via metadata. *Source: S5 §4 ⟦live⟧, S10 §1, S11 DQ-5,
  S12 DQ-5. CURRENT — DQ-5 resolved "contract wins."*
- **R4.10 — Deployed runtime `data-kind` set:** `product | wrapped | custom | experience | taunt | digital`.
  *Source: S2 (the tag contract). CURRENT (deployed).*
  - ⚠ **CONTRADICTION (card-kind vocabulary across 3 docs).** Three non-identical card-kind lists exist: the
    schema enum `product|activity|aspirational|digital` (R4.9, S10/S11), the prose list adding
    homemade/IOU/donation/joke/manual (R4.8, S3), and the deployed runtime `product|wrapped|custom|experience|
    taunt|digital` (R4.10, S2). Note "activity" vs "experience", "aspirational" vs "taunt", and the runtime-only
    "wrapped". A **single shared `data-kind`→`CardType` mapping table** is explicitly required so docs/runtime/
    parser never drift (S1 §4 step 2). **Open: that mapping table is not yet written.**

### 4C. Variants
- **R4.11 — Variant groups** (`variant_groups.selection`): **`pick_one`** (pick exactly one; later picks
  auto-swap out earlier ones), **`pick_any`** (pick any subset independently), **`pick_all`** (the group moves
  as a bundle — picking any card auto-picks siblings; un-picking removes the bundle). *Source: S3 §4, S4 §4, S5
  §4 ⟦live⟧, S18 §1, S8 §4b. CURRENT.*
- **R4.12 — Bundle-link style** (`linkStyle`): `"threaded"` = dashed-thread circle-link between related kit
  cards; `"separate"` = independent tiles. **Ship both; theme picks** (Frank's open question). *Source: S3 Ch
  4.4, S6 4.4. CURRENT (open: which is default per theme).*

### 4D. Caps
- **R4.13 — Hard + soft spending caps**, set by the Creator; there may be **more items than the Recipient can
  select**. *Source: S5 §4, S3 §4, S20 §16. CURRENT.*
- **R4.14 — Fill mode:** by **$** / by **count** / by **both**. *Source: S3 §4, S20 §16. CURRENT.*
- **R4.15 — Recipient-facing fill-bar / thermometer** (show/hide). *Source: S3 §4, S20 §16/§18. CURRENT.*
- **R4.16 — Over-cap behavior:** **hard-stop** vs **allow-over** vs **allow-over-with-a-note (request)**.
  Soft-cap = non-blocking warning; hard-cap = block. *Source: S3 §4 & Ch 4.5, S20 §16. CURRENT.*
- **R4.17 — Show/hide value to Recipient** (`reveal_value`). *Source: S3 §4, S18 §1, S20 §16. CURRENT.*
- **R4.18 — Item-aware rule defaults:** a $900 item shouldn't get a blind $200 cap; defaults use item data, not
  static constants. *Source: S3 §4, S20 §16. CURRENT (formula unsettled).*

### 4E. Locks / unlock
- **R4.19 — Lock / unlock** (`is_locked` + `unlock_rule`): the rendered control reflects the active rule;
  locked-until-unlocked with a gate UI. *Source: S3 §4, S5 §4, S8 §4b. CURRENT.*
  - ⚠ **CONTRADICTION (unlock-kind set — 3 vs 4).** Build docs (S3 §4, S4 §4, S8 §4b) list **3** unlock kinds:
    **`beg`** (with a prompt) · **`date_after`** · **`event`**. The schema + rules skill (S18 §1, S10 §1) list
    **4**: `beg | requires_picks | date_after | event` — **`requires_picks`** ("must have already picked
    specific cards") is the canonical "pick everything unless you spend a day with me" mechanic (S18 §2-B) and
    is **missing from the build-doc spec**. Canonical = **4 kinds** (the schema is authority). NB S10 also flags
    `date_after`/`event` accepted by zod but with **no consumer code** in the current atelier build.

### 4F. Taunts
- **R4.20 — Taunt / gag** (`is_taunt` + `taunt_text`): the card renders but **can't be picked** — pure
  decoration (the Ferrari; "HA YEAH RIGHT"). Composes with variant groups (still renders, doesn't count toward
  a pick). *Source: S5 §4, S18 §1/§2-A, S3 §3. CURRENT.* Server already blocks taunt picks (`card_is_decorative`
  400) per S10 §1.
- **R4.21 — Canonical rules pattern catalog** (curator-requestable names): "3 shoes + 2 dinners + 1 ferrari";
  "Pick everything unless you spend a day with me" (`requires_picks`); "the escalator"; etc. The curator never
  sees schema vocabulary — Peek translates. *Source: S18 §1–§2. CURRENT.*

### 4G. Activity-as-itinerary
- **R4.22 — Experiences render as an ITINERARY** (date + place + ordered steps) — **not** a card and **not** a
  scheduler. (The design once drifted to "schedulers"; pull it back to gift-card carousels, with itinerary
  reserved for experiences.) Promote `itinerary` to a first-class activity field. *Source: S3 §3 & Ch 4.4, S4
  §3, S8 §4b/§1, S19 §F gap 4. CURRENT (renderer GAP — not yet built).*

### 4H. Layout
- **R4.23 — Carousels.** As cards are added they fall into the page; items sharing a category (the chat
  decides) wrap into a **horizontal carousel with the rule applied at the carousel level** ("The Drop · 03
  pieces", edge-peek snap); the next category sits below. *Source: S3 §3 & Ch 4.2, S4 §3. CURRENT.*
- **R4.24 — Badges.** "NEW · updated by claude" and "JUST PLACED" chip — derived from the document's events
  (per R2.5), not a diff guess. *Source: S3 Ch 4.2, S6 4.3, S5 §4 ⟦live⟧ (`is_taunt`/badges). CURRENT.*
- **R4.25 — Card value display** (`value_display?: string`) for ranges ("£18k–£25k") or "—". *Source: S11 DQ-4,
  S12 DQ-4. CURRENT.*

---

## 5. COLLABORATION

- **R5.1 — Creators can collaborate** (named a significant feature): invite other users to add items; combine
  pages built by each collaborator into one. Roles: **`organizer | co_organizer | contributor`** (DB enum +
  invite tokens + accept flow). *Source: S5 §6 ⟦spec⟧/⟦live⟧, S9 §7, S3(implied by spine). CURRENT but THIN.*
- **R5.2 — Hero locked by the creator** (org-level), with item contributions from others; "*TBD — could be
  made more flexible.*" *Source: S9 §7. CURRENT but THIN.*
- **R5.3 — Contributor attribution.** `cards.added_by_user_id` is written on every card insert (the only live
  consumer of the contributor concept). Never displayed yet. *Source: S10 §2. CURRENT.*
- **R5.4 — Group payment.** Today the organizer pays the full $12; a "split with co-curators" toggle (Stripe
  Connect-style) is **later** (Phase D4). *Source: S17 D4, ROADMAP "Open questions." CURRENT, deferred.*
- **THIN / UNSPECIFIED (flagged):** who can edit what, the invite/approval flow, multi-organizer caps, conflict
  handling are **undefined** (S5 §6 ⟦thin⟧). **Code status: STUB** — schema + RLS (default-deny, no policy)
  exist; **no API, no UI, no tool, no invite send** (S10 §2). This is one of the explicitly-thin areas.

---

## 6. SOCIAL MEDIA

- **R6.1 — Social media integration is a named significant feature** ("don't forget about the social media
  aspect," named twice). Likely surfaces at recipient-selection moments; a "plugin already in hand" to
  experiment with later. *Source: S5 §7 ⟦spec⟧/⟦thin⟧, S9 §9. CURRENT but THIN.*
- **R6.2 — Share-sheet (built).** Copy link + native `navigator.share` + intent-URL launchers for X / Facebook
  / WhatsApp / iMessage / mailto; real SMS (Twilio) + email (Resend) outbound via `/api/share/send`. *Source:
  S10 §3. CURRENT (PARTIAL in code).*
- **R6.3 — `next/og` share unfurl.** Themed OG image per published page so links unfurl as a branded card in
  iMessage/WhatsApp, using the page's actual theme tokens; the deterministic spine renders it (can't reliably
  screenshot arbitrary model HTML server-side). *Source: S3 Ch 4.6, S1 §2 (og from spine), S17 C8. CURRENT.*
- **R6.4 — Outbound social (Pinterest / IG / TikTok), reels, Ayrshare/Buffer — ABSENT / later (Phase C).** Pin
  every published Peek (Pinterest API, "gift-adjacent traffic goldmine"); TikTok/IG content from Frank's end;
  generated reels (Sora2/Veo — open question). *Source: S10 §3 (ABSENT), S17 C1/C2, ROADMAP open Qs. CURRENT,
  deferred.*
- **THIN / UNSPECIFIED (flagged):** share-to-social specifics, social login, social discovery/virality,
  referral mechanics are largely undefined beyond the share-sheet + OG. (S5 §7 ⟦thin⟧.) This is one of the
  explicitly-thin areas.

---

## 7. FULFILLMENT, TIERS & PRICING

- **R7.1 — Three service levels (current names): Studio / Concierge / Atelier.** Names/copy/pricing are
  product config and may change. *Source: S20 §3, S3 §1, S4 §1. CURRENT.*
  - **Studio (v1 scope = self-serve):** Creator builds + pays the page fee + shares; Recipient picks; **the
    Creator fulfills** themselves. *Source: S3 §1, S20 §3.* This equals **"Tier 1"** in S5 §8: the product
    **emails/SMSs the Creator the confirmation of the Recipient's selections; the Creator handles fulfillment**;
    a **nominal flat fee**.
  - **Concierge (later):** peek.gift orders/ships from retailers on the Creator's behalf (= "T2 auto-fulfill,"
    captures affiliate + a markup). *Source: S20 §3, S3 §1, S17 D5. LATER.*
  - **Atelier (later):** items route through peek.gift, assembled into a physical package + shipped. *Source:
    S20 §3, S3 §1. LATER.*
  - Higher tiers add an operations/fulfillment layer and are the **bridge to PerfectPurchase**; build the
    self-serve loop now, design the seams so tiers bolt on. *Source: S3 §1.*
- **R7.2 — The publish gate = $12.** Stripe price `price_1TapZICEKPUsVee1ddG4n14M` on `prod_UZzXnuYuX4ud15`
  (1200 USD, verified succeeded once), `PAY_MODE=live`, NJ tax active. *Source: S5 §8 ⟦live⟧, S3 §7/§11, S16,
  S19 §A. CURRENT.*
  - ⚠ **MINOR (pricing display):** S20 §19 notes the flat fee shown in screenshots is a placeholder driven by
    Stripe config, "not the core product truth." Pricing is config-driven; $12 is the current live value.
- **R7.3 — Checkout = full international, Stripe-native, from day one.** Use a **Stripe Checkout Session
  (embedded)** delegating i18n to Stripe: `adaptive_pricing` (local-currency, every currency) · `automatic_tax`
  + `tax_id_collection` (every jurisdiction) · `billing_address_collection` (Stripe **Address Element**, which
  has **Google Places built in** → drop the standalone Google Places API) · `allow_promotion_codes` (native
  coupons). Every country except sanctioned. **Do not build a custom currency/tax/coupon layer — Stripe owns
  it.** *Source: S3 §7, S4 §7, S5 §8. CURRENT.*
  - ⚠ **CONTRADICTION (checkout flavor: Checkout Session vs Payment Element).** S3/S4 §7 prescribe an
    **embedded Stripe Checkout Session** (`adaptive_pricing`/`automatic_tax`/Address-Element). But S3 Ch 7.4
    points the publish gate at the **lifted atelier checkout = PaymentIntent + Payment Element + a custom coupon
    route** with `client_secret` (not a redirect URL), and explicitly flags: "*Confirm with Frank whether
    multi-currency/tax beyond the as-built single-currency-USD/coupon path is in scope here.*" The
    reference-implementation cited is `claude/feat-stripe-embedded-checkout:atelier/app/api/checkout/route.ts`.
    **Net:** the *target* is the full-i18n Checkout Session; the *as-built* salvage is single-currency-USD
    Payment Element — reconciliation is an open call for Frank.
- **R7.4 — Publish flow.** The chat emits a **ready** intent; the **route** (a bookend concern, never the
  reducer) opens checkout; the **webhook** (`payment_intent.succeeded` / `checkout.session.completed`,
  idempotent → `/api/stripe/webhook`) **publishes** the document (status `published`, `published_at`,
  `share_url`) + **notifies the Creator** (Resend now; Twilio when keyed). *Source: S3 §7 & Ch 7.4, S4 §7, S5
  §8. CURRENT.*
- **R7.5 — Lifecycle.** `peeks.status`: `draft → ready_for_publish → published → claimed → archived`. `picks`
  carries `beg_message`/`beg_approved_at`, `fulfilled_at`, `fulfillment_notes`, `recipient_note`,
  `recipient_signature`. *Source: S5 §8 ⟦live⟧, S10 §1. CURRENT.*
- **R7.6 — Notifications (Creator-facing, Tier-1 minimum).** After the Recipient finalizes, the Creator gets
  enough to understand what was selected and handle next steps. The richer toggle set (recipient opens page /
  makes selection / submits over-cap request / finalizes pick / page about to expire / page expired) is
  channel-agnostic (email + SMS). *Source: S5 §8, S20 §17, S3 §7. CURRENT (full toggle set from S20 is
  product-config detail).*
- **R7.7 — Pricing experiments (later).** A/B **$12 vs $9 vs $15** via PostHog flag controlling
  `STRIPE_PRICE_ID` per cohort (Phase B4). One flat fee, no subscription. *Source: S17 B4, S20 §8. CURRENT,
  deferred.*

---

## 8. INPUTS + MODEL TIERING

- **R8.1 — Multimodal input rail** (Claude-mobile parity): text · URL paste · image upload · **camera** ·
  **voice/mic** · the share/mail action. Voice → transcription; image/camera → Vision-ready; URL →
  fetch-for-context. Voice/camera degrade gracefully if a permission is denied. *Source: S3 Ch 2.3, S5 §1, S8
  §7, S9 §2, S20 §13. CURRENT.*
- **R8.2 — Camera = photograph a real thing → Vision makes a card. Mic = the non-technical mobile user just
  talks.** *Source: S3 §9, S4 §9. CURRENT.*
- **R8.3 — Model tiering: Opus 4.8 is the artist (authors the page) — DAY ONE.** A Sonnet step-down is a
  **later A/B** behind the LLM port once functional. **Sonnet/Haiku** are the cheap hands for vision/screenshot/
  camera extraction + classification ("don't burn Opus to read a price tag"). Streaming + prompt-caching
  (JUMPOFF + pantry) + extended thinking. *Source: S3 §9, S4 §9, S11 DQ-9, S12 DQ-9, S1 §3 (deployed: streaming
  Opus 4.8, 12 hops). CURRENT.*
  - ⚠ **CONTRADICTION (default model — Opus vs Sonnet).** S6 (the earlier BUILD-BOOK Ch 2.4) and the same line
    in S3's Chapter-2.4 prompt body say **"Default model Sonnet 4.6; Opus 4.8 opt-in."** This **contradicts**
    the spec body of the same file (S3 §9: "**Opus 4.8 is the artist — day one**") and DQ-9 ("Opus 4.8").
    **SUPERSEDED resolution: Opus 4.8 day one** (DECISIONS DQ-9, S1 deployed-reality). S9 §3 ("Sonnet is almost
    certainly enough") is the original, **SUPERSEDED**, position.
- **R8.4 — Every external capability is a typed port + adapter; wire LIVE adapters from day one; a stub exists
  only as a zero-key fallback, never the plan.** *Source: S3 §9, S4 §9, S8 §6, S13 §1. CURRENT.*

---

## 9. THE PAGE MODEL / IR (the document)

- **R9.1 — The page is a validated structured document — never raw HTML — and it is versioned.** The chat
  authors and mutates it; one generic renderer paints it into preview + published page. *Source: S3 §3, S4 §3,
  S8 §5, S5(implied). **CURRENT as written but DIRECTLY CONTRADICTED by the latest plan — see ⚠ below.***
- **R9.2 — The IR carries:** page type · recipient/occasion/from metadata · the **concept** (the anti-generic
  lock) · the **theme** (type system + palette + scene/motifs/frame + space/radius/motion + "loud" tokens) ·
  the **hero** (a media slot) · ordered **sections** · **cards** · **variant_groups** · the **note** · the
  **CTA** · spending **caps**. *Source: S3 §3, S8 §5. CURRENT.*
- **R9.3 — Media is a SLOT:** a resolved URL *or* a directive (generate / search / edit / remove-bg / upscale);
  the renderer shows a themed placeholder until it resolves. *Source: S3 §3, S8 §5. CURRENT.*
- **R9.4 — Canonical naming:** the state is the **`PeekDocument`**; the chat speaks **Commands**, never
  mutating directly. The salvaged `PeekIR` (`{ schema_version:1, peek, sections[], variant_groups[], cards[] }`,
  snake_case, mirrors the DB) + its **16 tools** map onto this (tools → the Command union; the reducer →
  `decide`/`apply` + event log). **Never paraphrase the IR/document — it's the shared language.** *Source: S3
  §5/§13, S4 §5/§14, S19 §F. CURRENT.*
- **R9.5 — Section kinds.** Renderer understands *kinds*, never specific pages. `custom` is the primary
  expressivity (no archetype zoo). Add `details` + `gallery` to the contract; promote to first-class **only**
  kinds that carry live state `custom` html can't (e.g. `countdown`, `claim`). `stats`/`lede` exist in the
  renderer but the tool enum can't author them yet (a gap). *Source: S11 DQ-3, S12 DQ-3, S3 §13/known-issues,
  S19 §F gap 3. CURRENT.*

> ⚠ **THE CENTRAL CONTRADICTION — "never raw HTML" (R9.1) vs Dual Representation (deployed/latest).**
> S5/S8 §5/S3 §3/S4 §3 and `JUMPOFF.md` all state the chat **emits structured data, never raw HTML**. The
> **deployed code and the latest plan have pivoted**:
> - **S2 (deployed system prompt)**: "You author **one freeform page** — your own fonts, a `<style>` block,
>   bespoke CSS… caliber lives in the markup, so write it directly… You don't write behavior — you **tag it**"
>   with the `data-peek-*` contract.
> - **S1 §2 (latest plan)**: the IR-only path "**already degenerates into raw HTML and silently empties its own
>   commerce spine**" (the `el-taquito` fixture: 2 custom HTML blocks, 0 structured cards). Recommends **DUAL
>   REPRESENTATION**: `PeekDocument = { spine: PeekIR, presentation: { html, html_hash, runtime_version } }` —
>   the model authors freeform HTML for caliber **and** a structured spine is kept in lockstep (joined on a
>   stable `data-peek-id` == `card.id`) for commerce / recipient state / the product graph. Recipient is served
>   the HTML; picks/checkout/graph read the spine.
> - **S1 §8 flags this needs Frank's explicit blessing** because it reverses three settled docs (`JUMPOFF.md`,
>   `DESIGN_PROJECT_BRIEF §5`, `BUILD_BRIEF §3`). **All five workstreams independently converged on it.**
> **Status:** the build docs (S3–S8) are **SUPERSEDED on this point** by S1+S2. The IR/maker-checker is kept
> but **demoted** to (1) a typed fallback when HTML is absent/corrupt and (2) the deterministic `next/og`
> surface. **This is the #1 thing for the CTO to ratify into canon.**

---

## 10. TECH-STACK DECISIONS (DECIDED — do not re-litigate)

Deliberately robust, **proven** — "overbuild the framework, keep the chat loose." *Source: S3 §5, S4 §5, S6
STACK LOCK, S5 §10, S8 §9, S13 §1. CURRENT.*
- **R10.1 — Monorepo:** Turborepo + pnpm, TypeScript `strict`.
- **R10.2 — `packages/core` (the durable asset):** framework-agnostic (zero Next/React/UI imports — enforced
  by a lint/dependency-cruiser rule that **fails the build** on a framework import). Owns: document model,
  command schema, theme/token model, item + cap logic, typed service-client interfaces.
- **R10.3 — The gate / maker-checker (event-sourcing):** the chat does **not** mutate the document directly —
  it emits **Zod-validated Commands → Events → state**. `decide(doc, cmd) → Result<Event[], Err>` (**neverthrow**)
  + pure `apply(doc, event) → doc`; the document is the fold of its events → **undo / history / replay free**;
  a malformed AI op bounces at the boundary. (This is Frank's spine+boltons: event-sourced core = spine;
  ports/adapters = boltons. "Drafts persist as you move back and forth" is native — the draft is the fold of
  its commands.)
- **R10.4 — Contracts:** **Zod** canonical + runtime-validated (the AI's output arrives at runtime — guard it
  there); **neverthrow** typed errors.
- **R10.5 — Rendering:** a pure `render(document, theme)` — one truth for live preview, recipient page, future
  surfaces.
- **R10.6 — Web:** Next.js **App Router** + React, TS, mobile-first, **PWA**; SSR recipient + marketing pages
  with **`next/og`** unfurl. Structure so a future **Expo** surface is an addition, never a rewrite.
- **R10.7 — Theming:** **runtime design tokens → CSS custom properties** (the `--peek-*` namespace, DQ-1).
  **NEVER Tailwind** (compile-time can't re-theme at runtime); a CI check **fails on Tailwind utility
  classNames**.
- **R10.8 — Transport:** **tRPC**; Anthropic calls **server-side only**.
- **R10.9 — Data:** **Supabase + Drizzle + pgvector**; IR persisted with `*_versions` append tables; **Yjs**
  only when true co-editing is real.
- **R10.10 — AI:** full Anthropic surface (streaming, Vision, web_search, prompt caching, extended thinking,
  Files, Batch, Memory, Skills); your services exposed to the chat as **MCP tools**; **Braintrust** evals.
- **R10.11 — Native (later):** **Expo** as a second thin surface over the same core.
- **R10.12 — Explicitly CUT (the two tail-spin bets, on purpose):** **no Effect, no Zero/Rocicorp.** The
  over-built ceiling (Effect, full CQRS, Zero local-first, CLIP retrieval, CDC streaming) is the *theoretical*
  max; the two highest-risk bets are out. *Source: S5 §10, S3 §5. CURRENT.*
- **R10.13 — Document/framework base = the `atelier-integration` lineage** (Drizzle, the event-sourced
  `peek_mutation_log`/`peek_documents`, the bookends, `_packets/SPINE/`); currently a single Next 16 app under
  `atelier/` (npm) → **BUILD-BOOK Ch 1.1 monorepo-izes it**. *Source: S3 §10, S4 §10. CURRENT.*
  - ⚠ **MINOR (migration-plan supersession).** S13 (PLAN.md) describes migrating the *root* v0 app
    (`lib/types.ts`, `Vibe→ThemeSpec`, etc.) *before* the monorepo decision; S3 §10 (Addendum XVII) reframes
    the base as the **atelier Turborepo** with the chat/renderer salvaged from `bold-feynman` and the bookends
    lifted from `atelier-integration`. S13's *spine-field mapping* is still useful; its *which-app* framing is
    SUPERSEDED.

### 10A. The source map — salvage / drop
- **R10.14 — Salvage from `bold-feynman`:** `lib/peek-chat/*` (lean Opus streaming chat + LEAN system prompt +
  tool set) · `lib/peek-render/*` (the renderer — a strict superset of every prior renderer) · `lib/ir/*` (the
  content model → `PeekDocument`) · the whole `peek-jumpoff/` design package + mockups + samples. *Source: S3
  §10, S4 §10. CURRENT.*
- **R10.15 — Salvage the parts-bin (toolkit §1–§9) from `recon-assets/` as cached vocabulary; checkout
  reference = `feat-stripe-embedded-checkout`.** *Source: S3 §10. CURRENT.*
- **R10.16 — DROP (rejected/superseded):** the deterministic design engines (`engine-parametric-REJECTED/*`,
  jolly `vibe-resolve`+`vibe-genome`, atelier `lib/vibe/*` grammar/template engine) · atelier's **rigid Sonnet
  chat** · the **drawers / manual controls** · feynman's `lib/peek/*` first-cut (DQ-11) · the standalone Google
  Places API · the "feynman is canonical / vision docs are dated" framing (it misdirected the whole effort) ·
  `ARCHITECTURE.md`'s Kafka/K8s fantasy. *Source: S3 §10, S4 §10, S11. CURRENT.*

---

## 11. SERVICES & ENVIRONMENT (real status)

- **R11.1 — LIVE (keyed + running):** **Anthropic** (Vision, web_search, Memory, Files, Skills, Extended
  Thinking; Frank action: enable Web Search in console) · **Clerk** (`clerk.peek.gift`, `ins_3D5Va…`, custom
  UI, no branding) · **Stripe** (`acct_1T4xnbCEKPUsVee1`, $12 gate, NJ tax active, webhook `we_1Tb7Ph…` →
  `vnext.peek.gift/api/stripe/webhook`) · **Supabase** (`ewqpujqerdnrkjqlpobo`, us-east-1, PG 17.6, schema
  `peek_v2`, RLS on all tables, bucket `peek-v2-assets`) · **Resend** (`info@peek.gift`, DKIM verified) ·
  **ZenRows** (scrape; **DEGRADED** per S19 — ~8/11 non-Amazon/Zappos failing) · **fal.ai** (Flux image gen;
  **SUSPECT** — `generate_hero_image` observed returning `image_url:null`, S19) · **PostHog** (project 434015)
  · **Upstash Redis** (rate-limit, webhook idempotency, presence) · **Netlify** (site `peek-gift-vnext` =
  `932646db-…`, URL `vnext.peek.gift`). · **Browserbase** (keyed; the Stagehand/PerfectPurchase fulfillment
  play, not scrape-#2; endpoint broken per BUGS M13). *Source: S3 §11, S16, S19 §A. CURRENT.*
- **R11.2 — In flight / blocked:** **Sentry** (org `peekgift` `4511426433646592`, **no DSN keyed**, code
  no-ops) · **Inngest** (jobs `nudge-relationships` / `scrape-worker` / `webhook-logger`, no-op without keys).
  *Source: S3 §11, S16, S19. CURRENT.*
- **R11.3 — Voice services (stubbed, mic hidden):** **Deepgram** (STT) + **ElevenLabs OR Cartesia** (TTS) —
  voice mode hidden behind a flag until keyed. *Source: S16 #14/#15. CURRENT (note: not mentioned in S3/S5).*
- **R11.4 — Public-launch gates (not started):** **Turnstile** before the first guest LLM call ("open chat =
  open wallet"), **image moderation** before public publish, **multimodal embeddings** (Voyage / Cohere-v4 /
  Jina-CLIP — *not* text-only) for the catalog. *Source: S3 §11, S1 §5. CURRENT.*
- **R11.5 — pgvector AVAILABLE but NOT installed** — `CREATE EXTENSION vector;` at Ch 5. Also available:
  `pgmq`, `pg_cron`, `pg_net`, `http`, `pg_trgm`, `postgis`. *Source: S3 §11, S16, S19 §C. CURRENT.*
- **R11.6 — Key vault strategy:** all production keys live as **Netlify env vars** on the `peek-gift-vnext`
  site, scoped per context (production / branch-deploy / deploy-preview / dev), `is_secret` where appropriate.
  **Netlify is the canonical vault.** *Source: S5 §11, S16, S15. CURRENT.*
- **R11.7 — PROD-PARALLEL policy:** vNext is a parallel deployment of the **same production stack** (same
  Clerk/Stripe-LIVE/Supabase/Resend/etc.), just at the sandbox URL. Cutover changes only `APP_URL` + the custom
  domain + webhook URLs. **Never create test/dev instances; never sign up for accounts unilaterally.** Legacy
  uses `public` schema + `gift-assets` bucket; vNext uses `peek_v2` + `peek-v2-assets`. *Source: S15. CURRENT.*
  - ⚠ **CONTRADICTION (affiliate priority).** S5 §5 makes "**intelligent affiliate suggestion**" a *named core
    feature* with a long merchant/feed catalog (Skimlinks/Sovrn/Impact/CJ/Rakuten + Amazon/Apple/Walmart/Target
    + travel networks + Google Shopping/Shopify/Etsy/Amazon PA-API as "the real net-new moat"). But **S16 +
    DECISIONS DEMOTE affiliates**: "Frank 2026-05-28: 'we don't have affiliates right now.'" Skimlinks/Sovrn →
    STUB; the long retailer/travel catalog → `IDEAS-LATER.md`; `affiliate_search` falls back to Anthropic
    `web_search`. **Net: affiliate revenue is NOT a v1 priority** (the *catalog graph* moat survives in Ch 5 as
    architecture, but commercial affiliate integration is deferred). S5 §5 is **SUPERSEDED on priority** by S16.

---

## 12. THE CATALOG MOAT (PerfectPurchase decision-layer, at the data level)

The real net-new moat (S5 §14.1). Build behind `ports.productSource`/`ports.cardResolver` so nothing upstream
changes. *Source: S3 Ch 5, S6/S7 Ch 5, S5 §5/§14, S1 §6. CURRENT (net-new, mostly not built).*
- **R12.1 — pgvector + the product graph schema:** `pg_products` (one canonical product) + `pg_offers` (many
  offers: retailer, price, currency, url, commission_pct, affiliate_network, in_stock, checked_at) with RLS.
- **R12.2 — Entity resolution:** dedupe by **UPC/GTIN** exact-match first, then **title+image embedding
  similarity** (a **multimodal** embedding — Voyage/Cohere-v4/Jina-CLIP, **NOT text-only**) → one product,
  many offers.
- **R12.3 — Hybrid retrieval:** structured filters (price/category/ship-to) + **pgvector text** + **CLIP
  image** similarity (the bridge to the photo-of-the-room vision); behind `ports.productSource.search`.
- **R12.4 — Freshness gate:** feeds power discovery, but **live-check price/stock** on the specific offer
  before showing to a recipient; a stale/dead offer is dropped or refreshed, never rendered.
- **R12.5 — Feed ingestion (feeds primary, scrape/web_search fallback for the long tail):** Skimlinks / Sovrn /
  Impact / CJ / Rakuten + the missing big sources — Google **Shopping Content/Merchant Center**, Shopify
  **`/products.json`** + Storefront, **Etsy/Faire**, Amazon **PA-API**. Each = one adapter; cascade picks by
  config. *(See R11.7 ⚠ — commercial affiliate integration is deferred; the ingestion architecture is the
  durable part.)*
- **R12.6 — The compounding ranker:** capture what recipients pick/convert per occasion; rank/RAG over your own
  outcomes so curation improves from accumulated taste.
- **R12.7 — Cheap PerfectPurchase seams to add NOW (S1 §6):** log every `resolve_card` result as an
  append-only structured row (today it's discarded — "the single highest-leverage line"); pull GTIN/identifiers
  in the scraper (already in the JSON-LD); reserve `CatalogPort` + a multimodal `EmbeddingPort` (stubbed);
  enrich `picks` to reference products + occasion (training signal). *CURRENT, latest.*

---

## 13. MCP (expose the platform to the curator chat)
- **R13.1 — Wrap the catalog (search_products / get_offers / resolve_card) as MCP tools.** *Source: S3 Ch 6.1.*
- **R13.2 — Wrap live services (Stripe publish-state, Resend/Twilio share, fal image-gen) as MCP tools** (each
  behind a port); unkeyed services degrade gracefully. *Source: S3 Ch 6.2.*
- **R13.3 — Point the curator turn at the MCP menu**; MCP tool calls that mutate the document still go through
  `decide()` (the Command gate), never direct. *Source: S3 Ch 6.3. CURRENT (net-new).*

---

## 14. WORKING PRINCIPLES / HARD RULES (the operating contract — override defaults)

*Source: S3 OPERATING CONTRACT + §13, S4 §14, S5 §13, S6 OPERATING CONTRACT, S14, S15. CURRENT.*
- **R14.1 — Prove, never claim.** "Done" = a passing test, a 200, a real deploy, or a screenshot. Words aren't
  evidence.
- **R14.2 — Every task ends in a GATE.** Run it, paste real output. A gate that can't pass is a **STOP** — don't
  proceed, don't edit the gate to pass. Report what blocks and wait.
- **R14.3 — No skeletons, no lorem, no `// TODO: implement`.** Write the body or stop and say you can't. (Frank's
  recurring complaint: "massive piles of skeletons," files "60% comments," 3200+ junk lines.)
- **R14.4 — Small diffs**, one concern per commit, show the diff. Unsure of scope → do less and stop, not more
  and guess.
- **R14.5 — Plan top-down, always.** #1 complaint: chats won't plan top-down, they "frantically do random work
  in one turn." Plan → decompose → build.
- **R14.6 — Build for LIVE production / the end state.** No mock, no `PAY_MODE=mock`, no "wire it later" — wire
  the real adapters from the start; a stub is only a zero-key fallback, never the plan. Half-measures get redone.
- **R14.7 — Keys:** request what a feature genuinely needs; **never lecture about secret best-practices**
  (rotation/vaults/"don't commit") or send the owner re-fetching keys he provided. If unconfigured for a gate,
  ask once if truly required, else mark UNVERIFIED and move on.
- **R14.8 — Claude does all live-prod work via the connectors** — git commits/pushes, deploys, the final
  `peek.gift` cutover. **Frank touches nothing live.**
- **R14.9 — No Tailwind** (runtime CSS-variable theming demands it). *(= R10.7.)*
- **R14.10 — The model is the resolver** (the *chat*, not the framework — keep the chat lean, the framework
  robust). **Never paraphrase the IR/document — it's the shared language.**
- **R14.11 — Avoid the word "always" in instruction docs** — Frank flagged it as "a disaster waiting to happen"
  (chats prioritize mds/code over his chat). *(NB: the docs themselves violate this — "Plan top-down, always.")*
- **R14.12 — The owner's current instruction outranks anything written.** Existing code/comments/notes are
  residue from prior failed attempts — reference only, never authority; surface conflicts, don't silently follow
  code.
- **R14.13 — No flattery / no banned phrases.** No "you're right / good catch / great point / absolutely /
  I apologize / sorry for the confusion." No "locked / fixed / final / done / perfect." Terse, direct; own a
  mistake in one short sentence and move on. (Frank caught past sessions on this 5+ times.) *Source: S14, S15.*
- **R14.14 — The gate philosophy:** a model can't reliably tell its justified positions from its stubborn ones,
  so fence it with artifacts (the failing test, the validated command, the audit) — don't rely on persuading
  the model. This is maker-checker at both the **document level** (R10.3) and the **build level** (R14.2).

---

## 15. SECURITY (launch-blockers — gate the public deploy, not the build) — latest, S1 §5

These are net-new and **gate any keyed public deploy**. *Source: S1 §5/§9. CURRENT.*
- **R15.1 — P0:** (1) actually sanitize the recipient HTML path (the code comment claiming it's sanitized is
  **false**); (2) **serve untrusted model HTML from an isolated origin** (a `*.peekusercontent`-style sandbox
  subdomain) or at minimum an iframe **without `allow-same-origin`** — a sanitizer miss must not reach
  Clerk/Stripe cookies; (3) drop `allow-same-origin` from the studio preview iframe; (4) gate `/api/curator`
  (a paid Opus loop, currently **open + unauthenticated**, no middleware) with **Turnstile + auth + Upstash
  rate-limit**.
- **R15.2 — P1:** a real **CSS sanitizer** (url() host-allowlist, strip `@import`, neutralize full-viewport
  overlays — DOMPurify does NOT sanitize CSS); a **CSP**; **SSRF-guard `url_scrape`** (block link-local /
  metadata / localhost); wire **image moderation** on upload + generation + publish. Pin DOMPurify + an
  XSS/exfil test corpus.
- **R15.3 — Principle:** untrusted LLM HTML must never execute same-origin with a user's session.
- **R15.4 — Authoring constraints enforced by the sanitizer/runtime (must inform the chat):** **no `<script>`,
  no `<form>/<input>/<textarea>/<select>`** (stripped → a hand-rolled form silently vanishes → broken page);
  **no inline `data:`/base64 blobs** (stripped, even SVG-noise textures). All behavior (RSVP, claim, tab,
  countdown, locks) comes from `data-peek-*` tags + the host runtime, never script. *Source: S2, S1 §3. CURRENT.*

---

## 16. CURRENT BUILD STATE / NET-NEW WORK / EXPLICITLY-THIN AREAS

### 16A. Live database reality (S19, MCP-verified 2026-06-02)
Row counts: `peeks` **50** · `cards` **33** · `variant_groups` **10** · `events` **372** · `chat_messages`
**380** · `usage_ledger` **277** · `picks` **0** · `webhook_log` **0** · `peek_collaborators` 0 ·
`relationships` 0 · `affiliate_revenue` 0 · `tier_config` 0 · `curator_memory` 0. **14 RLS tables.**
- **THE HEADLINE FINDING (every doc agrees):** creation + chat are real and exercised; **`picks`=0,
  `webhook_log`=0 → the create→publish→pick→notify loop has NEVER completed end-to-end.** Getting that one real
  run green (S3 Ch 8.2, S1 §4 terminal gate) **is the milestone.** *Source: S19 §B, S3 §13, S1 §1/§4.*

### 16B. Persistence reality vs target
Today the app writes **current-state rows directly** (`peeks`+`cards`+`variant_groups`) + a **flat telemetry
stream** (`events`: kind + payload). This is **NOT** the event-sourced command→event→state maker-checker the
architecture calls for — that gate (`packages/core`, S3 Ch 1.3) is **net-new**. *Source: S19 §B. CURRENT.*

### 16C. Net-new (does not exist yet — verified)
1. **The catalog moat** (§12): no `pg_products`/`pg_offers`, no entity resolution, no hybrid/CLIP retrieval;
   pgvector not installed. The real net-new moat. *Source: S5 §14.1, S19 §C.*
2. **The aesthetic eval gate** for the vibe engine (R3.9) — human-rated. *Source: S5 §14.2.*
3. **The maker-checker event-sourced core** (R10.3) + the single-page chat-over-preview UX + rules-aware render
   + the completed publish→pick→notify loop. *Source: S19 §G.*
4. **The Dual-Representation envelope + HTML→spine extraction parser + per-turn autosave** (S1 §4) — kills the
   "write-orphan" (today `/api/curator` persists nothing; `/api/publish` always 404s).
5. **Sentry DSN, Twilio keys, Inngest keys** — observability + SMS share + durable jobs not live.
6. **Social** and **collaboration** product behavior — modeled in the DB, but unspecified.

### 16D. Renderer GAPs (in the salvaged `lib/peek-render`) — scheduled, not accidental
1. **Rules engine:** `variant_groups` render as flat tiles with a uniform badge — no rule-aware grouped
   affordance. **The defensible core; highest priority** (S3 Ch 4.3). *Source: S3, S10 §1, S19 §F.*
2. **Activity-as-itinerary** dropped — render the plan (R4.22). *Source: S3 Ch 4.4, S19 §F.*
3. **`palette.glow:true` never reaches the hero headline** (`--peek-display-shadow` forced to `'none'` — a
   one-liner). *Source: S3, S19 §F.*
4. **`stats`/`lede` sections** unauthorable (renderer supports them; tool enum doesn't). *Source: S3, S19 §F.*

### 16E. Server-side rules-enforcement GAPs (atelier code, S10 §1)
`pick_all`/`pick_any` modes unenforced server-side; `is_locked`/beg requirement not checked; no uniqueness
index on `(peek_id, card_id, recipient_signature)`; `recipientSessionId` from request body (impersonation,
BUGS B01); `unlock_rule.kind` `date_after`/`event` accepted by zod but **no consumer code**. `/api/pick` calls
`decidePick` **without passing caps** → server-side budget enforcement is **dead code** (S1 §1). *CURRENT.*

### 16F. The explicitly-thin areas (Frank's "100 more" go here)
Per S5 closing note, the thinnest sections — **scaffolds waiting on Frank:**
- **§5 Collaboration** — rules of who-edits-what, invite/approval, multi-organizer caps, conflict handling.
- **§6 Social** — share-to-social, social login, discovery/virality, referral mechanics.
- **§11 Netlify / Ops** ("the section you could add 100 more to") — context-scoped env-var conventions, deploy/
  branch/preview workflow, edge vs serverless boundaries, build/cache/redirects/headers/CSP, domain/DNS cutover
  sequence, registered webhook endpoints. *Source: S5 §6/§7/§11. CURRENT — flagged THIN.*

### 16G. Other known-broken-now (don't rebuild around) — S19 §E
`/build` GET 500 unauthenticated; fal `generate_hero_image` → `image_url:null`; scrape degraded on most
non-Amazon/Zappos retailers; Memory-tool path validation burns ~2 tool calls/session; `affiliate_search`
stalls the conversation; Sentry captures nothing. *CURRENT.*

---

## 17. THE BUILD PLAN (the gated cascade — Chapters 0→8)

The plan is the **BUILD-BOOK** (S3/S6/S7): a gated top-down cascade; each prompt ends in a **GATE** (a passing
test / a 200 / a real deploy / a screenshot); a gate that can't pass is a **STOP**. *Source: S3 §12, S6, S7.
CURRENT.*
- **Ch 0** Ground truth (verify, don't trust) → **Ch 1** monorepo core + event gate + pure render + token
  system (anti-Tailwind CI) → **Ch 2** chat over live preview → **Ch 3** vibe layer + aesthetic eval gate →
  **Ch 4** recipient page (carousels + rules + itinerary + caps + `next/og` unfurl) → **Ch 5** catalog moat →
  **Ch 6** MCP → **Ch 7** gates ($12 publish + Sentry + evals + Inngest) → **Ch 8** cutover (legacy `peek.gift`
  (Vite) → `vnext.peek.gift`; the **Ch 8.2 full end-to-end run is the milestone**).
- **Deploy:** Netlify auto-builds the **production branch** on push (currently `atelier-integration` →
  `vnext.peek.gift`). Build on a branch off `atelier-integration` and make it the Netlify production/branch-
  deploy branch so `git push` = deploy. *Source: S3 §12, S19 §D.*
  - ⚠ **CONTRADICTION (the build branch — open call for Frank).** S3/S4 say build off **`atelier-integration`**.
    But **S1 §8** says build off **`studio-integration`** (the live, deployed line with `apps/web`), and notes
    Frank had originally pinned `claude/wizardly-mendel-b643n` (the *old* root app with no `apps/web`). **The
    correct build branch is an open decision for Frank** — it tracks the §9/§16C-4 Dual-Representation pivot:
    the freeform-HTML engine lives on the `studio-integration` line, not on `atelier-integration`.
  - ⚠ **MINOR (build-sequence framing).** S3 uses 9 chapters (0–8); S1 §7 uses 7 phases (0–6) reorganized
    around the dual-rep pivot (decisions → chat-brain → dual-rep spine+autosave → the loop → security → eval+
    taste → PerfectPurchase seams). They are not in conflict on *content*, only on *sequencing/grouping*; S1 is
    the more recent ordering and front-loads the chat-brain caliber win + the never-completed loop.

---

## 18. CONTRADICTION INDEX (every cross-doc conflict, in one place)

| # | Topic | Doc A (position) | Doc B (position) | Resolution |
|---|---|---|---|---|
| C1 | **Page model** | "never raw HTML; emit structured IR" (S5, S8, S3, S4, JUMPOFF) | **Dual Representation: freeform HTML + spine** (S1, S2 deployed) | **S1/S2 supersede; needs Frank's blessing to become canon** (§9 ⚠, §16C-4) |
| C2 | **UI model** | 6-step wizard + drawers (S20) | conversation is the only interface; no wizard/drawers (S3, S4, S2) | **S20 SUPERSEDED** (§2.2 ⚠) |
| C3 | **Default model** | "Sonnet 4.6 default, Opus opt-in" (S6, S3 Ch 2.4 body); "Sonnet enough" (S9) | "Opus 4.8 day one" (S3 §9, DQ-9, S1 deployed) | **Opus 4.8 day one** (§8.3 ⚠) |
| C4 | **Checkout flavor** | embedded Checkout Session, full i18n/tax (S3/S4 §7) | as-built PaymentIntent + Payment Element, single-currency USD (S3 Ch 7.4) | **Target = Checkout Session; reconcile w/ as-built — open for Frank** (§7.3 ⚠) |
| C5 | **Unlock kinds** | 3: beg / date_after / event (S3, S4, S8) | 4: beg / requires_picks / date_after / event (S18, S10 schema) | **4 (schema is authority)** (§4.19 ⚠) |
| C6 | **Card-kind vocab** | enum product/activity/aspirational/digital (S10/S11) vs prose +homemade/IOU/etc (S3) vs runtime product/wrapped/custom/experience/taunt/digital (S2) | — | **single mapping table required, not yet written** (§4.10 ⚠) |
| C7 | **Affiliate priority** | "named core feature," big merchant catalog (S5 §5) | DEMOTED — "we don't have affiliates right now" (S16, DECISIONS) | **Not a v1 priority; catalog graph survives as architecture** (§11.7 ⚠) |
| C8 | **Build branch** | `atelier-integration` (S3, S4) | `studio-integration` (S1) | **Open for Frank; tracks the dual-rep pivot** (§17 ⚠) |
| C9 | **Platform form-factor** | "should be an app, not a website" (S5) | Next.js web PWA, Expo later (S3, S8) | **Web PWA now; native later** (§1.4 ⚠) |
| C10 | **Vibe engine nature** | a generator / "template that morphs" (S9) | a safety net under free authoring, NOT a generator (S3, DECISIONS) | **Safety net, not generator** (§3.2 ⚠) |
| C11 | **"always" hard rule** | "never use 'always' in a doc" (R14.11) | docs say "Plan top-down, always" (S3, S4) | docs self-violate; intent = avoid absolute directives |

---

## 19. DESIGN OPEN QUESTIONS — resolved & still-open

- **Resolved (S11/DECISIONS):** DQ-1 CSS-var namespace = `--peek-*` · DQ-2 enrich ThemeSpec · DQ-3 add
  `details`+`gallery`, promote only `countdown`+`claim` · DQ-4 add `value_display?` · DQ-5 card vocab = contract
  wins (4 enum) · DQ-6 fonts = arbitrary Google families, FONT_SPECS is a pantry not a gate · DQ-7 one renderer
  two surfaces, reveal as `page_type` · **DQ-8 safeword = `bananahead`** (ships as `PEEK_SAFEWORD` config,
  default `process.env.PEEK_SAFEWORD ?? "bananahead"`, never inline) · DQ-9 Opus 4.8 + streaming + caching ·
  DQ-10 cascade order `retailer_api → url_scrape → research` · DQ-11 remove `lib/peek/*` first-cut.
- **Still open (need Frank):** the **dual-representation blessing** (C1) · the **build branch** (C8) · the
  **checkout reconciliation** (C4) · `linkStyle` default per theme (R4.12) · the **card-kind mapping table**
  (C6) · the item-aware cap-default formula (R4.18) · the three THIN areas (§16F) · anonymous metering
  threshold (currently ~5 turns then signup) · reels (Sora2/Veo) timing.

---

*End of canonical requirements. Long by design — exhaustive per the brief. Every requirement carries its
source(s) and CURRENT/SUPERSEDED status; every cross-doc contradiction is in §18.*
