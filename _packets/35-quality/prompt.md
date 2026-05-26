# Packet 35 — Quality pass (a11y + SEO + mobile + real palette extraction)

- **Worker:** cc-on-web
- **Branch:** `claude/packet-35-quality`
- **Depends on (sequencing):** `atelier-integration`
- **Imports from siblings:** none new
- **Validation:** `cd atelier && npm install && npm run build` green. Manual: Lighthouse audit on `/`, `/sign-up`, `/build/[peekId]` (signed in), `/g/<slug>` (published) — all ≥90 a11y. Robots.txt + sitemap reachable. Manual on a real iPhone: slide-up sheet drags smoothly, viewport doesn't double-scroll.
- **Target paths:** `atelier/app/robots.ts` (new), `atelier/app/sitemap.ts` (new), `atelier/app/layout.tsx` (modify — viewport, theme-color, etc.), `atelier/components/build/preview-sheet.tsx` (mobile fixes), `atelier/components/recipient/**` (a11y pass), `atelier/components/build/**` (a11y pass), `atelier/components/auth/**` (a11y pass — landing after packet 28), `atelier/lib/vibe/extract-palette.ts` (REPLACE the JPEG byte-histogram with real decoding).

## Context

Five quality buckets:

1. **A11y.** Zero accessibility audit. Likely missing aria labels, no keyboard nav, focus management broken on modal/sheet open/close, images without alt, decorative icons not hidden, screen-reader live regions missing for chat streaming.
2. **SEO.** No `robots.txt`, no sitemap, no structured data (schema.org), thin metadata, no `og:image` defaults on `/`, no Twitter card defaults.
3. **Mobile reality.** Slide-up sheet built from scratch with framer-motion in packet 20 was never tested on real iOS Safari. Likely viewport-height issues (`100vh` vs `100dvh`), double-scroll, momentum scrolling broken inside the sheet, touch targets too small in spots.
4. **Vibe palette extraction broken for JPEGs.** Packet 21's `lib/vibe/extract-palette.ts` has a PNG decoder + JPEG byte-histogram fallback. The JPEG fallback returns near-random colors (worker flagged). Hero images are almost always JPEG. Need real JPEG decoding.
5. **Touch targets + typography.** Buttons should be ≥44×44px on mobile. Body text ≥16px on mobile (otherwise iOS Safari zooms inputs).

## Deliver

### A11y pass

For every interactive component under `components/`, `app/build/`, `app/g/`, `app/sign-in/`, `app/sign-up/`:

- Every `<button>` without text needs `aria-label`.
- Every `<input>` needs an associated `<Label htmlFor>` (we have `<Label>` from shadcn — use it everywhere).
- Every decorative SVG/image gets `aria-hidden="true"`.
- Every meaningful image (hero, card images) gets a real `alt`.
- Modal/sheet open: focus moves into the modal; on close: focus returns to the trigger. Use Radix `<Dialog>` where applicable (it handles this) — the custom slide-up sheet in packet 20 doesn't, so wire `focus-trap-react`-equivalent logic with refs (no deps — manual focus on mount, `onKeyDown` for `Escape`, restore focus on close).
- Chat pane streaming: wrap the streaming-text region in `<div aria-live="polite" aria-atomic="false">` so screen readers announce updates.
- Form errors: associate via `aria-describedby` and announce via `<div role="alert" aria-live="assertive">`.
- Keyboard nav: every interactive thing reachable via Tab. Skip links from header to main content on `/` and `/build`.
- Color contrast: audit shadcn theme tokens for WCAG AA on all defined `bg`/`fg` pairs. If `--muted-foreground` on `--background` is <4.5:1, bump.
- `lang` attribute on `<html>` already set to `en` (packet 01). Confirm. For per-Peek pages where curator's notes might be in a different language, no auto-detect for now (note as follow-up).

### Mobile fixes

- `atelier/app/layout.tsx`: viewport `<meta>`: `width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content`. Add `theme-color` matching the theme.
- Replace every `h-screen` / `min-h-screen` / `100vh` with `100svh` (small viewport) or `100dvh` (dynamic). Especially in `<BuildSurface>` and `<RecipientView>`.
- `components/build/preview-sheet.tsx`:
  - Sheet container uses `position: fixed; inset: 0; height: 100dvh` so iOS URL-bar collapse doesn't bug it.
  - Drag handle is min 44×8px with `touch-action: none` while dragging, `pan-y` otherwise.
  - Body of the sheet uses `overflow-y: auto; overscroll-behavior: contain` to prevent body-scroll leak.
  - When sheet is open: `document.body.style.overflow = 'hidden'` on open, restore on close (or use Radix Dialog which does this for free — consider migrating).
  - On iOS Safari, `input` focus inside the sheet causes the keyboard to lift it; ensure `interactive-widget=resizes-content` in viewport meta + `100dvh` handle this.
