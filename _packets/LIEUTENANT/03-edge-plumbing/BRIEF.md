# BRIEF 03 — Edge plumbing slice (lib/anthropic-edge + lib/db-edge)

**Source of need:** spine-thread RETURN.md pitfall #1. The Node `lib/anthropic` + `lib/db/client` + `lib/env` modules transitively import `server-only` + the `postgres` TCP driver + heavy zod parsing of `process.env`. **None are edge-safe.** The spine route worked around this with inline raw fetch + inline `@supabase/supabase-js`. Every future edge route will hit the same wall. Build the shared slice ONCE.

**Prerequisite:** read `atelier/app/api/spine/chat/route.ts` — the working edge pattern. Your job is to extract its inline plumbing into reusable, well-typed, edge-safe modules.

## DELIVERABLES (all under `atelier/lib/`)

1. **`lib/anthropic-edge/`** — minimal edge-safe Anthropic client.
   - `client.ts`: a tiny `callAnthropic({ model, system, messages, tools, max_tokens })` wrapper around raw `fetch('https://api.anthropic.com/v1/messages', …)`. Returns `Response` so the caller controls streaming. NO SDK import.
   - `sse.ts`: a typed SSE-parser for the Anthropic streaming wire format (`message_start`, `content_block_start`, `content_block_delta` for both `text_delta` and `input_json_delta`, `content_block_stop`, `message_delta`, `message_stop`). Yields strongly-typed events. The spine route has a working version — port + tighten + test.
   - `tool-loop.ts`: a `runToolLoop({ system, messages, tools, dispatch, onEvent, maxIters })` helper that runs the full Edge-safe agentic loop: stream → collect tool_use blocks → dispatch → append tool_results → stream again. Caller provides `dispatch(name, input) => Promise<string>` and `onEvent(event)` for SSE pass-through. Caps tool_results to ≤200 items per call (enforce via JSON size if the count isn't directly inspectable). Iter limit configurable. Tested.
   - `types.ts`: shared types for messages / tool definitions / events.
   - `index.ts`: barrel re-export.

2. **`lib/db-edge/`** — edge-safe Supabase REST accessor.
   - `client.ts`: a `getSupabaseEdge()` returning `@supabase/supabase-js` client configured for `peek_v2` schema. Reads `process.env['NEXT_PUBLIC_SUPABASE_URL']` + `process.env['SUPABASE_SERVICE_ROLE_KEY']` (note bracket access — `noPropertyAccessFromIndexSignature` requires it). Singleton-per-request safe.
   - `peeks.ts`: typed accessors `getPeekById(id)`, `updatePeek(id, patch)`, with column-list constants from `lib/spine/wire.ts` re-exported.
   - `cards.ts`: `getCardsForPeek(peekId)`, `insertCard`, `updateCard`, `deleteCard`.
   - `wire.ts`: re-export of snake↔camel mappers from `lib/spine/wire.ts` (or move them here — your call; document the move).
   - `index.ts`: barrel.

3. **Tests** under `atelier/tests/unit/`:
   - `anthropic-edge-sse.test.ts` — feed a recorded Anthropic stream fixture through `sse.ts`; assert the typed events come out right.
   - `anthropic-edge-tool-loop.test.ts` — drive `runToolLoop` with a mocked `callAnthropic` that returns a 2-iter tool-use → tool-result → text loop; assert dispatch called, results appended, final text yielded.
   - `db-edge-wire.test.ts` (or extend `spine-derive.test.ts`) — round-trip snake↔camel for peek + card rows.

4. **Refactor the spine route** (`atelier/app/api/spine/chat/route.ts`) to use the new slice — proves the modules work in production. Should significantly shrink the route. Tests stay green.

5. **Brief commentary in commit message** for any non-obvious decision (e.g., why a singleton, why tool_results are size-capped not count-capped).

## HARD RULES

- **`runtime = 'edge'` compatibility** — no `node:` imports anywhere in the slice. No `server-only`. No Drizzle. No `postgres` driver. Verify by importing in a test file with `// @vitest-environment edge-runtime` (or by build-time tree-shaking inspection).
- **Bracketed env access** — `process.env['X']`, never `process.env.X` (strict-mode flag).
- **Tool-result size cap** — ≤24KB JSON per result (the existing Node lib has a `MAX_TOOL_RESULT_BYTES = 24*1024` cap — port the pattern). When exceeded, return a truncated representation with `truncated: true, original_bytes: N`.
- **No silent failures** — every fetch error throws with status + body excerpt; the caller decides what to do.
- **Don't touch the Node `lib/anthropic` or `lib/db` modules.** They serve the legacy/Node routes. The edge slice is parallel.
- **Branch:** `lt/edge-plumbing` off `claude/bold-ride-Li5zK`. Push your branch. Don't merge.

## VERIFICATION (must run + report real results)

- `npm --prefix atelier run typecheck` — 0 errors.
- `npm --prefix atelier run test` — all existing 212 tests + your new ones pass.
- `APP_URL=https://vnext.peek.gift npm --prefix atelier run build` — clean; the spine chat route still appears in `.next/server/middleware-manifest.json` under `functions` (edge).

## RETURN.md

Required sections: what you built; verification results (all 3 commands with exit codes); every integration pitfall (anything edge-vs-node related that fought you); what you stubbed/skipped; bright ideas for the blast phase that uses this slice. Honesty section if anything is unverified.

Per PROTOCOL.md: push `lt/edge-plumbing`, write RETURN.md, tell Frank "done — `lt/edge-plumbing` pushed, RETURN.md written" — orchestrator reviews + merges.
