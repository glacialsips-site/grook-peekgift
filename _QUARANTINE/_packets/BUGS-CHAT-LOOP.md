# BUGS-CHAT-LOOP — chat infrastructure hardening audit

_Compiled 2026-05-28. Scope: `lib/anthropic/chat.ts`, `lib/anthropic/streaming.ts`, `lib/anthropic/observability.ts`, `app/api/chat/route.ts`, `components/build/chat-pane.tsx`, `lib/anthropic/extended-thinking.ts`, `db/schema/chat_history.ts`, `lib/chat/persistence.ts`, `lib/chat/session.ts`. Pass focused on the 10 risk categories called out by the orchestrator + drift from existing BUGS-WAVE2 follow-ups._

## Severity legend

- **BLOCK** — chat loop crashes, Anthropic 400/413, or breaks the next replay
- **MAJOR** — silent data loss, race window, or cost burn
- **MINOR** — smell or polish

---

## BLOCK / hard breakers

### C01 — Aborted-mid-turn leaves dangling user message → next replay sends consecutive `user` roles → Anthropic 400

**Files:** `atelier/app/api/chat/route.ts:385-393` + `chat.ts:165-211`

**What breaks.** The route persists the user message via `appendChatMessage` BEFORE the chat turn streams. If the stream errors (`stream.on('error')`), the user disconnects, or the request signal aborts before any `message_end` lands, the for-loop returns with `history` containing no assistant content. The route's `while (next.done)` block iterates `newAssistantTurns` — empty — so nothing is appended for the assistant side. On the NEXT request from a curator who opens a fresh tab and the client sends `history: []`, `loadChatHistory(peekId)` returns rows ending in a `user` row (the dangling user message). The route then appends a *new* `user` content via `messages.push({ role: 'user', content: userContent })` inside `chatTurn`. Anthropic 400s on two consecutive `user`-role messages with content shapes that aren't `tool_result` follow-ups.

**Fix.** History-load path drops a trailing dangling `user` row before assembling the replay history. The user's text is still rendered in the UI (client-side hydration); the API call is now legal.

**Status:** FIXED.

---

### C02 — Tool result JSON.stringify can throw on circular references → kills the whole turn

**Files:** `atelier/lib/anthropic/chat.ts:295-302`

**What breaks.** `JSON.stringify(output)` runs on every tool result and is *not* inside the per-call try/catch. If a tool ever returns a value with circular references (rare, but possible — a future tool returning a DB row with eager relations), the stringify throws synchronously, the for-loop bails, and the exception propagates to the route's outer `catch` — turn dies with no recovery, no `is_error` tool_result emitted to the model.

**Fix.** New `safeStringifyToolOutput` wraps the serialization in try/catch and emits a sanitized `is_error: true` envelope so the chat loop survives.

**Status:** FIXED.

---

## MAJOR / silent fail / cost burn

### C03 — Anonymous turn counter has a TOCTOU race

**Files:** `atelier/app/api/chat/route.ts:124-141` + `lib/chat/session.ts:123-169`

**What breaks.** The route does `anonymousTurnCount` → `anonymousTurnExceeded(count)` → `incrementAnonymousTurn`. Between the count read and the increment, two parallel anon requests from the same `(ip, sessionId)` both see `count=4`, both pass `anonymousTurnExceeded(4) === false` (cap is 5), and both increment to 6. Anon gets one extra free turn for every parallel burst. Not catastrophic with `ANON_TURN_CAP=5` but trivially fixable.

**Fix.** Flip to increment-then-check: `nextCount = await incrementAnonymousTurn(...)` (Redis `INCR` is atomic), then `if (anonymousTurnExceeded(nextCount))` returns the signup-required SSE. Edge case: with `incr → cap+1`, the request blocks but we've recorded an unused turn. Acceptable; a Lua script to make it perfectly atomic is overkill for a 5-turn cap.

**Status:** FIXED.

---

### C04 — `loadPeekStateJson` re-runs on every inner-loop iteration → 10 unnecessary DB calls per multi-tool turn

**Files:** `atelier/lib/anthropic/chat.ts:111`

**What breaks.** `loadPeekStateJson(input.ctx.peekId)` runs at the TOP of every for-loop iteration inside `chatTurn`. With `MAX_TOOL_ITERATIONS=10`, a fully-extended tool-use turn issues up to 10 `peek_v2.peeks` + `cards` + `variant_groups` queries just to build Block 4 of the system prompt. The peek state mutates inside the loop (tools edit cards / hero / note), so re-reading is semantically correct, but the chat loop could trust the existing snapshot rather than re-querying after a no-mutate iteration.

**Fix.** **DEFERRED** — Larger refactor than one line. Reading peek state from Supabase is fast (single-digit ms) and these queries are small; not a hot path issue today. Document for a `chat-loop-perf` follow-up packet.

**Status:** DOCUMENTED.

---

### C05 — Extended-thinking flag is per-sessionId, not per-turn → parallel turns from same session can steal each other's flags

**Files:** `atelier/lib/anthropic/extended-thinking.ts:21-50` + `chat.ts:133` + `tools/request_extended_thinking.ts:61`