- All buttons across the UI: min 44px tap target. Audit and add `min-h-11 min-w-11` (Tailwind v4) to icon-only buttons.
- Inputs: `font-size: 16px` minimum on mobile to prevent iOS Safari input zoom-in.

### SEO

`atelier/app/robots.ts` (new):

```ts
import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/build/', '/sign-in/', '/sign-up/', '/sso-callback'] },
    ],
    sitemap: `${env.APP_URL}/sitemap.xml`,
    host: env.APP_URL,
  };
}
```

`atelier/app/sitemap.ts` (new):

```ts
import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    { url: env.APP_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    // Published Peek pages are intentionally excluded — they're personal and not for search engines.
    // If we add /creators or /about marketing pages later, they go here.
  ];
}
```

`app/layout.tsx`: extend `metadata` export with:
- `openGraph.images`: a default 1200x630 image at `/og-default.png` (worker generates a simple branded one and commits to `public/og-default.png` — Tailwind-colored peek.gift wordmark)
- `twitter.card`, `twitter.images`
- `metadataBase` set to `new URL(env.APP_URL)` so relative URLs resolve in meta tags
- `manifest`: pointer to `public/manifest.webmanifest` (PWA basics)
- `themeColor`

Add `public/manifest.webmanifest` with name, short_name, theme_color, background_color, icons (use the same `public/og-default.png` or a 512x512 square version). This bootstraps later PWA work cheaply.

Structured data (JSON-LD) for the landing page: `Organization` type with name peek.gift, URL, logo. Skip per-Peek pages (those are intentionally not indexed).

### Palette extractor: do it right

`atelier/lib/vibe/extract-palette.ts` (REPLACE):

The current JPEG-byte-histogram approach is fundamentally wrong (it counts byte values, not pixel colors). Real options without adding deps:

Best in-runtime option for Node 22: `Image` constructor via `node:` built-ins, or use `@vercel/og`'s `resvg-js` internals.

Pragmatic path: call **fal.ai** (already keyed) with a small `palette-extract` model OR use the **Replicate API** with a free palette extraction model. OR use a tiny pure-JS approach: download image, run through `canvas` via `node-canvas` (requires native build — avoid) — no good native-free option.

Simpler: **add a small dep** that does this right. Worker should propose ONE of:
- `colorthief` (pure JS, works on PNG/JPEG via `jpeg-js` + `pngjs` — both already pulled transitively probably)
- `node-vibrant` (more sophisticated palettes)

If a dep needs adding: surface in NOTES.md, orchestrator approves in a small deps-bump packet.

Alternative if no dep is wanted: pipe through `@vercel/og`'s `ImageResponse` with a callback... no, that's overkill.

**Recommendation: pure-JS via `colorthief` package (~5KB). Install + replace `extractPalette` with a 30-line implementation that fetches the image, decodes (via the lib's bundled jpeg/png decoders), runs k-means, picks colors by saturation + luminance per `bg/surface/ink/accent/accent2` slots, returns hex strings.**

Surface "needs `colorthief` dep" in NOTES.md if you take that path; orchestrator runs a small deps-bump.

If you find a built-in way (Node 22 image decoding) that didn't exist when packet 21 was written, take it — but verify the output is real colors, not byte histograms.

### Touch + typography sweep

- Audit `components/build/chat-pane.tsx`, `components/recipient/*-card.tsx`, `components/auth/*` for input `font-size`. Set to `text-base` (16px) at minimum on mobile.
- Buttons: `min-h-11` (44px) on every interactive element.
- Spacing: stack vertical on mobile, gaps generous (≥12px between cards, ≥8px between form elements).

### Reduced motion

Add to `app/globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Plus: `useReducedMotion()` from framer-motion in `cinematic-reveal.tsx` — if reduced, skip the typewriter and card-stagger, render instantly.

## Constraints

- TS strict.
- Lighthouse a11y ≥90 on all target pages after this lands.
- Real mobile testing on an iPhone is the user's responsibility — but the patterns we ship should be the well-known correct ones (`100dvh`, `viewport-fit=cover`, `touch-action`, `overscroll-behavior`).
- Don't modify `package.json` UNLESS you take the colorthief path — in which case stop, write the dep into NOTES.md, and surface it; do NOT add deps unilaterally.
- Use subagents: one for a11y pass (large), one for SEO/metadata, one for mobile/sheet, one for palette extractor.

## Reply format

Branch `claude/packet-35-quality`, commit `packet 35: quality pass — a11y + SEO + mobile + palette`, push. NOTES.md with: a11y findings + fixes count; palette extractor approach taken; deps requested (if any); SEO routes added.
