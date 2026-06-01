# peek.gift — THE MAP
### The whole picture on one page, so nobody builds a dead end.

> Read this first. It is the framework every part must fit. If something you're about
> to build can't satisfy what's here, stop — you're about to build the thing we scrap.
>
> Written by the design instance (Opus) that made the original 10 mockups, for the
> Claude Code instance(s) building the real thing. We are the same intelligence in two
> seats: I hold *intent + taste + the contract*; you hold *the live repo + build/deploy*.
> This package is how we stay lossless without a human relaying between us.

---

## 1. What the product is (in one breath)
A person texts a chat ("my dad's 60th, he's a yardwork guy, taking him to dinner").
A beautifully **art-directed, single-recipient gift/invite page** builds itself in
real time beside the conversation. The recipient opens it, feels *seen*, and **picks**
from curated cards (real products, shared activities, aspirational taunts, digital
things). The sender looks brilliant; no money is wasted on the wrong thing. Publishing
is a **$12 Stripe checkout** — that's the business.

## 2. The success metric (the only one that prevents underbuild)
A pretty page is necessary but **not** the metric. Success = **three things at once**:
1. **Range, not specimens** — original-10 caliber on *arbitrary, unseen* input. Test
   by throwing 10 weird briefs cold, never by polishing one demo.
2. **Spine conformance** — every page is a valid **IR** (structured data) that the
   *other two parts consume unchanged*. The chat's deliverable is a valid IR, not HTML.
3. **Vendor-neutrality** — every external system enters through a **typed port** with a
   stub behind it. Adding the 14th/50th backend = one new adapter, **zero** changes to
   core or the other parts.

> **The mantra that gets it built right: "Overbuild the *contract*. Build lean *behind*
> it."** Don't gold-plate implementations — stub them. Do make the *interfaces*
> complete now. That is good architecture, not scope creep, which is why it actually
> gets done instead of resisted.

## 3. The three parts (the agreed split) + the spine that joins them
```
        ┌───────────────┐   ┌────────────────────┐   ┌──────────────┐
        │ LANDING / AUTH │   │   CHAT / BUILDER    │   │   CHECKOUT    │
        │ marketing,     │   │  the chat + the     │   │  $12 publish, │
        │ sign-in (Clerk)│   │  live page preview  │   │  recipient    │
        └──────┬────────┘   └─────────┬──────────┘   │  view, picks  │
               │                      │              └──────┬───────┘
               └──────────┬───────────┴──────────┬─────────┘
                          ▼                       ▼
                 ┌───────────────────────────────────────┐
                 │   THE SPINE  (overbuilt, frozen)        │
                 │   • IR  = the page as data (contract)   │  ir/contract.ts
                 │   • PORTS = every backend as interface  │  ir/ports.ts
                 └───────────────────────────────────────┘
```
Each part stays **lean internally** but is measured by **"reads/writes the full
spine."** A lean part that conforms still composes. A gorgeous part that invented its
own shape is what you pay to rip out later. **The spine is the integration contract AND
the anti-underbuild lock.**

## 4. The generation model (settled — do NOT relitigate)
**The model IS the resolver.** A strong Opus chat, handed the JUMPOFF, authors the
`ThemeSpec + IR` directly from taste — exactly how the original 10 were made with no
engine. There is **no mandatory deterministic design engine**; that would cap quality
at what its lookup tables know — the ceiling this whole project exists to avoid.
- **Path B (default): model cooks** the IR, validated against the schema → renderer.
- **Path A (optional fallback): a resolver** (`engine/resolver.js`, already built) for
  instant/free preview while the model streams, or cheap-device fallback. *Accelerator,
  never a gate.*

## 5. What code already built (the repo: `grook-peekgift`) — and the two things to fix
Code stood up a real, deployable Next.js v0. **Keep almost all of it.** Honest audit:

**Keep (it's good):** the whole product spine — `Card` / `VariantGroup` / `Pick`, the
card types (product/activity/aspirational/digital), variant rules (pick-one, beg-to-
unlock, taunt), URL-scrape → card, Stripe/Clerk/Supabase/Resend plumbing, the recipient
view, the chat tool-loop shape, the conversational voice in `PEEK_SYSTEM_PROMPT`.

**Fix #1 — the design layer is capped by the data shape.** `Vibe` = a palette + *one*
`font_pairing`. There is nowhere to store a **concept**, a **bold move**, a **type
system**, **section archetypes**, or a **custom block**. Our lotería / legal-decree
mockups are *literally unstorable*. → Replace thin `Vibe` with the **`ThemeSpec` +
`Concept` + `sections[]`** in `ir/contract.ts`. (Superset migration — keeps every
existing field; cards are untouched.)

**Fix #2 — vendors are hardwired; there are no ports.** `runTool` runs raw SQL inline;
scrape/imagegen are called directly. Adding backends = editing core every time → the
scrap trap. → Introduce `ir/ports.ts`: every external capability behind a typed
interface with a stub. Move existing calls *behind* the ports (no behavior change now,
infinite extensibility later).

**Fix #3 — swap the design brain into the prompt.** `PEEK_SYSTEM_PROMPT` nails voice +
product but has *no art direction* (concept / one bold move / type hierarchy / anti-
slop). → Merge `JUMPOFF.md` into it. Voice stays; taste gets added.

## 6. Build order (so each step composes instead of dead-ends)
1. **Freeze the spine.** Land `ir/contract.ts` + `ir/ports.ts`. Migrate code's
   `types.ts` to the contract (keep cards; replace `Vibe`→`ThemeSpec`; add
   `sections[]`). Wrap existing vendor calls behind ports + stubs. *No new features —
   just the seams.* This is the overbuild that prevents the scrap.
2. **Swap the brain.** `PEEK_SYSTEM_PROMPT` = the JUMPOFF. Give the chat a
   `set_theme(ThemeSpec)` + `set_sections(...)` tool surface so it authors design, not
   just cards.
3. **Cold test (the safeword loop).** Throw simple briefs at it. Compare output to the
   mockups in `samples/`. Type the safeword → the chat reports what it lacked / faked /
   fought. Bring that to design + code. Tune the **prompt** and **ports**, never a rigid
   engine. Redeploy. Repeat.
4. **Fill ports for real** as needed — one adapter at a time, behind the frozen
   interface. Nothing upstream changes.

## 7. The files in this package
- **`JUMPOFF.md`** — the in-page chat's system prompt. The design brain, peer-to-peer.
- **`ir/contract.ts`** — the design-complete, product-complete IR. The frozen contract.
- **`ir/ports.ts`** — every backend as a typed port + a stub. Vendor-neutral seam.
- **`samples/`** — worked **input → IR → page** examples. Few-shot for the chat; proof
  for code that the contract can hold real, wildly-different pages.
- **`TIPS.md`** — traps, tricks, the test loop, the failure modes I already hit.
- **`README.md`** — entry point.

## 8. The one-line test for any decision
*"If we 10×'d the backends and the design ambition tomorrow, does this still hold?"*
If yes, ship it. If no, it's the ceiling — fix the seam, not the symptom.
