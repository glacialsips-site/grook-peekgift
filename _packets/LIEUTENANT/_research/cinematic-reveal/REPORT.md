# Cinematic Reveal — research + proposal

_Source: Hercules research sub (Opus 4.8). The reveal layer atop the slug renderer._

## MAJOR FINDING — there's already a working implementation

`atelier/components/recipient/cinematic-reveal.tsx` (504 lines) + `atelier/lib/reveal/phases.ts` (deterministic phase planner) + `_packets/SPINE/skills/reveal-mechanics.md` (395-line canonical spec). The existing implementation uses LEGACY `--peek-*` tokens, not the new `--vibe-*` grammar tokens. **The reveal labor is rebase + tune, not full rebuild.** Knowledge kept.

## 1. Choreography — magazine-cover-opening (default)

```
boot ──► hero-bloom ──► name ──► occasion? ──► note ──► cards-deal ──► live
        (image+wash)  (THE       (eyebrow      (word     (stagger,     (overlay
                       moment)    sub)          stream)   focal first)  fades)
```

Baseline at `motion.character=soft` (scale=1.0). Engine multiplies by `MOTION_SCALE` (`still 0.6 / soft 1.0 / lively 1.25`, identical to `css-vars.ts:64`).

| Phase | Duration | Easing | Transform / opacity |
|---|---|---|---|
| hero-bloom | 1600 ms | `--vibe-ease` (default `cubic-bezier(.22,1,.36,1)`) | bg: `scale(1.08) blur(6px) saturate(.45)` → `scale(1) blur(0) saturate(1)`; radial accent wash 0 → 1 |
| eyebrow + frame | 380 ms | eased | y +12 → 0, opacity 0 → 1 |
| name | 60ms/char (cap 1200ms; ≥600ms for short names) | per-char schedule | typewriter (§3) |
| occasion | 360ms after name + 180ms gap | eased | y +8 → 0, opacity 0 → .85, tracking `0.3em` → `--vibe-tracking-display` |
| note | 70ms/word (≤50 words) or 70ms × 7-word lines (>50); cap 2800ms | eased | per-word y +6 → 0, opacity 0 → 1 |
| cards-deal | base 140ms stagger × n (§5) | `--vibe-ease` | see §5 |
| overlay-exit | 420ms | easeOut | overlay opacity → 0, content `pointer-events: auto` |

Total: `still ~3.0s`, `soft ~5.0s`, `lively ~6.5s`. `noteVisible=false` collapses note-phase to 0. `cardCount=0` collapses cards-deal to single floor pulse (~400ms × scale).

## 2. Per-vibe variation — branch on dials, not occasion

Architectural decision: branch on the validated `Vibe` dials (composable), not occasion (sprawls). Overrides composited on baseline:

| Vibe dial | Reveal parameter |
|---|---|
| `motion.character` | uniform duration multiplier |
| `motion.easing` | `--vibe-ease` drives card-stagger + overlay exit |
| `voice.pace` | name pacing (`considered` ×1.4, `natural` ×1.0, `quick` ×0.8) |
| `voice.warmth` | note style: `restrained` → line-batched; `effusive` → word-by-word |
| `texture.motif` | optional accent over hero-bloom (`sparkle/confetti/botanical/geometric/none`) — CSS-only particle bed, lazy-loaded, never blocks reveal |
| `depth.elevation` | card-deal Y-drop (`flat`=12px, `lifted`=20px, `dramatic`=36px) |
| `shape.radius` | name-frame mask if `imageMask !== 'none'` |
| `palette.key` | `dark/dim` → vignette around hero-bloom; `light` → paper-wash |

**Princess** (triad/light/lively/bouncy + confetti + pillowy + script + effusive + quick): hero-bloom + pink-bias wash; ~24 CSS-particle pinks/golds drift 800→1800ms. Name typewriter at 48ms/char with 1.04→1.0 per-char scale (bouncy easing = sparkle). Note word-by-word at 56ms/word. Cards-deal dramatic Y-drop (36px) with 1.5° random tilt settling, bouncy ease.

