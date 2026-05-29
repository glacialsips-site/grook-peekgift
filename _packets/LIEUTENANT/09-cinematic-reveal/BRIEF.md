# BRIEF 09 — Cinematic reveal (rebase + tune)

**Source of need:** an existing reveal implementation works but uses LEGACY `--peek-*` tokens (pre-grammar). Per the research sub, this is a rebase + tune — not a full rebuild. Knowledge kept.

**Read first (must):**
1. `_packets/LIEUTENANT/_research/cinematic-reveal/REPORT.md` — the choreography spec, per-vibe variation rules, name-moment patterns (TYPEWRITER default + STAMPED + HAND-WRITTEN PATH), skip/replay UX, card-deal stagger formula, tech recommendation (Motion via LazyMotion), risks.
2. `atelier/components/recipient/cinematic-reveal.tsx` — the existing 504-line legacy implementation.
3. `atelier/lib/reveal/phases.ts` — the deterministic phase planner (keep as-is, port to read `--vibe-*` instead of `--peek-*`).
4. `_packets/SPINE/skills/reveal-mechanics.md` — the canonical 395-line spec (port to grammar vocabulary; don't discard).
5. `atelier/lib/vibe/grammar/{grammar,css-vars,fixtures}.ts` — the grammar surface to rebase onto.
6. `atelier/components/renderer/sections.tsx` — the renderer the reveal mounts above.

## DELIVERABLES

### 1. Rebase the reveal layer onto `--vibe-*`

- Replace every `--peek-*` token reference in `cinematic-reveal.tsx` + `phases.ts` with the corresponding `--vibe-*` token from `lib/vibe/grammar/css-vars.ts`.
- Read motion scale via `getComputedStyle(wrapper).getPropertyValue('--vibe-motion-scale')` (no prop drilling).
- Read easing via `--vibe-ease`.

### 2. Implement the grammar-dial → reveal-parameter mapping

Per research §2. The reveal branches on grammar dials, NOT occasion. Implement:
- `motion.character` → uniform duration multiplier (already wired in legacy).
- `motion.easing` → `--vibe-ease` for card-stagger + overlay exit.
- `voice.pace` → name pacing modifier (`considered` ×1.4, `natural` ×1.0, `quick` ×0.8).
- `voice.warmth` → note style (`restrained` → line-batched; `effusive` → word-by-word).
- `texture.motif` → optional accent layer over hero-bloom (`sparkle/confetti/botanical/geometric/none`) — CSS-only particle bed, lazy-loaded, capped at 24 elements.
- `depth.elevation` → card Y-drop magnitude (flat=12px, lifted=20px, dramatic=36px).
- `shape.radius` → name-frame mask.
- `palette.key` → `dark/dim` adds vignette; `light` adds paper-wash.

Verify with the 3 existing SSR proofs (princess / bachelor / luxe) plus the 5-7 new ones from BRIEF 07 once landed.

### 3. The name moment

Per research §3:
- Default: TYPEWRITER (already in legacy; keep).
- Alt 1: STAMPED — single `scale(1.18) → scale(1)` + opacity + 12px ink-drop shadow. 320ms. For `voice.formality=formal` + `motion.character=still` + `display=serif` (luxe, condolence).
- Alt 2: HAND-WRITTEN PATH — SVG path morph using `pathLength` keyframes. For `display=script` (princess, casual). Requires per-glyph SVG generation at publish time (cache in Supabase Storage on slug publish). **v2** — flag in RETURN.md; not in this brief's scope unless trivial.

Grammar dispatch:
```
voice.formality === 'formal' && motion.character === 'still'   → STAMPED
typography.displayRole === 'script' && nameLength ≤ 16         → HAND-WRITTEN PATH (when cached)
otherwise                                                       → TYPEWRITER
```

### 4. Cards-deal sequence

Per research §5: focal-first deal-in with logarithmic stagger.
- Focal: tagged `emphasis: 'focal'` OR first when none tagged. Y +24 → 0, 420ms × motion-scale, quarter-second hold.
- Remaining: `staggerMs = max(60, 280/sqrt(n)) × motion-scale`.
- Above-fold cards animate in reveal; below-fold via `IntersectionObserver` on scroll.
- `horizontal-scroll` product-set variant: focal slides from left, remaining from off-screen-right with 100ms stagger.
- Per-vibe easing: bouncy +12px overshoot; crisp snap-in; eased smooth glide; linear utilitarian.
- Cap during reveal: 6 visible (matches existing `REVEAL_CARDS_CAP`).

### 5. Skip / replay

Per research §4:
- Skip: whole overlay tap-to-skip; visible affordance `tap to skip ›` at opacity 0.25, bottom-center, only after `phase === 'name'`. Esc/Space/Enter also fire. 320ms fade-out, not slam-cut.
- Replay: text link in page footer (NOT overlay) — `↻ replay reveal`, `var(--vibe-ink-muted)`, no icon button. Hidden during `phase !== 'done'`. Re-mounts reveal with same plan; clears `sessionStorage['peek-reveal-shown-{id}']`.

### 6. Tech: Motion via LazyMotion

- Replace any GSAP / heavy library use with Motion (`motion/react` — already in `framer-motion ^12.40.0` deps).
- Use `m` + `LazyMotion` features={domAnimation} for ~4.6kb client cost.
- Single `'use client'` mounted ABOVE the SSR'd `SlugRenderer`.
- `prefers-reduced-motion`: return `null` immediately, signal done (already in legacy).

### 7. Wire into `/spine/g/[slug]` (and ready for canonical promotion later)

- Mount reveal above the slug renderer on the recipient view.
- The reveal hides itself if `sessionStorage['peek-reveal-shown-{peekId}']` is set OR if `prefers-reduced-motion`.

### 8. PostHog event

`reveal_skipped` with `{ phase_at_skip, elapsed_ms, peek_id }`. If skip rate >30% in any cohort, retune duration for that `motion.character`.

## HARD RULES

- **Renderer is sacred.** No changes to `lib/vibe/grammar/` or `components/renderer/`. Reveal layer sits ABOVE.
- **No occasion-branching.** Branch on grammar dials only. (Research §2.)
- **No new CSS-in-JS lib.** Motion only.
- **CSS `var(--vibe-*)` only** for colors/spacing/motion. No literal values in the reveal layer.
- **`prefers-reduced-motion` respected.**
- **Branch:** `lt/cinematic-reveal` off `claude/bold-ride-Li5zK`. Push.

## VERIFICATION

- `npm --prefix atelier run typecheck` — 0 errors.
- `npm --prefix atelier run test` — pass + new reveal tests if you add any.
- `npm --prefix atelier run build` — clean.
- Smoke-test: open `/spine/g/<slug>` for a published peek across multiple vibes; verify the dial-driven variation lands.

## RETURN.md

Sections: what you rebased; what's new vs legacy; grammar-dial mapping table you implemented; HAND-WRITTEN PATH status (deferred or partial); skip/replay UX; any vibe combinations that produced ugly reveal output (the kind of thing taste calibration would surface); bright ideas. Honesty section.

Per PROTOCOL.md: push `lt/cinematic-reveal`, write RETURN.md.
