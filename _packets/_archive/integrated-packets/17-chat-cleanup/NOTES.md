# Packet 17 — worker notes

## Vibe cast removal: PENDING

`db/schema/peeks.ts` `Vibe` type is still the old shape (`palette: string[]`, `font_pairing: string`) — packet 13 (schema fix) has not yet merged into `atelier-integration` as of this branch's base. Casts left in `set_vibe.ts` and `update_vibe.ts`:

- `atelier/lib/anthropic/tools/set_vibe.ts:195` — `vibe: next as unknown as Vibe`
- `atelier/lib/anthropic/tools/update_vibe.ts:83` — `vibe: next as unknown as Vibe`

After packet 13 lands and the Drizzle `Vibe` type matches the rich `StoredVibe` shape (`palette: { bg, surface, ink, accent, accent2? }`, `font_pairing: { display, body }`, plus `tone`, `mood_words`, `motion`), drop both casts. Orchestrator can fold this into the packet 13 integration commit since both files now sit in trunk.

## chatTurn ↔ route.ts wiring

`chatTurn`'s `StreamEvent` already covered every SSE-relevant case. Mapping is straightforward:

| `StreamEvent.type` | `SseEvent.kind`  |
|---|---|
| `text_delta`       | `text`           |
| `tool_use_start`   | `tool_call` (no input yet) |
| `tool_use_end`     | `tool_call` (with parsed input) |
| `message_end`      | `turn_end`       |
| `error`            | `error`          |
| `thinking_delta`   | (dropped — no UI surface yet) |
| `tool_use_delta`   | (dropped — UI gets the final parsed input on `tool_use_end`) |

`tool_result` is no longer derived from `StreamEvent` — it flows through the new `onToolResult` callback, which fires after each `runTool(...)` resolves (or rejects, in which case `output = { error: message }`). This preserves the existing wire format: a single `tool_call` event with input followed by a `tool_result` event.

Quirks worth flagging:

1. **`onToolResult` only receives the output**, not the `isError` flag. The error shape is already an `{ error: string }` object so the UI can still detect it. Inside `chatTurn` we set `is_error: true` on the tool_result block sent back to Claude, which is what matters for the model's tool-loop semantics.
2. **`message_end` fires per iteration** of the inner tool loop, so `turn_end` SSE events fire multiple times for a multi-tool turn. This was already the behaviour of the inline loop in `route.ts` before this refactor — the UI must handle multiple `turn_end` events per request. Aggregation for `recordEvent('chat_turn', ...)` happens once at the end, post-loop.
3. **`chatTurn` swallows the stream-error case internally** (returns from the generator). The yielded `error` event still fires, so `safeEnqueue({ kind: 'error', ... })` runs. We do not need the `streamErrored` short-circuit the inline loop used.
