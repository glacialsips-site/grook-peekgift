# DECISIONS.md — peek.gift vNext (settled calls + dead-ends; don't relitigate)

Resolved with the design seat's greenlight (relayed by Frank, 2026-06-01). The "why"
lives in `PLAN.md` + `DESIGN_QUESTIONS.md`; this is the durable record.

## Architecture (settled)
- **The model is the resolver.** No mandatory deterministic design engine. (The parametric
  resolver/director is fenced in `peek-jumpoff/reference/engine-parametric-REJECTED/`.)
- **Overbuild the contract, build lean behind it:** `ir/contract.ts` (IR) + `ir/ports.ts`
  (every vendor behind a typed port + stub) are the frozen spine.
- **Keep ~all of the v0;** migrate `lib/types.ts` as a SUPERSET (cards untouched; Vibe→
  ThemeSpec; hero 3-cols→MediaSlot; +concept/sections/page_type/cta_label). Merge JUMPOFF
  into the existing `PEEK_SYSTEM_PROMPT` voice (don't replace).
- **Trust order when anything conflicts:** the original mockups > engine/renderer.js > prose.

## Renderer (settled — the big correction)
- `engine/renderer.js` is a PRIOR generation; it does NOT consume `PeekIR`. We build a
  conformant renderer to the contract and PORT THE INTERACTION SHELL.
- ★ **Bar for the shell = the ORIGINAL 10 mockups** (`peek-jumpoff/reference/original-mockups/`),
  NOT the Site Stamper renderer. Port the *quality* (Charity Gala: solidify-on-scroll nav,
  staggered slide menu, scroll-progress, count-ups; bottom sheet; reveals), not just
  renderer.js's mechanics. "good" is a regression — the bar is "screenshot-worthy." (design caveat)

## DQ resolutions (design greenlight)
- **DQ-1** CSS vars: `--peek-*` namespace. (tech)
- **DQ-2** ThemeSpec: enrich with `space` / `radius{card,pill}` / `motion` eases. (tech)
- **DQ-3** Section kinds: add `details` + `gallery`; wild signature moves (lotería, decree)
  stay model-authored `custom`; promote ONLY `countdown` + `claim` to first-class (they
  carry live state static HTML can't).
- **DQ-4** add `value_display?: string` for ranges / "—". (tech)
- **DQ-5** card vocab: contract wins (product/activity/aspirational/digital); renderer re-mapped. (tech)
- **DQ-6** fonts: loader fetches ARBITRARY Google families from `FontSpec`; FONT_SPECS =
  pantry suggestions, not a gate. (tech)
- **DQ-7** recipient view: ONE renderer, two surfaces; door/reveal as a `page_type`.
  SCOPE: the recipient surface layers its OWN interactions (pick / beg / unlock) on the
  shared renderer.
- **DQ-8** safeword: Frank picks the string (never "stop"/"reset"); ships as config
  (`PEEK_SAFEWORD`), never inline. **[PENDING the value — non-blocking]**
- **DQ-9** model: Opus 4.8 + streaming + prompt-caching (JUMPOFF + pantry). A cheap model
  stays available behind `LLMPort` for non-creative ops.
- **DQ-10** CardResolver cascade: default order `retailer_api → url_scrape → research`
  (web-search+vision); order is config/data, reorderable without editing core.
- **DQ-11** remove the earlier split-pane first-cut (`lib/peek/*`, `app/peek/*`) during
  Milestone 0; salvage only the streaming-route scaffolding.

## Open
- **DQ-8** safeword value (Frank).
- Design to verify `PLAN.md` + `DESIGN_QUESTIONS.md` from git on branch
  `claude/bold-feynman-SZzaO` → final greenlight → fan out Milestone 0.
