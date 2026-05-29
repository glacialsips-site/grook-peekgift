# BRIEF 21 — Renderer mobile-fit bugs + wireframe vibe contradiction

**Source of need:** the mobile-vibe-gallery sub (Hercules prep window) rendered all 40 presets at 375×812 iPhone viewport with self-hosted fonts. Surfaced 3 real renderer bugs that bite specifically on mobile + 1 grammar inconsistency. Small, surgical, can fire any time. Independent of all other briefs.

**Read first:**
1. `atelier/components/renderer/renderer.module.css` — the 3 renderer fixes live here.
2. `atelier/lib/vibe/grammar/grammar.ts` `--vibe-scale-display` clamp definition.
3. `atelier/lib/vibe/grammar/presets.ts` — the `wireframe` preset entry.
4. `.claude/worktrees/agent-a89c9d578439ebfef/prototypes/mobile-vibe-gallery/` if still present — the sub's evidence (40 PNGs + manifest).

## BUG 1 — Headlines clip at 375px on high-scaleContrast presets

`.heroTitle`, `.sectionHeading`, `.cardTitle` in `renderer.module.css` lack `overflow-wrap: anywhere; hyphens: auto`. High-scale presets (concrete-poet, zine-punk) overflow horizontally on mobile.

**Fix:** add to those three selectors:
```css
overflow-wrap: anywhere;
hyphens: auto;
```

## BUG 2 — `--vibe-scale-display` clamp ceiling assumes desktop

Current `clamp(min, ideal, max)` for `--vibe-scale-display` lets the max value exceed 375px viewport width at high scale ratios.

**Fix:** wrap the max term in `min(<currentMax>, 14vw)` so display never exceeds ~14% viewport width. Verify the change in `lib/vibe/grammar/css-vars.ts` (the emitter) AND any preset-specific overrides in `grammar.ts`.

## BUG 3 — Placeholder cardMedia reads as empty

`.cardMedia` placeholder is a flat surface color — visually reads as "blank card" not "image goes here." Recipient/curator both see this during build (before AI gen / before scrape resolves).

**Fix:** add a subtle 45° hatch background to `.cardMedia[data-placeholder]` (or whatever marks it as placeholder vs real-image-loaded). Use `--vibe-ink-muted` at low opacity so it composes with the vibe. CSS:
```css
.cardMedia[data-placeholder] {
  background-image: repeating-linear-gradient(
    45deg,
    hsl(var(--vibe-ink-muted) / 0.04) 0 8px,
    transparent 8px 16px
  );
}
```

## GRAMMAR ISSUE — `wireframe` preset contradicts its DNA

`wireframe` preset's DNA says "white and black ink only" but the engine derives `mono+mono baseHue 0` → dusty rose (a chromatic palette). One of two truths is wrong:

**Path A:** the preset's intended DNA is correct — patch `presets.ts` `wireframe` entry to force `palette.strategy: 'monochrome'` + `key: 'light'` + `saturation: 'muted'` AND explicitly pin `baseHue: 0` to ensure the engine derives grayscale (not warm-tinted).

**Path B:** the engine's `baseHue: 0` derivation defaults to a warm-tinted neutral. Document that as the spec; update wireframe's DNA description to match what it actually does ("warm muted brutalist").

Pick A unless you have a reason for B. Document the call in RETURN.

## DELIVERABLES

- The 3 renderer fixes in `renderer.module.css` (+ wherever `--vibe-scale-display` clamp lives).
- The wireframe vibe fix in `presets.ts`.
- A small mobile-fit regression test: render 5 high-scale presets (concrete-poet, zine-punk, neon-club, miami-vice, vegas-blur) and assert no horizontal overflow at 375px. Use Playwright if available, otherwise structural CSS assertion.
- Update `wireframe` test if its palette-deriving assertion changes.

## HARD RULES

- **`var(--vibe-*)` only** — no literal colors anywhere.
- **Don't break existing 394 tests.** The renderer changes are additive; if anything breaks, root-cause it.
- **Branch:** `lt/renderer-mobile-fits` off `claude/bold-ride-Li5zK`. Push. Do not merge.

## VERIFICATION

- typecheck/test/build green.
- 5 high-scale presets render without horizontal overflow at 375px.
- Wireframe renders as the chosen DNA (grayscale or warm-muted, but consistent with declared description).

## RETURN.md

Sections: 4 fixes implemented; wireframe path-A-or-B chosen + rationale; before/after screenshot pair for one high-scale preset showing the clip is fixed; bright ideas (e.g. other presets that might benefit from similar polish). Honesty section.

Per PROTOCOL.md: push `lt/renderer-mobile-fits`, write RETURN.md.