**What breaks.** `consumeExtendedThinking(sessionId)` keys on `sessionId`. If a curator's client somehow fires two `/api/chat` requests concurrently with the same sessionId (a buggy retry, an open-tab race, a manual `curl` test), turn A's iteration N calls `request_extended_thinking` and turn B's iteration M (running in parallel) consumes the flag before turn A's iteration N+1 reaches it. Turn A's heavy creative work executes WITHOUT extended thinking; the budget burns in the wrong turn. The UI blocks parallel sends (`chat-pane.tsx` `sending` guard), so the practical risk is low, but the server shouldn't trust the client.

**Fix.** `chatTurn` generates a `turnId` (UUID) and threads it into `ToolContext`. The flag key composes `sessionId + turnId` so two parallel chatTurn invocations can't steal each other's flags. Legacy `requestExtendedThinking(sessionId)` and `consumeExtendedThinking(sessionId)` signatures still work without a turnId (tests).

**Status:** FIXED.

---

### C06 — Stream error mid-turn → SSE error event uses raw upstream message; 5xx detection is shallow

**Files:** `atelier/lib/anthropic/streaming.ts:153-169` + `app/api/chat/route.ts:45-50, 643-654`

**What breaks.** The route's `isUpstream5xx` checks `err.status` and `err.statusCode` directly. The Anthropic SDK's `APIError` instances expose `.status` so the check works for SDK-thrown errors, but for network errors mid-stream (connection reset, ECONNREFUSED, fetch failures), `status` is undefined → the curator sees raw upstream messages like `socket hang up` instead of the friendly `FRIENDLY_UPSTREAM_MSG`.

**Fix.** `isUpstreamError` (renamed) ALSO detects (a) errors with `code` / `cause.code` matching `ECONN*` / `ETIMEDOUT` / `EAI_AGAIN` / `UND_ERR_*`, (b) errors whose message contains `socket hang up` / `fetch failed` / `network request failed` / `terminated`. Anything that isn't clearly a user-side / 4xx error now defaults to the friendly message.

**Status:** FIXED.

---

### C07 — Tool result block construction has no size cap → large tool outputs can blow Anthropic's request limit

**Files:** `atelier/lib/anthropic/chat.ts:298`

**What breaks.** `content: JSON.stringify(output)`. No truncation. If a tool ever returns large output (a future `web_search` aggregator returning 200KB of search results), the stringified JSON goes into the next `messages.create` body. Anthropic's stated request limit is currently ~5MB but client-side encoding overhead, base64 image attachments, and multi-iteration accumulation can push that. More immediately: every byte of tool result is also Input Tokens on the next iteration — silent cost burn.

**Fix.** `safeStringifyToolOutput` caps serialized tool output at 24KB (room for ~6K tokens). Truncates with a clear `truncated: true, original_bytes, head` envelope so the model can recover and narrow its query.

**Status:** FIXED.

---

### C08 — `active_attached_file_ids` drain has a read-modify-write race (same JSONB pattern as W18 carryover)

**Files:** `atelier/app/api/chat/route.ts:202-261`

**What breaks.** Two parallel chat requests on the same `peekId` (different sessions): both read `metadata.active_attached_file_ids` simultaneously, both inject the file blocks into their user content, both write back `active_attached_file_ids: []`. Net: the file blocks attach to BOTH turns (model sees the same attachment twice), and metadata is correctly cleared. Not catastrophic but doubles the input-token bill for the attachment.

**Fix.** **DEFERRED** — Same JSONB CAS / row-table refactor pattern as the existing carry-over note in BUGS-WAVE2 W18. Single-session-per-peek is the common case (anon by definition; signed-in curators rarely fire parallel turns from one peek).

**Status:** DOCUMENTED.

---

### C09 — Image attachment guidance text leaks into history forever

**Files:** `atelier/app/api/chat/route.ts:181-197` + `chat-pane.tsx:195-212`

**What breaks.** When a curator uploads an image, the route prepends a `[system] The curator just attached N images:\n1. https://...` text block to `userContent`. That entire block is persisted to `chat_messages.content` and re-sent in every subsequent `messages.create` history. The client UI strips the guidance via `stripAttachmentGuidance` BEFORE rendering, but the SERVER replays it to Anthropic every turn → the model re-reads the entire instruction block even on turn 47.

**Fix.** New `stripAttachmentGuidanceFromContent` filters the synthetic `[system] The curator just attached…` text blocks during history reload. The image content blocks (the actual context) stay.

**Status:** FIXED.

---

### C10 — Stream-error path can clobber successful iteration usage in analytics

**Files:** `atelier/lib/anthropic/chat.ts:188-196` + `observability.ts:264-280`

