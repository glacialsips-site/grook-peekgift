# vNext build progress

Branch `claude/gallant-planck-pu51x`. Every step is gated and proven (tsc + vitest green before each commit).
The core builds + tests standalone: `cd packages/core && pnpm install --ignore-workspace && pnpm typecheck && pnpm test`.

## Done — Chapters 0 & 1 (the foundation is forged)

**Ch 0 — Ground truth** (`_packets/SPINE/GROUND-TRUTH.md` + `BUILD-MAP.md`)
Live-verified via Supabase/Stripe MCP this session. Headlines: create + chat are live and billed
(`usage_ledger`=277); the **publish→pick→notify loop has never completed** (`picks`=0); pgvector is
available-not-installed; the **Netlify production branch is `atelier-integration`**.

**Ch 1 — `packages/core`** (framework-agnostic, **36 tests green**, zero keys)
- 1.1 Turborepo/pnpm monorepo + the event-sourcing spine + an **active anti-framework guard** (fails the build on any react/next import).
- 1.2 The `PeekIR` document model lifted **verbatim** from `lib/ir` (the IR is never paraphrased) + a zod mirror + `emptyDocument()`.
- 1.3 The **maker-checker**: `decide(doc,cmd)→Result<Event[]>` + pure `apply(doc,event)→doc`. The chat speaks commands and never mutates; invalid ops bounce with typed errors; the document is the deterministic fold of its log (replay verified). The 16 tools map 1:1 to the command union.
- 1.4 Pure `render(document,theme)` view-model — the single rendering truth. Normalizes **rule-aware card groups** (gap-a) and an **itinerary** from activity cards (gap-b).
- 1.5 The runtime token system `themeToCSSVars` (the `--peek-*` contract) with the **glow fix** (gap-c): `palette.glow:true` now reaches the hero headline.
- 1.6 The typed **service ports** + the configurable card-resolver cascade.

## Next — Chapter 2: the chat over the live preview
- `apps/web` Next App Router shell (PWA) + the token root.
- The React **preview renderer** consuming `render()` — the page that builds behind the chat (key-free; renders the 3 sample docs as a conformance check).
- The **curator turn**: Anthropic (server) → tool-use → `commandFromTool` → `decide()` → events → preview updates; the single transparent-chat-over-preview screen, no drawers, `visualViewport` keyboard reveal.

## Two things only you can unblock (neither blocks building the core)
1. **Deploy branch.** Netlify builds `atelier-integration`; this session is branch-locked to `gallant-planck`, so commits here don't auto-deploy yet. The core is lift-clean either way. To make pushes deploy, pick one: grant push to `atelier-integration`, merge this foundation there, or repoint Netlify's production branch (its connector is offline right now). This is the Ch 8 cutover concern — deferred, not blocking.
2. **Keys for live verification.** Ch 2's curator turn calls Anthropic. The key lives in the deploy env; if you want me to prove the live turn inside *this* session, drop `ANTHROPIC_API_KEY` here. Otherwise I wire it live (no mock) and it verifies on deploy.