**Bachelor** (complementary/dark/lively/crisp + geometric + sharp + display CAPS + measured + sharp): hero-bloom crisp, dim overlay, NO wash, geometric scan-line sweep top-to-bottom (350ms). Name typewriter at 48ms/char, NO scale bounce. Block cursor (mono); letter-spacing tightens `0.06em → -0.02em` (chyron locking in). Note line-batched. Cards-deal flat Y-drop, 90ms stagger, snap-in.

**Luxe** (monochrome/dim/still/eased + no motif + hairline + serif small-caps + considered + fuller): hero-bloom 960ms, GAP swells to 600ms (silence). Single duotone fade. Name typewriter at 84ms/char, NO cursor — letters arrive, period. Tracking `0.12em`. Note line-batched, half speed, full-bleed centered. Cards-deal: when product-set variant is `single-hero-product`, deal collapses to ONE focal over 800ms, others fade in serially (240ms apart) AFTER. Long gap between focal and rest.

## 3. The "name" moment

**Default — TYPEWRITER.** Only pattern that creates anticipation per character. Cheap. Already in legacy. Cursor color follows `--vibe-ink`. Block cursor for `display=mono`, caret for `serif/sans`, no cursor for `script`. Triggered when `nameLength ≤ 20`; above 20 falls back to fade.

**Alt 1 — STAMPED.** Single `scale(1.18) → scale(1)` + `opacity 0 → 1` + 12px ink-drop shadow bleeds + recedes. 320ms. For `voice.formality=formal` + `motion.character=still` + `display=serif` (luxe, condolence). Wax-seal feel.

**Alt 2 — HAND-WRITTEN PATH.** SVG path morph using `pathLength` keyframes. For `display=script` (princess, casual). Requires per-glyph SVG generation at publish time (cache in Supabase Storage on slug publish). v2.

(Rejected: Polaroid-of-real-name. Too literal, too occasion-bound, asset-heavy.)

Grammar dispatch:
```
voice.formality === 'formal' && motion.character === 'still'   → STAMPED
typography.displayRole === 'script' && nameLength ≤ 16         → HAND-WRITTEN PATH (when cached)
otherwise                                                       → TYPEWRITER
```

## 4. Skip / replay

**Skip — invisible-til-needed.** Whole overlay = tap-to-skip. Visible affordance: `tap to skip ›` at `opacity: 0.25`, bottom-center, in `--vibe-scale-eyebrow` size, ONLY after `phase === 'name'`. Esc/Space/Enter also fire skip. Skip does NOT slam-cut — 320ms overlay fade-out, phases-already-shown stay where they are.

PostHog: `reveal_skipped` with `{ phase_at_skip, elapsed_ms, peek_id }`. If skip rate >30% in cohort, retune.

**Replay — live ONLY in the live page, not overlay.** `↻ replay reveal` text link in page footer next to "made with peek.gift", styled `var(--vibe-ink-muted)`. NO icon button. Hidden during `phase !== 'done'`. Clicking re-mounts the reveal with same plan; `sessionStorage['peek-reveal-shown-{id}']` cleared.

Footer not header: the recipient who replays is sharing OR sentimental — both happen AFTER they've scrolled.

## 5. Cards-deal sequence

**Focal-first deal-in with logarithmic stagger.**

- **Focal card** (tagged `emphasis: 'focal'` OR first when none tagged) lands first. Y +24 → 0, opacity 0 → 1, 420ms × motion-scale. Quarter-second hold.
- **Remaining cards** stagger: `staggerMs = max(60, 280/sqrt(n)) × motion-scale`. 3 cards → 162ms each; 6 cards → 114ms; 12 cards → 81ms.
- **Visible-only animation:** above-fold cards deal in order (top-left → bottom-right); below-fold cards animate on scroll-into-view via `IntersectionObserver`. 12-card peek only animates visible 3-5 during reveal beat.
- `horizontal-scroll` variant: focal slides from left, remaining from off-screen-right with 100ms stagger.
- Per-vibe easing: `bouncy` +12px overshoot; `crisp` snap-in; `eased` smooth glide; `linear` utilitarian.

Card cap during reveal beat: 6 visible (matches existing `REVEAL_CARDS_CAP`). 7+: additional cards in DOM (SSR) at `opacity: 0`, snap on at `phase === 'done'`.

