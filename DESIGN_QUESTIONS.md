# DESIGN_QUESTIONS.md — calls to resolve before/at greenlight

Per `peek-jumpoff/FOR_CODE.md` ("don't guess at taste — note it here"). Each: the
question, the audit finding behind it, and **my recommendation**. Items marked ✅ are
tech calls I'll just make unless you object; the rest want a design/founder nod.

## Spine / contract reconciliation (from the renderer-vs-bar audit)

**DQ-1 — CSS-var namespace.** Contract + sample use `--peek-*`; the reference renderer
emits `--bg/--accent/--font-display`. → **Rec:** standardize on `--peek-*` (namespaced,
won't collide inside the app shell); I update renderer + sample to match. ✅ unless design objects.

**DQ-2 — ThemeSpec richness.** The interaction shell needs tokens the contract's
`ThemeSpec` lacks (`eyebrowTracking`, `radius.pill`, `space.sectionY`, motion easings).
→ **Rec:** enrich `ThemeSpec` (it's the frozen spine — "overbuild the contract"): add
`space`, `radius{card,pill}`, `motion{...eases}`. ✅ I'll draft; design confirms shape.

**DQ-3 — Section kinds + the signature moves.** Contract has `details` (no renderer
impl); renderer has `gallery` (not in contract). The hard mockups' signature moves —
live countdown, lotería/papel picado, dish-claim chips, vertical kanji, auction
lot-estimate ranges — currently all fall to `custom`.
→ **Rec:** add `details` + `gallery` to the contract. Keep the signature *visual* moves
as `custom` (the model is the resolver — no archetype zoo). **Promote to first-class ONLY
the ones that carry state/interactivity `custom` html can't safely hold** — a `countdown`
and a `claim` kind (RSVP / dish / meal-train / pick-with-state). **Design: agree on that line?**

**DQ-4 — Card value ranges.** `value_cents:number` can't hold "£18k–£25k" or "—".
→ **Rec:** add `value_display?: string`; renderer prefers it when present. ✅ I'll add.

**DQ-5 — Card vocab.** Renderer uses `homemade/experience/idea`; contract `CardType` is
`product/activity/aspirational/digital`. → **Rec:** contract wins; re-map renderer to the
four canonical types (homemade→`metadata.kind` on a product, etc.). ✅ I'll handle.

**DQ-6 — Fonts.** `parts.js` FONT_SPECS is a fixed allow-list missing most fonts the
mockups use (Oswald, Roboto Mono, Special Elite, Yeseva One, Graduate, Libre Baskerville,
Shippori Mincho…). Contract's `FontSpec` already allows any family+axis. → **Rec:** the
loader fetches **arbitrary** Google families from `FontSpec`; FONT_SPECS becomes the
pantry's curated suggestions, never a gate. ✅ I'll handle.

## Product / behavior

**DQ-7 — RecipientView.** Today a hardcoded `door→note→cards→done` phase machine, no
sections/page_type. → **Rec:** the recipient page renders from the same `PeekIR`/renderer
as the builder preview (one renderer, two surfaces), with the "door/reveal" ceremony
expressed as a `page_type`/section, not a hardcoded flow. **Confirm.**

**DQ-8 — The safeword token.** JUMPOFF ships a literal `<SAFEWORD>` placeholder. **What's
the actual safeword string?** (I keep it as a config value, never inline in the shipped prompt.)

**DQ-9 — Model.** Handoff says Opus; existing is Sonnet 4.6 non-streaming. → **Rec:**
Opus 4.8 + streaming + prompt-cache (JUMPOFF+pantry); a cheap model stays available behind
the `LLM` port for non-creative ops. **Confirm Opus.**

**DQ-10 — CardResolver cascade (mostly tech).** `ports.ts` already has the
`CardResolverPort` shape. I'll add the config surface (tier `order` as data/env), a
default impl iterating order→dispatch per tier, the tier1(retailer API)/tier2(URL+
screenshot scrape) split, and a screenshot input. Default order
`retailer_api → url_scrape → research(web-search+vision)`. ✅ I'll handle; **confirm default order.**

## Process

**DQ-11 — The earlier first-cut** (`lib/peek/*`, `app/peek/*` — the split-pane chat I
built before this handoff) is superseded by the contract-conformant direction. → **Rec:**
remove it during Milestone 0 (salvage only the streaming-route scaffolding). ✅ I'll handle.
