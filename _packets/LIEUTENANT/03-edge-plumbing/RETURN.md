# RETURN 03 — Edge plumbing slice

Branch: `lt/edge-plumbing` (off `claude/bold-ride-Li5zK`). Not merged — orchestrator reviews.

## What I built

A parallel, edge-runtime-safe plumbing slice extracted from the working inline pattern in `app/api/spine/chat/route.ts`, then proved by refactoring that route onto it.

**`lib/anthropic-edge/`** — edge-safe Anthropic client (NO SDK):
- `client.ts` — `callAnthropic(params): Promise<Response>`, raw `fetch` to `/v1/messages`. Resolves the key from `process.env['ANTHROPIC_API_KEY']` (bracket access); throws `anthropic_<status>: <body excerpt>` on non-2xx and `anthropic_no_body` on a 2xx stream with no body. Returns the live `Response` so the caller controls streaming.
- `sse.ts` — `parseAnthropicStream(body)`, an async generator yielding typed `AnthropicStreamEvent`s (`message_start`, `content_block_start`, `text_delta`, `input_json_delta`, `content_block_stop`, `message_delta`, `message_stop`). Buffers across chunk boundaries; ignores `ping`/comments/`[DONE]`.
- `tool-loop.ts` — `runToolLoop(params)`: stream → assemble blocks → dispatch tool_use → append tool_results → repeat to `maxIters`. Caller supplies `dispatch(name,input)` and `onEvent(event)`. Exports `capToolResult` (24KB cap, head-retained truncation wrapper).
- `types.ts` — message/tool/event types. `index.ts` — barrel.

