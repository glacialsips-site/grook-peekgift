# WAKEUP — read this first, then keep building (don't restart)

You (a fresh context) just continued an epic build. **It's real and pushed.** Do NOT re-derive or
rebuild — read, then keep going on the **main page**.

## Where you are
- **Branch: `claude/gallant-planck-pu51x`** (push ONLY here, with `-u origin`). Repo
  `glacialsips-site/grook-peekgift`. Everything below is committed + pushed.
- **The main page works** and is the unprecedented thing: `apps/web` — a single chat-over-live-preview
  studio. Multimodal input (text · photo/camera→Opus vision · mic→speech) → the curator turn
  (Opus 4.8, every tool routed through the core maker-checker) → **SSE streaming** so the page builds
  itself in real time → persists → recipient page `/g/[slug]` with server-validated picks.
- **`packages/core`** is the durable spine: `decide/apply` maker-checker, the lifted `PeekIR`,
  pure `render()`, the token system (+scenes/frames/contrast), the selection engine, typed ports.
  **53 tests green.**

## Read in this order (don't read more than you need)
1. `_packets/SPINE/PROGRESS.md` — the canonical current state + what's next.
2. `_packets/SPINE/GROUND-TRUTH.md` — live service status + IDs (Supabase `ewqpujqerdnrkjqlpobo`,
   Stripe price `price_1TapZICEKPUsVee1ddG4n14M`, Netlify site `932646db-…`).
3. `_packets/SPINE/DEPLOY.md` — the one manual Netlify step to ship the studio (connector offline).
4. `/CLAUDE.md` (Frank's operating contract) + `recon-assets/PEEK_GIFT_BUILD_BRIEF.md` (the spec) +
   `peek-jumpoff/reference/SHELL_SPEC.md` (renderer caliber bar — for the remaining polish).

## Verified LIVE this run (with Frank's key): the curator turn (text), photo→page (vision), and
streaming (text deltas + incremental page snapshots). The maker-checker rejected a malformed AI op
in production. Build (core + web) green.

## Keys / env reality (important)
- The Anthropic key was in `apps/web/.env.local`, which is **gitignored → NOT in this fresh container.**
  To re-verify the live turn in-session, **ask Frank to re-drop `ANTHROPIC_API_KEY`** (he will). The
  Netlify deploy already holds ANTHROPIC/SUPABASE/STRIPE — so on deploy it's fully live regardless.
- First thing after cloning: `pnpm install --filter @peek/web...` then `pnpm --filter @peek/web build`.
  Core alone: `cd packages/core && pnpm install --ignore-workspace && pnpm test`. Toolchain: node 22,
  pnpm 10.33. Background dev servers from last run are GONE (ephemeral) — restart if you need one.

## Frank's CURRENT directives (override older docs)
- **The main page is the priority** — "balls to the wall on the main page until I tell you to stop."
- **NO embedded checkout** — checkout becomes a later, full-custom build (the embedded UI was removed;
  `/api/publish` + webhook remain as harmless backend).
- **No separate landing page for now** — Frank has a new idea, TBD.
- **Deploy: no rush** — whenever; it's prepped (DEPLOY.md), one manual Netlify toggle.
- Build LIVE (no mock). Don't nag about secret-key hygiene. Be terse; chatting costs ~50× working.
- Commit footer: `https://claude.ai/code/session_012znMcf5kwxyUUGPCsSZM2Q`. Never put a model id in commits.

## Next (finish the main page)
- Renderer toward full SHELL_SPEC caliber: the bottom **sheet** (tap card → detail → claim), richer
  per-kind sections (tiers/stubs/tracklist/courses), a themed **nav**, the "pinged section" change pulse.
  (Done already: scenes, frames, scroll-reveal+hover motion, Google fonts loader, AA-contrast,
  hero variants, claim panel, rule-aware giftgrid, itinerary.)
- Then: deploy (DEPLOY.md), full-custom checkout, notify-the-creator (needs the auth bookend for an
  email), Frank's new landing idea.

## Practical gotchas
- Edits to the same file in one message can race — prefer one Write for big structural changes.
- The headless screenshot tool (chromium_headless_shell) does NOT paint webfonts — captures show
  fallback fonts; real browsers (and deploy) load them. Don't chase font screenshots.
- `apps/web/components/{scenes,frames,reveal,preview,recipient-view}.tsx` = the renderer + studio.
  `apps/web/lib/curator/*` = the turn (SSE). `apps/web/lib/persistence/*` = Supabase store + picks.

Go. It's pushed and real. Pick up the main page and make it sing.
