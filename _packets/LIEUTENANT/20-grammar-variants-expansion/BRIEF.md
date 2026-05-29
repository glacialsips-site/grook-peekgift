# BRIEF 20 — Grammar variant expansion (the radical-vibes fix)

**Source of need:** the structural-variation sub (Hercules, post-Wave-1-merge) rendered 3 representative vibes (`velvet-rope`, `cottage-warm`, `zine-punk`) across every `HeroVariant`, `ProductSetVariant`, and `DividerVariant`. Findings:

- **Hero variants: 5/5 visually distinct** — strongest axis, grammar earns its keep here.
- **Divider variants: clear but small** — adequate, no expansion needed.
- **Product-set variants: nominally 6, visually distinct on mobile = 4.** Near-twins flagged:
  - `editorial-full-bleed` ≈ `single-hero-product` — both strip card chrome, stack vertically. `single-hero-product` is degenerate `editorial-full-bleed` with `cardCount=1`. Doesn't earn its enum slot.
  - `collage-masonry` reads as "tight-grid with weird sizing" until ≥6 cards. Typical 3-4-card peek doesn't activate the asymmetry.

This is the structural root of Frank's "feels like what we had" concern: when curator-Sonnet picks vibes but lands on the two defensible defaults (`tight-grid` or `editorial-full-bleed`), adjacent peeks rhyme structurally no matter how the palette swings. The grammar's STRUCTURAL promise (radically different page per peek) doesn't deliver as advertised because the structural vocabulary is too narrow.

**Pre-reqs:** none — independent of every other queued brief. Can fire ANY time after Tier 1 lands.

**Read first:**
1. `atelier/lib/vibe/grammar/grammar.ts` — current `ProductSetVariant` enum + composition rules R1-R8 + `PRODUCT_SET_COUNT_RULES`.
2. `atelier/lib/vibe/grammar/presets.ts` — every preset's preferred product-set; some lock to specific variants you may need to retune.
3. `atelier/components/renderer/sections.tsx` — the `productCardSet` renderer (CSS Module file `renderer.module.css` has the layout primitives).
4. `atelier/components/renderer/renderer.module.css` — current layout CSS for each variant.
5. `.claude/worktrees/agent-a937adc2377937f8f/prototypes/structural-variation/` if still present — the sub's renders that diagnosed this. (Worktree may have been recycled — branch was `worktree-agent-a937adc2377937f8f`. If lost, the findings are captured in this brief.)

## DELIVERABLES

### 1. Add 4 new `ProductSetVariant` values (per the sub's proposals)

| New variant | What it is | When AI picks it |
|---|---|---|
| `feature-pair` | One focal card + 2-3 satellites in a side rail; mobile = focal full-width, satellites in 2-col grid below | "the main one" + supporting picks |
| `zigzag-prose` | Text-block / card / text-block / card alternation; recipient reads note copy bracketing each gift | Tender/sentimental vibes; ≥3 cards with descriptions |
| `stacked-polaroids` | Overlapping cards w/ slight rotation, tap-to-spread (mobile-native gesture); JS-light | Whimsical / casual / kid vibes; ≤5 cards |
| `gallery-wall` | Image-mosaic, prices revealed on tap (toggle state); SUBVERTS "shop grid" → "art exhibit" | Luxe / minimal / editorial vibes; ≥4 cards |

Update:
- `ProductSetVariant` enum in `grammar.ts`.
- `PRODUCT_SET_COUNT_RULES` (the count → variant gate) — set legal ranges per new variant.
- Renderer's `sections.tsx` + `renderer.module.css` — implement each layout. Use only `var(--vibe-*)` per the lock (no literals).
- `presets.ts` — touch any preset whose `preferredProductSet` was forcing the now-narrowed set into a near-twin slot (some `velvet-rope` / `museum-label` presets may benefit from `gallery-wall`; some `gummy-bear` / `taffy-pull` from `stacked-polaroids`).

### 2. Decide: prune `single-hero-product` OR make it visually distinct

Two paths — pick one in the RETURN; recommend the orchestrator's call:
- **A. Prune:** delete `single-hero-product` from `ProductSetVariant`. `editorial-full-bleed` with `cardCount=1` covers the use case. Simpler grammar.
- **B. Differentiate:** make `single-hero-product` deliberately distinct — portrait orientation (4:5 or 3:4 hero image instead of 16:9), ambient halo/glow background, no border, full-bleed-edge type. Becomes the "this card IS the gift, witness it" archetype, e.g. a luxury watch lieutenant.

If you go B, document the visual fingerprint in CSS + add a renderer test asserting the layout differs from `editorial-full-bleed`.

### 3. Tests

- Every existing test stays green.
- New test: each of the 4 new variants survives `generateAndRepair` with 0 repairs on every preset where it's legal.
- New test: a structural-distinctness probe — render the same vibe across all variants, assert the output HTML byte size + section element count + grid-template / display patterns differ meaningfully (not literal-string diff; structural).
- Update `vibe-presets.test.ts` if any preset's `preferredProductSet` changed.

### 4. SSR proofs

Add 4 new entries to `PROOF_VIBES` (or extend the existing 10 with a "structural-axis" mode) so each of the new variants renders at least once in the `/renderer-proof/*` SSG output. Frank should be able to click into any new variant and see it.

### 5. Documentation

Update `_packets/SPINE/STACK-LOCK.md` "Design grammar" row to reflect the expanded variant set + the prune/differentiate decision.

## HARD RULES

- **`var(--vibe-*)` only** in any new CSS. ESLint vars-only rule enforces.
- **Mobile-first.** Every new variant must work at 375px viewport. Test in real Chromium if available.
- **Don't break the renderer invariant.** Same renderer drives build-preview, published, OG-as-data. No forks.
- **Don't fork the grammar.** Extending the enum is additive; renderer absorbs new variants additively.
- **Branch:** `lt/grammar-variants` off `claude/bold-ride-Li5zK`. Push.

## VERIFICATION

- typecheck/test/build green.
- 4 new SSR proofs prerendered.
- A real-mobile inspection (Playwright if possible) confirming the new variants look genuinely different from existing 4-5.

## RETURN.md

Sections: which 4 variants implemented + CSS approach; prune-or-differentiate decision on `single-hero-product` w/ rationale; presets retuned; structural-distinctness test results; Frank-inspectable new proof URLs/files; any new near-twin risk you spotted in the expanded set. Honesty section.

Per PROTOCOL.md: push `lt/grammar-variants`, write RETURN.md.
