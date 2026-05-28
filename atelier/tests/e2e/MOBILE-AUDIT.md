# Mobile-first audit — peek.gift atelier

Driver: Playwright + Chromium, headless. Viewports tested:
- 375x812 (iPhone SE / 12 mini class)
- 414x896 (iPhone Pro Max class)

`deviceScaleFactor=2, isMobile=true, hasTouch=true` for all checks.

Spec: `atelier/tests/e2e/mobile-audit.spec.ts`
Run: `npm run test:e2e -- tests/e2e/mobile-audit.spec.ts --project=chromium`
Findings (machine-readable): `screenshots/mobile/findings.json`

## Fixtures used

The build surface and recipient routes need a Supabase round-trip in production. To screenshot them without a DB, two dev-only fixture routes were added:

- `/mobile-audit/build` — mounts `<BuildSurface>` with a hard-coded `PeekDraft`
- `/mobile-audit/g` — mounts `<RecipientView>` with a hard-coded published Peek

Both routes guard against production with `process.env.NODE_ENV === 'production' && notFound()`. They are also listed under `/styles-test`-style allowlist in `proxy.ts`. They should not ship — flag in code review if they leak.

## Routes covered

| Route | Why |
|---|---|
| `/` | landing |
| `/sign-in` | custom Clerk sign-in |
| `/sign-up` | custom Clerk sign-up |
| `/build` | anon-or-redirect entry (errored due to missing Supabase URL in this audit env — screenshot captured the error page) |
| `/mobile-audit/build` | proxy for `/build/<peekId>` (build surface) |
| `/mobile-audit/g` | proxy for `/g/<slug>` (recipient reveal) |

## Findings (initial run)

| Route | Viewport | Kind | Detail | Resolution |
|---|---|---|---|---|
| `/mobile-audit/build` | both | layout | `<BuildSurface>` opened with the `<PreviewSheet>` at the **half** snap on first paint, covering the chat input. Curators landing on mobile could not see/tap the textarea. | **FIXED**: default `snap='closed'` so the chat input is reachable on landing; tap or upward-swipe opens the sheet to half then full. Matches BUGS.md + CONCEPT-V2.md §2 ("chat first, swipe up to expand preview"). |
| `/`, `/sign-in`, `/sign-up` | both | tap target | inline footer links ("Sign in", "Create an account", "Already have an account? Sign in") rendered at 18px tall — under the 44px iOS minimum. | **FIXED**: added `inline-block min-h-11 py-2.5` to the three Link nodes so they render as 44+ px tappable. |
| `/build`, `/mobile-audit/build`, `/mobile-audit/g` (error fallbacks) | both | tap target | `<Button>` defaults to `h-10` (40px rendered ~43px); used by error pages where the buttons are the primary actions. | **FIXED**: bumped error-page buttons (`app/error.tsx`, `app/build/error.tsx`, `app/g/[slug]/error.tsx`, `app/global-error.tsx`) to `size="lg"` / `minHeight: 44`. |
| all | both | false positive | sr-only skip-to-content link reported as 1x1. Tailwind's `sr-only` is intentional (visually-hidden, expands on focus). | Audit script updated to skip absolute-positioned `clip` / `clipPath: inset(50%)` nodes — no longer flagged. |

After fixes: `findings.json` returns `[]`. All 13 audit tests pass.

## Specifically verified

1. **Slide-up preview sheet on mobile** (BUGS.md + CONCEPT-V2.md §2):
   - Sheet visible with grip handle at all snaps. `role="dialog"`, `aria-modal` set when full.
   - Snap progression: closed (PEEK_HEIGHT) → half (55vh) → full (92vh). Cycle button rotates through.
   - Drag/swipe (framer-motion `drag="y"`) wired with directional thresholds (`onDragEnd` handles flings).
   - `prefers-reduced-motion` honored (`useReducedMotion` from framer-motion).
   - **NEW**: starts at `closed` so chat is the primary surface on first paint, matching the documented intent.

2. **iOS Safari URL bar not covering chat input**:
   - Main wrapper sized as `h-[100dvh]` (dynamic viewport height — accounts for URL bar collapse).
   - Form has `padding-bottom: calc(env(safe-area-inset-bottom) + var(--chat-bottom-offset, 92px))` on mobile — the offset reserves space for the closed sheet handle so input clears it.
   - With sheet defaulting to `closed`, the chat input sits above the sheet handle and `env(safe-area-inset-bottom)` keeps it clear of iOS home indicator.

3. **No horizontal scroll** at either viewport on any of the six surfaces.

## Deferred to follow-up

None for this packet — every finding from the initial run was either fixed in this branch or reclassified as a false positive.

Two adjacent issues observed but **out of scope** for this layout-only sweep:

- `app/build/page.tsx` requires Supabase server-side env even when serving an unauthenticated redirect — it errors instead of redirecting cleanly. Not a layout bug; backend/route concern.
- The recipient cinematic-reveal overlay text briefly overlaps the hero/note during the in-animation. Designed behavior (overlay is `pointer-events-none` during animation and fades on `revealed`). If desired the overlay can be moved to a `fixed inset-0 z-50` portal, but that's a redesign call.

## Screenshots

Path | Notes
---|---
`screenshots/mobile/landing--375x812.png` | hero CTAs visible, single-column
`screenshots/mobile/landing--414x896.png` | same
`screenshots/mobile/sign-in--375x812.png` | form fits, footer link tap-friendly post-fix
`screenshots/mobile/sign-in--414x896.png` | same
`screenshots/mobile/sign-up--375x812.png` | form fits, multi-field, footer link tap-friendly
`screenshots/mobile/sign-up--414x896.png` | same
`screenshots/mobile/build-redirect--375x812.png` | error page (Supabase missing in audit env); buttons tap-friendly post-fix
`screenshots/mobile/build-redirect--414x896.png` | same
`screenshots/mobile/build-surface--375x812.png` | **post-fix**: chat input visible, sheet closed at bottom
`screenshots/mobile/build-surface--414x896.png` | same
`screenshots/mobile/recipient--375x812.png` | cinematic overlay during reveal, card deck below
`screenshots/mobile/recipient--414x896.png` | same
`screenshots/mobile/build--sheet-half.png` | sheet at half snap (covers ~55vh, mid expansion)
`screenshots/mobile/build--sheet-full.png` | sheet at full snap (covers ~92vh, immersive preview)
`screenshots/mobile/build--sheet-closed.png` | sheet collapsed to ~84px handle — chat fully accessible