## 6. Tech — Motion (ex-Framer Motion)

**Already in deps** (`framer-motion ^12.40.0`). Imported across 10+ components. Adding a second library is dead weight.

Use `m` + `LazyMotion` for ~4.6kb client cost. Mount reveal via `<LazyMotion features={domAnimation}>`. Renderer is RSC; reveal is single `'use client'` mounted ABOVE the SSR'd `SlugRenderer`.

**Rejected:**
- Vanilla WAAPI + CSS: re-implements ~300 lines.
- GSAP: ~70kb, separate paradigm, commercial-license caveats for SplitText/MorphSVG.
- View Transitions API: shines for navigation transitions, not in-page choreographed sequences. Use VT later for curator-build → published-peek handoff.

SSR: `SlugRenderer` SSRs full page; reveal mounts client-side with `revealed=false` first paint; overlay covers cards. `prefers-reduced-motion`: reveal returns `null` immediately, signals done (already in legacy).

CSS-var bridge: reveal reads `getComputedStyle(wrapper).getPropertyValue('--vibe-motion-scale')` + `--vibe-ease`. No prop drilling.

## 7. Inspiration

1. **Apple Vision Pro product page** — layered hero rises in sequence; choreography respects perceived weight. NOT translatable: scroll-driven; product-led not person-led.
2. **Paperless Post envelope-opening** — single literal metaphor earns its keep. NOT translatable: we want vibe-driven not skin-driven; one global metaphor would flatten the moat.
3. **Invyt cinematic card reveals** — atmospheric particle layers matched to occasion. NOT translatable as-is: their library is decoupled from typography/palette; ours has to read `texture.motif`.
4. **Awwwards 2026 SOTD — fromanother.love, Floema, Capitolium** — cinematic pacing with intentional silence between beats. NOT translatable: most are scroll-narratives at desktop.
5. **Editorial print "fold" reveal** — typography as choreography. NOT translatable wholesale: they often demand large display assets; we have to land on text alone.

## 8. Risks + mitigations

- **Mobile perf during reveal.** 12-card peek + confetti on 2-year-old Android could stutter. Mitigation: visible-only per §5; motif capped at 24 elements with `will-change: transform, opacity`; `prefers-reduced-data` drops motifs.
- **Hero image weight blocking LCP.** 4MB hero kills first frame. Mitigation: `next/image` (priority + responsive sizes) + 1200×800 ceiling at publish; reveal blooms with vibe accent wash if image not loaded by hero-bloom; snaps in once arrived.
- **Audio muted by default.** Tap-to-enter affordance. NOT v1 scope.
- **Low-light visibility.** Contrast enforced by `derivePalette` (≥4.5 AA, ≥3.0 accent). Overlay accents `hsl(var(--vibe-accent) / 0.18)`, never raw colors.
- **Tab-backgrounded mid-reveal.** `visibilitychange` pause/resume (in legacy). Keep.
- **Replay-link drift in i18n.** `↻` icon-glyph alongside verb so non-English readers parse.
- **Skip as escape from broken reveal.** 100% skip rate = broken not boring. Sentry breadcrumb on `reveal_skipped` with phase + elapsed.

---

## Relevant paths

- `atelier/lib/vibe/grammar/grammar.ts`
- `atelier/lib/vibe/grammar/css-vars.ts`
- `atelier/lib/vibe/grammar/fixtures.ts`
- `atelier/components/renderer/slug-renderer.tsx`
- `atelier/components/renderer/sections.tsx`
- `atelier/components/recipient/cinematic-reveal.tsx` (legacy --peek- impl, rebase target)
- `atelier/lib/reveal/phases.ts` (deterministic planner, keep)
- `_packets/SPINE/skills/reveal-mechanics.md` (canonical spec, port to --vibe-)

Sources:
- Motion docs (motion.dev), bundle-size guide
- LogRocket — Best React Animation Libraries 2026
- MDN View Transitions API
- Apple Vision Pro product page
- CSS-Tricks — Recreating Apple's Vision Pro Animation in CSS
- Paperless Post; Invyt; Awwwards SOTD
