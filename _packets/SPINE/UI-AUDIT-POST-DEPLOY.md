# UI audit — post-deploy `17cd407`

**Deploy verified**: site `peek-gift-vnext` (id `932646db-e8be-42f1-a94b-a57bb733e308`),
deploy `6a17ac1928ae440008863dd3`, state **ready**, branch `atelier-integration`,
commit_ref `17cd4071a52c1228381b2fde633c1b0fad49d2b8`, published 2026-05-28 02:45:58Z.
Driven via Playwright (chromium 1223) against `https://vnext.peek.gift`,
viewports 375x812 + 1280x800. 16 screenshots in `atelier/tests/e2e/screenshots/post-batch-deploy/`
plus `report.json` (full status / title / body / console errors) and `api-chat-sse.txt`.

## Step-by-step

- **Landing `/`** (`landing--375x812.png`, `landing--1280x800.png`) — 200 OK,
  2,325 chars body. Strong: hero "Gift giving, **made real.**" with red accent,
  three-step block, "Themed to the human" demo with three side-by-side cards
  in distinct vibes (pink princess, dark "50th send-off", warm tan "For Pop, at 70"),
  "$12 to publish" pricing footer. Works.

- **/build (anon)** (`build-anon--*.png`) — **500**. Error fallback renders
  cleanly: "Build session hiccup. Your draft is saved — retry in a beat" with
  ref `3377218611`. Comes from `app/build/error.tsx` (`build_segment_error`).
  Parallel sub is already fixing per packet instructions.

- **/sign-in** (`signin--*.png`) — 200 OK. Clerk custom form fully styled:
  "peek.gift / Make gift giving real again. / Welcome back". Continue-with-Google
  button + email field + "New here? Create an account". Looks production-ready.

- **/sign-up** (`signup--*.png`) — 200 OK. First/last name + email + password
  + Google SSO, "Make it real" copy. Clean.

- **/g/[slug]** (4 distinct-vibe drafts: `c248cd434497` editorial dark,
  `bf54d5549a2f` playful hoops, `52c72d59c026` whimsical princess,
  `bdd1eaf056a2` whimsical toy) — **all 500**. Generic non-vibe error page:
  "We couldn't open this Peek. The link works, but something hiccuped..."
  ref `3668081153` from `app/g/[slug]/error.tsx` (`recipient_segment_error`).
  Title metadata renders correctly per peek ("A Peek for Dorothy — 44th birthday"
  etc.) so the route loads, but the recipient view server component throws.
  **Cannot verify whether vibe engine drives distinct visuals on live peeks
  — the page itself errors out before any vibe-themed shell renders.**

- **/api/chat POST** (`api-chat-sse.txt`) — endpoint reachable. Without
  `origin: https://vnext.peek.gift` returns 403 `forbidden_origin` (CSRF guard
  working). With origin + invalid schema returns 400 with field-level Zod errors.
  With origin + valid schema + draft peek owned by someone else: 403 `forbidden`
  (curator-only gate). SSE stream not exercised end-to-end because creating a
  fresh peek requires Clerk-authenticated session.

## Top issues

1. **`/g/[slug]` server component throws for every draft** — same digest
   `3668081153` for all four distinct-vibe slugs. Blocks the entire recipient
   flow. Likely a regression in `RecipientView` or one of its data helpers
   (`toPeek/toCard/toVariantGroup`) — recommend follow-up packet to inspect
   Netlify function logs for the digest's stack and fix.
2. **`/build` 500 for anon** — known, parallel sub fixing.
3. **Vibe engine output unverifiable on live peeks** because of #1. The
   landing-demo cards prove the vibe engine *can* render distinct visuals
   client-side; needs the recipient route fixed before we can confirm
   end-to-end.

## Suggested follow-up

- Add a published-peek seed in `peek_v2` so future verify runs hit a real
  recipient surface.
- Surface the error digest's stack via Netlify function logs (Netlify dashboard
  > Functions > `___netlify-server-handler`).
