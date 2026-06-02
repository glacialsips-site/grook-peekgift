# vNext build progress

Branch `claude/gallant-planck-pu51x`. Every step is gated and proven (tsc + vitest + next build green
before each commit). Core builds + tests standalone: `cd packages/core && pnpm install --ignore-workspace
&& pnpm test`. Web builds: `pnpm install --filter @peek/web... && pnpm --filter @peek/web build`.

## Done — Chapters 0, 1, 2

**Ch 0 — Ground truth** (`GROUND-TRUTH.md` + `BUILD-MAP.md`)
Live-verified via Supabase/Stripe MCP. Create+chat are live and billed; the **publish→pick→notify loop has
never completed** (`picks`=0); pgvector available-not-installed; **Netlify production branch = `atelier-integration`**.

**Ch 1 — `packages/core`** (framework-agnostic, **43 tests green**, zero keys)
- Event-sourcing spine + active anti-framework guard · the `PeekIR` document model (lifted verbatim) + zod
  mirror + `emptyDocument()` · the **maker-checker** `decide()/apply()` (the chat speaks validated commands,
  never mutates; replay reconstructs) · pure `render(document,theme)` view-model (rule-aware card groups +
  itinerary) · the runtime token system `themeToCSSVars` (+ glow fix) · typed service ports + resolver cascade.
- A **conformance suite** proves the three design samples validate + render.

**Ch 2 — the chat over the live preview** (`apps/web`, Next 15, next build green, no Tailwind)
- Shell consuming `@peek/core` (transpilePackages) + runtime `--peek-*` token theming.
- **The preview renderer** over `render()` — `/demo` paints the three sample documents (visible: rule-aware
  variant groups + itinerary). One renderer for preview + recipient page.
- **The curator turn** (`POST /api/curator`): Opus 4.8 tool loop, every `tool_use` routed through
  `commandFromTool → execute(decide+apply)` — the model can only change the document via validated commands.
  Tool schemas generated from core `Inputs` (DRY). Live, key-gated (honest 503 without a key; no mock).
- **The studio screen** (`/studio`): one page — translucent glass chat over the live preview, `visualViewport`
  keyboard reveal, input rail; posts to the curator route and applies the returned document. Teaching empty state.

Screenshots delivered to Frank: `/demo` (three rendered samples) and `/studio` (the chat-over-preview screen).

## Next
- **Live verify Ch 2.4** — the only unproven bit: the actual Anthropic turn (create→build loop). Needs
  `ANTHROPIC_API_KEY` in the build session, or it verifies on deploy.
- **Ch 3 / Ch 4** — the aesthetic safety-net + eval gate, and the renderer to **full SHELL_SPEC caliber**
  (real Google fonts via a loader, scenes/frames/motifs, the bottom sheet + live running total, og unfurl).
  Today's renderer is a sound v1, not yet the mockup bar.
- **Ch 5–8** — pgvector + catalog moat · MCP tools · the gates ($12 publish, Sentry, evals) · cutover +
  the end-to-end publish→pick→notify run.

## Two things only you can unblock (neither blocks building)
1. **Deploy/merge target.** Netlify builds `atelier-integration`; this session is branch-locked to
   `gallant-planck`, so commits here don't auto-deploy. The core + web are lift-clean. To make pushes deploy:
   grant push to `atelier-integration`, merge this foundation there, or repoint Netlify (connector offline).
2. **Keys.** `ANTHROPIC_API_KEY` in this session to verify the live curator turn here (it's live in the deploy
   env regardless).
