# peek-jumpoff/reference/ — vetted reference, not authority

Imported from the design chat's export (`anth_chat_1.zip`) and **weeded on the way in**
by Claude Code, per Frank's warning that the design chat had begun to hallucinate, and
the export's own `DESIGN_EXPORT_MANIFEST.md` (an honest ⭐/🔧/⚠️/🗑 guide).

## Trust order when anything conflicts (from the manifest, confirmed)
**the mockups  >  engine/renderer.js  >  the prose docs (JUMPOFF / this folder).**
If a doc contradicts what a mockup actually does, the mockup wins.

## What's here
- `original-mockups/` ⭐ — the original 10 hand-art-directed pages. **The quality bar.**
  Study these, not prose. (Charity Gala + Omakase Evening are the exemplars.)
- `chat-ui/` 🔧 — the "chat laid over a live preview" surface (the Milestone-0 shape).
  Most useful: `Mobile Chat - Live.html`, `live-preview.jsx`, `chat-live-docked.jsx`,
  `chat-shared.jsx`, `ios-frame.jsx`. The rest are earlier/rough experiments.
- `DESIGN_DIRECTOR_AGENT.md` ⚠️ — deeper worked examples referenced by JUMPOFF.
  Verify specifics against the mockups before trusting them.
- `engine-parametric-REJECTED/` ⚠️ — `resolver.js` / `director.js`: the deterministic
  lookup-table approach the design side itself concluded was the WRONG ceiling
  ("housey, a notch below the mockups"). Reference ONLY. Do **not** build a mandatory
  deterministic engine — the model is the resolver.
- `DESIGN_EXPORT_MANIFEST.md`, `NOTE_TO_SELF.md` — the design chat's own index + reset.

## What was CUT on import (still in the original zip if we want to mine it)
The earlier `design_handoff_mobile_chat_sites/` doc sprawl — `ARCHITECTURE*.md`,
`CHECKPOINT.md`, that folder's own `CLAUDE.md`, `DESIGN_ENGINE_TOOLKIT.md` (62KB),
`DESIGN_ENGINE_BACKEND_WISHLIST.md`, `STACK_INTEGRATION.md`, `LIGHT_CHAT_DEPLOY.md`,
`START_HERE.md`, `FIRST_TRY.md` — flagged ⚠️ drift / over-built by the manifest and
superseded by the canonical `peek-jumpoff/` bundle. Also cut: duplicate mockup/prototype
copies, `qa.html` (scratch), `Site Stamper.html` (studio), `momdaughter.png` (2.5 MB).
`STACK_INTEGRATION.md` + `DESIGN_ENGINE_BACKEND_WISHLIST.md` may be worth mining for
backend wiring later — verify against `ir/ports.ts` before trusting.