**What breaks.** On `event.type === 'error'`, `iterationCapture.recordError` zeros all token counts (`inputTokens: 0, outputTokens: 0`). If the error fires AFTER `message_end` (rare but possible — Anthropic's SDK can emit `error` after `finalMessage` on certain protocol violations), `recordFinal` already populated the rollup; calling `recordError` ADDS a second zero-token rollup. PostHog `$ai_generation` events show false zero-token failed iterations even when the model actually produced output and only the post-completion hook errored.

**Fix.** Track a per-iteration `messageEnded` boolean; only call `recordError` when `message_end` hasn't already landed for that iteration.

**Status:** FIXED.

---

### C11 — History persistence on partial-success: assistant turn appended to `messages` with `tool_use`, then abort before `tool_result` follow-up → dangling tool_use on next replay → Anthropic 400

**Files:** `atelier/lib/anthropic/chat.ts:213-304`

**What breaks.** Sequence: iteration K's `message_end` lands → `messages.push({role:'assistant', content: finalMessage.content})` runs → loop starts dispatching tool calls → ONE of the tool dispatches takes a long time → user aborts → for-loop bails after dispatching the first M of N tools. The `toolResults` array has M entries; `messages.push({role:'user', content: toolResults})` happens only OUTSIDE the for-loop at line 304 — if we abort INSIDE the for-loop, `messages` has the assistant turn WITH tool_use blocks but no following user-role tool_result message → on next replay, Anthropic sees an assistant tool_use without its required tool_result follow-up → 400.

**Fix.** When aborting mid-dispatch, synthesize is_error tool_result blocks for the not-yet-dispatched calls so every tool_use has a matching tool_result. Push the user message with the combined toolResults before returning.

**Status:** FIXED.

---

### C12 — Route loads chat history via `loadChatHistory` only when client sends `history: []` — multi-tab divergence is possible

**Files:** `atelier/app/api/chat/route.ts:144-167` + `chat-pane.tsx:321, 516-523`

**What breaks.** Client maintains `apiHistoryRef.current` (in-memory). Server reads it as the source of truth for `history`. If a curator opens two tabs on the same peek, tab A and tab B accumulate independent in-memory histories; whichever tab last sent a message overrides the other's view of "current history". The DB has the union of both via `chat_messages`, but the server only reads DB rows when `history.length === 0`. Tab B's next turn discards anything that landed in tab A.

**Fix.** **DEFERRED** — Always reload history from DB (ignore client `history` past the first turn). Larger touch; multi-tab on same peek is rare today.

**Status:** DOCUMENTED.

---

## MINOR / smells

- **`chat-pane.tsx:494` `dispatchEvent` shadow.** Function named `dispatchEvent` collides with the DOM global `window.dispatchEvent`. No runtime risk (local scope wins) but linter-fragile and confusing.
- **`route.ts:586-606` `newAssistantTurns` extraction uses `+1`.** Slices `finalHistory.slice(initialHistory.length + 1).filter(role==='assistant')`. The `+1` accounts for the user message added by `chatTurn`. Structurally fragile if `chatTurn` ever errors before pushing the user message.
- **`streaming.ts:111-130` `inputJson` attribution.** When MULTIPLE tool_use blocks are open simultaneously in one assistant content (parallel tool calls in a single turn), the lowest-index `target` always gets the delta. Anthropic's SDK actually emits `inputJson` for one block at a time per the docs, so practically it works.
- **`route.ts:629-632` `tool_call` SSE event on `tool_use_end`** emits the same id twice (once on `tool_use_start`, once on `tool_use_end` with `input`). Client merges via `toolUseIndexById` correctly, but on lossy connections the start event could land and the end event drop, leaving the UI with a `pending` tool call that never resolves. Minor — `tool_result` later marks it `done`.
- **`session.ts:171-173` `anonymousTurnExceeded` uses `>=` against `ANON_TURN_CAP=5`.** The 5th turn is BLOCKED. Confusing semantics; either rename to `ANON_TURN_LIMIT_EXCLUSIVE` or change to `>`.
- **`observability.ts:226-263` symmetry.** `beginTurnCapture` flushes a single aggregated `$ai_generation` event per turn, but `iteration` records also call `recordUsageFireAndForget` PER iteration inside `flush`. PostHog gets one event; the usage table gets N rows. Asymmetric.

---

## ANTI-FINDINGS

- **Tool dispatch errors** (category 2). The chat loop's try/catch at lines 243-291 catches thrown handlers and emits `is_error: true` tool_results. Loop recovers. Verified.
- **Tool result order with `Promise.all`** (category 7). The orchestrator brief mentions "Promise.all" but the actual code is a sequential `for (const call of pendingToolCalls)` loop. Tool results are emitted in dispatch order.
- **Cache invalidation on system-prompt drift** (category 10). Block 1 (BASE_PROMPT), Block 2 (common skills), Block 3 (conditional skills) each carry their own `cache_control: ephemeral, ttl: '1h'`. Curator memory lives in Block 4 (no cache). When memory loads, only Block 4 changes → Blocks 1-3 keep cache.
- **Message-history overflow** (category 8). No explicit pruning, but with Sonnet 4.6 at 200K input tokens, a curator would need ~200 turns to hit the window. Worth a future packet but not BLOCK.

---

## Dispatch ledger

Fixed in this branch: C01, C02, C03, C05, C06, C07, C09, C10, C11.
Documented (deferred): C04, C08, C12.
Minors: rolled into a future polish packet.