**`lib/db-edge/`** — edge-safe Supabase REST accessor:
- `client.ts` — `getSupabaseEdge()` module-level singleton scoped to `peek_v2`; `resetSupabaseEdge()` for tests; `type EdgeSupabaseClient`.
- `peeks.ts` — `getPeekById`, `updatePeek`. `cards.ts` — `getCardsForPeek`, `insertCard`, `updateCard`, `deleteCard` (mutations scoped by **both** `id` and `peek_id`).
- `wire.ts` — re-export of the proven `@/lib/spine/wire` mappers/columns (decision: re-export, not move — see pitfalls). `index.ts` — barrel + `loadSpineState(peekId): Promise<SpineState | null>` (parallel peek+cards load, mirrors the route's old `loadState`).

**Tests** (`tests/unit/`): `anthropic-edge-sse.test.ts` (recorded stream → typed events, with mid-frame chunk splits), `anthropic-edge-tool-loop.test.ts` (2-turn tool→result→text loop via DI'd fake transport + cap truncation), `db-edge-wire.test.ts` (snake↔camel round-trip + column constants).

**Spine route refactor** (`app/api/spine/chat/route.ts`): deleted the inline `sb()`, `loadState`, and the entire `modelTurn` SSE parser (~165 lines). Now imports the slice; the route is just TOOLS + `systemPrompt` + `execTool` (mutates via db-edge) + a `runToolLoop` call. 477 → 322 lines.

## Verification (all run on `lt/edge-plumbing`, real results)

| Command | Result |
|---|---|
| `npm --prefix atelier run typecheck` | **exit 0**, 0 errors |
| `npm --prefix atelier run test` | **223 passed (30 files)** — was 212/27 at baseline; +4 anthropic-edge, +7 db-edge |
| `APP_URL=https://vnext.peek.gift npm --prefix atelier run build` | **exit 0** |

Edge registration confirmed: `.next/server/middleware-manifest.json` `functions` contains exactly `/api/spine/chat/route` (name `app/api/spine/chat/route`). The route still bundles as **edge** after the refactor — the build is the authoritative edge-safety gate (a `node:`/`server-only` leak in the slice would have broken the edge bundle).

## Integration pitfalls (the valuable part)

1. **Why the slice exists, confirmed:** `lib/env.ts` and `lib/supabase/service.ts` both `import 'server-only'` (env also zod-parses `process.env` at import; service pulls the Drizzle `Database` types). Any edge route importing them transitively dies. The slice imports **none** of `@/lib/env`, `@/lib/supabase/*`, `@/lib/db/*`, `@/lib/anthropic/*`.
2. **The SDK can't be ported, and neither can the Node `streaming.ts`.** `@anthropic-ai/sdk` drags node deps; the Node streamer is built on the SDK's emitter API (`stream.on('text'|'inputJson'|...)`). The edge SSE parser instead reads the **raw wire** directly (ported from the route's inline `modelTurn`). Two separate stream parsers now exist by necessity — node (SDK-emitter) and edge (raw-wire). That's correct, not duplication-to-eliminate.
3. **supabase-js `peek_v2` schema generic is invariant under strict TS.** `createClient(..., { db: { schema: 'peek_v2' } })` yields a client type that is NOT assignable to a bare `SupabaseClient` (defaults to `'public'`), so `getSupabaseEdge(): SupabaseClient` is a type error. Fix: derive `EdgeSupabaseClient = ReturnType<typeof makeClient>` — the same shape the working route used (`ReturnType<typeof sb>`).
4. **Closure-capture re-widens a guarded `let`.** `let state = await loadSpineState(...)` is `SpineState | null`; after `if (!state) throw`, the original route used `state` synchronously so narrowing held. My refactor captures `state` in async closures (`dispatch`/`onEvent`/`system` thunk), where TS re-widens it to `SpineState | null` (it can't prove the value at call time across a reassignable binding). Fix: pin `let state: SpineState = initial` after the guard. **General trap for everyone moving inline edge loops into closure-based helpers.**
5. **The `runToolLoop` DI seam is sharp on purpose.** It defaults to the real `callAnthropic`, which resolves the key from env and throws `ANTHROPIC_API_KEY not configured` if absent. A test that forgets to inject a fake transport hits the network / hard-fails (it does not silently pass). The spine route passes no `apiKey` and relies on env resolution — correct for prod; tests MUST inject.
6. **Tool-result cap is byte-based, not item-based.** The brief says "≤200 items"; the loop can't count items in an opaque `unknown` payload, so it enforces the equivalent **24KB JSON byte cap** (char-length convention, matching the Node lib's `MAX_TOOL_RESULT_BYTES`). Item-count/pagination is the **tool author's** job; `capToolResult` is the structural backstop. Documented inline.
7. **System-prompt-per-turn preserved via a thunk.** The original recomputed `systemPrompt(state)` every model turn so the model always saw current page state. `runToolLoop` originally took a static `system: string`; I extended it to `string | (() => string)` (backward-compatible — existing tests unchanged) and the route passes `() => systemPrompt(state)`. Without this the model's view of the page would lag one iteration.

## Stubbed / skipped (said plainly)

- **No `edge-runtime` vitest environment added.** The brief allowed either an `// @vitest-environment edge-runtime` assertion **or** build-time tree-shaking inspection. I chose the build gate: the refactored edge route imports the entire slice, so a clean production build + edge-registration in the middleware manifest is the real proof — and I avoided adding a dev dependency (`@edge-runtime/vm`) purely for a test-env assertion. **Honest caveat:** there is therefore no *automated unit-level* edge guard; edge-safety is enforced by the build, not a test. A cheap belt-and-suspenders source-scan test (assert no forbidden import strings in the slice) could be added if you want one in CI.
- **`updateCard` is exported but unused** by the current spine TOOLS set (no edit/reorder tool yet). Built for the blast phase; not dead, just unwired.
- **db-edge live REST calls are not integration-tested** against a real DB (no test DB, per PROD-PARALLEL). `db-edge-wire.test.ts` covers the pure mapping surface; the REST accessors mirror the route's proven inline logic 1:1.
- The 5 slice library files **pre-existed from a prior frame**; the subs audited them against spec rather than blind-rewriting (one real typecheck fix in `db-edge/client.ts`, one test DI-wiring bug fixed in the tool-loop test). Noted for traceability.

## Bright ideas for the blast phase

- `runToolLoop` + `dispatch`-returns-payload + `onEvent→your-wire` is a clean reuse seam: publish, scrape-driven curation, any future edge agent route reuses it with its own tools and SSE mapping. `tool_batch_complete` is the hook to push a fresh state snapshot.
- The `system` thunk is a natural home for 4.8 **mid-conversation system context** (STACK-LOCK line) — a future variant could inject per-turn ephemeral context, not just refresh.
- Pagination-to-≤200-items should be a **checklist item / lint** for blast-phase tool authors; `capToolResult` only backstops byte size, it can't fix an unpaginated catalog tool's latency.
- Consider eventually promoting the wire mappers into a runtime-neutral `lib/wire/` shared by spine + db-edge, removing the re-export indirection — deferred now to avoid disturbing proven, tested code.

## Honesty

Everything reported green was actually run; the exit codes and the 223-test count are real. **Not** verified: runtime behavior on real Netlify Edge (Deno) — no deploy per protocol; the slice is proven edge-safe by the build/manifest, not by a live edge invocation. The Anthropic stream + Supabase REST paths are exercised via mocked/pure tests, not a live call.
