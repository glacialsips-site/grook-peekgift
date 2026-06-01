# peek.gift — DESIGN FILE EXPORT · manifest & honest weeding guide

**No real filesystem timestamps were available to me**, so this is ordered by
**development sequence (best recollection) + my honest quality call** — which is what you
actually need to weed early-weak vs. late-drift. Folders are numbered in rough
chronological order.

Legend: ⭐ = the bar, trust it · 🔧 = useful reference (not the bar) · ⚠️ = drift / verify
· 🗑 = weak / scratch.

---

## 00_assets/
Shared images referenced by some files (e.g. the mom-daughter photo qa used). Support only.

## 01_original-mockups/  ⭐ THE BAR — earliest, strongest
The ten hand-art-directed occasion pages. **These are the source of truth for quality.**
Each = one committed concept → its own type system, palette, motifs, genre codes, copy,
plus the full mobile interaction system (slide menu, sticky action bar, bottom sheet,
reveals), responsive to desktop.
- Charity Gala ⭐ (Bodoni Moda, emerald/brass, countdown, auction lots, tiers — exemplary)
- Omakase Evening ⭐ (Shippori Mincho + kanji, washi/sumi/seal, hanko, course progression — exemplary)
- HEMLOCK – Field Collection, Cyber Rave, Disco Birthday, Garden Party, Princess Party,
  Space Mission Party, Totally Rad Bash, Bachelor Party — all strong; range across the spectrum.
> If anything I wrote later contradicts what these *do*, trust these.

## 02_new-mockups/  ⭐ strong, later — the gift-bundle core
My 5 newer pages, made to cover the gift/care-package product the original 10 didn't:
The Send-Off, For the Old Man, Soft Landing (gift bundles) · Decree Absolute, El Taquito
(invites) · + Mockups Gallery. Same caliber as 01; these prove the method generalizes to
gifts. ⭐
> Honest caveat: rendered-screenshot QA on these was flaky (tooling), but the code is sound.

## 03_chat-ui/  🔧 the chat-over-preview surface
The mobile chat UI experiments + their components — the "operational chat laid over a
live-updating preview" reference.
- Mobile Chat - Live.html + live-preview.jsx 🔧 (the realtime chat→preview flow — most useful)
- Mobile Chat - Glass / Sites / Templates, chat-*.jsx, product-preview, ios-frame,
  design-canvas — supporting experiments; some are early/rough.

## 04_engine-parametric/  🔧/⚠️ the Site Stamper engine — where parametric DRIFT began
A deterministic engine (parts/resolver/director/renderer.js) + studio (Site Stamper.html).
- engine/renderer.js 🔧 — genuinely useful as the **reusable interactive shell** (menu/
  sheet/sticky bar/giftgrid) the real build can port.
- the resolver/director/parts ⚠️ — this is the "lookup-table taste" approach we concluded
  was the WRONG ceiling. Output is coherent but **housey — a notch below 01/02**. Keep as
  reference, do NOT treat its output as the bar.
- qa.html 🗑 — a bare screenshot harness. Not a design; ignore as a reference.

## 05_handoff-docs/  ⚠️ strategy docs — newest, highest drift risk
Everything written to hand off to Claude Code. Useful thinking, but **this is where you
flagged hallucination** — verify against 01/02 before trusting any specific claim.
- design_handoff_mobile_chat_sites/ — the big doc set (architecture, toolkit, director
  agent, stack integration, FIRST_TRY, etc.). Mixed: some solid, some over-built/drifted.
- peek-jumpoff/ — the later code-ready package (IR contract, ports, samples, mockups copy).
- JUMPOFF.md ⚠️ — the latest clean system-prompt rewrite. You caught hallucination in it;
  re-verify line-by-line against the real mockups before using.
- _NOTE_TO_SELF.md — my distilled one-page reset (mostly accurate; verify against 01/02).

---

## The one honest summary for a fresh chat
- **The bar = 01_original-mockups + 02_new-mockups.** Study those, not my prose.
- **The method:** one committed concept per page → cascade into type/color/motif/copy →
  vary the display font every time (never the same font on every page) → make it
  unmistakably *this* person/event → keep the shared bones (anatomy + mobile system) →
  emit as structured data so checkout/picks attach. The model is the resolver; no
  mandatory engine.
- **Trust order when docs conflict:** the mockups (01/02) > the renderer shell (04) >
  the strategy docs (05).
