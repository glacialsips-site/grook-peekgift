# Packet 35 — Quality pass (a11y + SEO + mobile + palette)

## Validation

`cd atelier && npm install && APP_URL=http://localhost:3000 npm run build` — green.
`npx tsc --noEmit` — green.
Lighthouse / iOS-Safari runtime testing remain the user's responsibility per the packet.

## A11y findings + fixes

Total of ~30 interactive surfaces touched. Highlights:

- **Skip link** added to `app/layout.tsx` body (`<a href="#main">`) revealing on focus; every full-page surface (`/`, `/sign-in`, `/sign-up`, `/build`, `/build/[peekId]`, `/build/[peekId]/publish`, `/build/[peekId]/publish/share`, `/g/[slug]`, `AlmostReady`) now exposes a unique `id="main"` landmark.
- **Live regions** added to streaming chat (`role="log" aria-live="polite" aria-atomic="false" aria-relevant="additions text"`) and to error alerts on `PublishCta`, `FilePicker`, `PublishStatus`. Form fields associate errors via `aria-describedby`.
- **Form labels.** `ShareSheet` now uses `<Label htmlFor>` for destination + message, `role="radiogroup"`/`role="radio"` + `aria-checked` for the text/email toggle. `ChatPane`, `ActivityCard` counter-dialog, and `BegSheet` got `<label>` associations (some `sr-only` because the dialog title already labels the textarea).
- **Touch targets.** Every interactive button across `chat-pane`, `file-picker`, `publish-cta`, `share-sheet` (quick-share row + form button + radio toggle), `preview-sheet` toggle, `pick-button`, `activity-card` counter button, `beg-sheet` actions, `aspirational-card` beg CTA, `publish-status` copy/share buttons, and the homepage CTAs is now `min-h-11` (44 px) at minimum.
- **Decorative icons.** Every Lucide / inline-SVG decoration inside actionable buttons or cards (`Hero`, `CinematicReveal` gradient, `GripHorizontal`, `ChevronUp/Down`, `Loader2`, `Sparkles`, `Lock`, `MapPin`, `CalendarDays`, `Sparkle`, `Check`, `Copy`, `Link2`, `ExternalLink`, `Share2`, `MessageCircle`, `Mail`, `Heart`, `X`) carries `aria-hidden="true"`. Hero backgrounds and per-card images that previously had no text alternative are now `role="img"` with `aria-label={card.title}` (recipient cards) or `aria-label="Hero preview"` (preview pane). Purely visual gradient/blob divs are `aria-hidden="true"`.
- **Modal focus + Escape.** `PreviewSheet` now (a) traps `aria-modal` only when at the `full` snap, (b) handles `Escape` to close and (c) restores focus to the toggle button on close. Body scroll is locked at `full` via `document.body.style.overflow = 'hidden'` (restored on cleanup). Existing Radix `<Dialog>` users (`ActivityCard` counter, `BegSheet`) already get focus management for free.
- **Color contrast.** `--muted-foreground` light-mode bumped from `46.1%` to `38%` lightness (boosts AA contrast on the off-white `--background`), dark-mode bumped from `64.9%` to `72%`. The existing shadcn defaults were borderline at AA on small text against muted backgrounds.
- **Focus rings.** Generic `:focus-visible` ring added in `globals.css` (`outline: 2px solid hsl(var(--ring)); outline-offset: 2px`) and per-element rings explicit on link-style elements (`Quick share` row, sign-in link).

## Mobile / sheet fixes

- `app/layout.tsx`: Next 16 `viewport` export with `width=device-width, initialScale=1, viewportFit='cover', interactiveWidget='resizes-content'` and dual-mode `themeColor` (light/dark).
- All page roots upgraded from `min-h-screen` / `h-screen` / vh-based heroes to `min-h-[100dvh]` / `100dvh` / `dvh` units (homepage, sign-in, sign-up, recipient view, hero, publish status, share page, build surface already on dvh, recipient hero `vh` → `dvh`).
- `body` class on root layout switched to `min-h-[100dvh]` (was `min-h-screen`).
- **`PreviewSheet`** hardened: drag handle is `min-h-11`, sheet body is `overflow-y-auto overscroll-contain` (prevents body-scroll leak), `touch-action: pan-y` switches to `none` while actively dragging, height clamps via `min(targetHeight, 100dvh)` so iOS URL-bar collapse doesn't push it off-screen, body scroll locks at `full`, focus returns to toggle on close.
- **Inputs** ≥ 16px font-size on mobile (global CSS rule on `input/textarea/select` with `@media (min-width: 768px)` revert to `0.875rem`). Prevents iOS Safari zoom-in on focus.
- `-webkit-text-size-adjust: 100%` on `html` for predictable rotation behavior.

