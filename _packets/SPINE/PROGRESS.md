# vNext build progress

Branch `claude/gallant-planck-pu51x`. Every step gated and proven before commit. The main
page (the chat-over-preview studio) is the focus and is the unprecedented part — built and,
where a key allows, verified live.

Run it: core — `cd packages/core && pnpm install --ignore-workspace && pnpm test` (53 green).
Web — `pnpm install --filter @peek/web... && pnpm --filter @peek/web build`. Deploy — see DEPLOY.md.

## The main page (the studio) — done + live-verified
`apps/web` (Next 15, no Tailwind, runtime `--peek-*` tokens). ONE page: a translucent chat
floating over a live preview, `visualViewport` keyboard reveal, no wizard/drawers.
- **Multimodal input**: text · photo/camera (→ Opus vision) · mic (browser speech). The sparse
  "just talk or snap a photo" input.
- **The curator turn** (`/api/curator`, SSE): Opus 4.8 tool loop, every tool_use routed through
  the core maker-checker (`commandFromTool → decide → apply`); tool schemas generated from core.
- **Streaming**: text deltas + a page snapshot after each command — the page builds itself in
  real time.
- **Verified LIVE with the key**: (1) a text turn authored a full hardware-store-work-order page
  and the maker-checker rejected a malformed op; (2) a real **photo** was read precisely and turned
  into a page (vision); (3) a turn streamed 12 text deltas + 7 incremental page snapshots.

## The renderer (the preview = the page) — toward mockup caliber
One pure `render()` view-model, one React renderer for preview + recipient + demo.
- Scenes (themed full-bleed backdrop, §3 catalog) · Frames (hero media treatment) · scroll-reveal
  + hover motion · the Google display fonts load (the anti-generic lever; live in real browsers)
  · WCAG-AA contrast safety-net applied automatically · rule-aware variant groups · itinerary ·
  the claim/RSVP panel · the money bar. `/demo` renders the three design samples (conformance).
- Honest gap: still short of full SHELL_SPEC caliber — the bottom sheet, hero variants, richer
  per-kind sections (tiers/stubs/tracklist/courses), and the nav are the remaining caliber work.

## The loop (create → persist → publish → pick) — built
- Persistence: `peek_v2.peek_documents` (jsonb snapshots, connector-verified) — the turn persists each snapshot.
- Recipient `/g/[slug]`: renders the published doc; cards are pick targets validated server-side by
  the **selection engine** (`decidePick`: variant rules, locks, caps — unit-tested) and persisted to `peek_v2.peek_picks`.
- Publish `/api/publish` + webhook: a $12 Stripe Checkout Session + webhook→publish (build-verified).
  NOTE: the embedded checkout UI was removed per direction — checkout becomes a later full-custom build.

## Chapters 0–1 (the foundation) — done, 53 core tests
Ground truth (GROUND-TRUTH.md/BUILD-MAP.md) · `packages/core`: event-sourcing spine + anti-framework
guard · `PeekIR` lifted verbatim + zod mirror + `emptyDocument` · the maker-checker `decide/apply` ·
pure `render` · the token system + scene/frame vars + contrast · typed ports + resolver cascade ·
the selection engine · sample conformance.

## Next
- **Deploy** (whenever — DEPLOY.md): one manual Netlify step (production branch → this branch); the
  env vars there make it fully live. Connector offline, so it's manual; likely one config tweak on first build.
- Finish renderer caliber (sheet, hero variants, richer sections, nav) · "pinged" change highlight ·
  full-custom checkout · notify-the-creator (needs the auth bookend for an email) · the new landing idea.
