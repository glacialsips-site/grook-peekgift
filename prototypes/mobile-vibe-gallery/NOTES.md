# Mobile vibe gallery (40 presets)

Honest mobile evidence of what the grammar produces, with **self-hosted Google
Fonts** so display/script/serif faces actually load (the sandbox can't hit the
Google Fonts CDN at render time — that broke the prior 7-preset demos).

## What's inside

```
fonts/                       — 23 woff2 files (latin + latin-ext for 10 families)
app-fonts.css                — combined @font-face declarations w/ ./fonts/ paths
fetch-fonts.mjs              — fetcher (idempotent — re-run if a face is missing)
render-gallery.tsx           — SSR renderer (tsx; uses atelier renderer + grammar)
snap.mjs                     — Playwright Chromium screenshotter @ 375×812 mobile
renders/<key>.html           — 40 standalone mobile pages (open one on a phone)
screenshots/<key>.png        — 40 mobile PNGs (750×N @ 2x retina)
index.html                   — live iframe gallery (click any tile to open)
screenshots-index.html       — fast PNG-only gallery (no fonts re-fetch)
manifest.json                — audit trail: variant picks + contrast per preset
```

## Self-hosted fonts (10 families covering all 5 FontRole stacks)

| Role     | Primary (downloaded) | Stack also names (system fallback) |
| -------- | -------------------- | ---------------------------------- |
| serif    | Fraunces, Playfair Display | Georgia, serif |
| sans     | Inter | system-ui, sans-serif |
| display  | Bowlby One, Anton, Abril Fatface | Impact, sans-serif |
| mono     | JetBrains Mono, IBM Plex Mono | ui-monospace, monospace |
| script   | Caveat, Dancing Script | cursive |

All weights the renderer actually requests (400/500/600/700, plus opsz axis
for Fraunces) are included.

## Running locally

```
# 1. Download fonts (idempotent)
cd prototypes/mobile-vibe-gallery && node fetch-fonts.mjs

# 2. Render all 40 SSR pages (requires atelier/node_modules — symlinked)
cd ../../atelier && NODE_PATH=/path/to/atelier/node_modules \
  ./node_modules/.bin/tsx ../prototypes/mobile-vibe-gallery/render-gallery.tsx

# 3. Capture mobile screenshots (Playwright Chromium @ 375×812)
cd ../prototypes/mobile-vibe-gallery && node snap.mjs
```

## Known atelier-side issues surfaced by this gallery

Two real bugs in the renderer CSS were visible only at 375px viewport — the
desktop demos hid them. Both are PATCHED here in `MOBILE_OVERRIDES` (a `<style>`
block injected per-render); the real fix belongs in
`atelier/components/renderer/renderer.module.css`:

1. **Display headings don't wrap.** `.heroTitle`, `.sectionHeading`, and
   `.cardTitle` lack `overflow-wrap`/`hyphens`, so any preset with
   `scaleContrast ≥ 1.85` (concrete-poet, neon-club, concert-poster,
   arcade-cabinet, racing-stripe, soft-brutalist) renders headlines that
   exceed 375px and clip. Fix: add `overflow-wrap: anywhere; hyphens: auto`
   to those three selectors.
2. **`--vibe-scale-display` resolves too large on narrow viewports.** The
   `clamp(..., 4vw, 6rem)` ceiling assumes a desktop column. At 375px the
   minimum side wins and the display still tries 5.7rem (91px). Recommend
   wrapping the final `clamp` arg with `min(..., 14vw)` so the scale never
   exceeds ~14% of the viewport width.

A third visual issue (not strictly a bug, but worth noting): card placeholder
media renders as a flat surface tile, which reads as "empty" rather than
"image goes here". The overlay tints the placeholder with a 45deg hatch so
each card visibly hosts a media region. Real product images will fill this on
production peeks.

## Layout-variant pick policy

The gallery uses an intent-driven picker, not a random one. Per family:

| family                  | hero          | The Drop (3 cards)     | The Kit (2)            |
| ----------------------- | ------------- | ---------------------- | ---------------------- |
| editorial-quiet         | minimal-mark  | editorial-full-bleed / list | list / editorial-full-bleed |
| brutalist-contemporary  | centered-type | tight-grid / editorial | editorial / list      |
| bold-loud               | centered-type | horizontal-scroll / editorial | list / editorial |
| playful-bright          | stacked-card  | horizontal-scroll / tight-grid | editorial-full-bleed |
| romantic-sentimental    | stacked-card  | editorial-full-bleed / tight-grid | list / editorial |
| cozy-domestic           | stacked-card  | tight-grid / editorial / list | editorial-full-bleed / list |
| cosmic-cinematic        | centered-type | editorial-full-bleed / horizontal | list / editorial |

Per-key overrides handle the special cases (zine-punk → editorial-full-bleed
hero ad, chalk-line → list, sticker-pack → horizontal rail, etc.). See
`pickDropVariant` / `pickKitVariant` in `render-gallery.tsx`.