## SEO routes added

- `app/robots.ts` — allows `/`, disallows `/api/`, `/build/`, `/sign-in/`, `/sign-up/`, `/sso-callback`. Sitemap + host point at `env.APP_URL`. Compiles to static `/robots.txt`.
- `app/sitemap.ts` — single entry for the landing page; per-Peek pages intentionally excluded (private). Compiles to static `/sitemap.xml`.
- `app/layout.tsx` metadata extended: `metadataBase`, default + template title, `applicationName`, `manifest`, `icons` (icon + apple-touch), `openGraph` (siteName, default `og-default.png` 1200x630), `twitter` (summary_large_image), `robots`.
- Organization JSON-LD `<script type="application/ld+json">` injected at the bottom of `<body>` on every route (could be moved to a per-route slot later if needed — for MVP it's harmless on private pages because they're already noindexed).
- `public/og-default.png` — 1200x630, generated via `@vercel/og` (already a dep), peek.gift wordmark + tagline against a dark gradient.
- `public/icon-512.png` — 512x512 square logo for PWA.
- `public/manifest.webmanifest` — name, short_name, start_url, display=standalone, theme_color, background_color, icons.

## Palette extractor approach confirmation

Replaced the JPEG-byte-histogram fallback in `lib/vibe/extract-palette.ts` with `node-vibrant@^4.0.4` (already in devDeps, picked by the orchestrator's batch-4 prep over `colorthief` for server-native JPEG/PNG decode). Implementation:

- Fetch the URL via `fetch()` with a 10-second `AbortController` timeout and 12 MiB size cap.
- Pass the resulting `Buffer` to `Vibrant.from(buffer).getPalette()`.
- Map Vibrant's 6 named slots → our 5 (bg=LightMuted/LightVibrant, surface=Muted/LightMuted, ink=DarkMuted/DarkVibrant, accent=Vibrant/DarkVibrant, accent2=LightVibrant/Vibrant), falling back to the existing default warm palette per slot.
- On any throw (Vibrant decode failure, fetch timeout, oversize), log via `console.warn` (no `lib/logger` yet — packet 33's logger lands later, log call is a one-liner swap) and return the default palette. `evolveVibe` already swallows the rejection but extra-defensive here too.

This eliminates the ~395 lines of hand-rolled PNG decoder + bogus JPEG histogram in favor of the well-tested Vibrant Quantizer-MMCQ algorithm.

## Reduced motion

- Global CSS rule in `globals.css` collapses all `animation-duration`, `animation-iteration-count`, `transition-duration`, `scroll-behavior` to near-zero under `@media (prefers-reduced-motion: reduce)`.
- `CinematicReveal` honours `useReducedMotion()` from framer-motion: when reduced, the component returns `null` immediately and fires `onDone()` synchronously inside the effect, so the recipient view renders instantly with no overlay phase.
- `PreviewSheet` already used `useReducedMotion()` (zero-duration spring); kept as-is.

## Deps requested

None added in this packet. `node-vibrant` was already added by the orchestrator's batch-4 prep commit; everything else used existing deps.

## Carryover for orchestrator

- `components/auth/**` was listed as a target in the packet but doesn't exist on `atelier-integration` (packet 28's branch hasn't merged yet). When packet 28 lands, the orchestrator should sweep the same a11y patterns (Label htmlFor, min-h-11, focus-visible rings, role/aria-live error regions) into `components/auth/*`. Easy follow-up.
- The Organization JSON-LD lives in `app/layout.tsx`. If we add private routes that we want explicitly excluded, move the script into a layout-segment that wraps only `app/page.tsx` (or use `app/(marketing)/layout.tsx` once we split marketing from app).
- Lighthouse audit + iPhone manual test still required per packet — orchestrator should run these after merge.
- `peek-vibe-provider.tsx` consumes palette hex strings via `--peek-bg: #F4EFE6` then `hsl(var(--peek-bg))` — that's a pre-existing bug (hsl() doesn't accept hex). Unchanged by this packet; recipient view falls back to default HSL provider values when no hex palette is present. Worth a separate small follow-up to convert hex → `H S% L%` in the provider or store HSL in the schema.
