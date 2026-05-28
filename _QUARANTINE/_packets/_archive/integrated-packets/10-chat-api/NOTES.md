# Packet 10 — integration notes

## Anonymous-session ownership: peeks table missing `metadata` column

Per `db/migrations/0000_next_kylun.sql`, the `peek_v2.peeks` table has no `metadata` jsonb column and `curator_id text NOT NULL`. The packet spec asks `assertPeekAccess` to treat an anonymous session as the owner when `peek.curator_id IS NULL AND peek.metadata->>'anonymous_session_id' = sessionId`. The code I wrote selects `curator_id, metadata` and applies that exact rule. At runtime today this query will:

- error out the `metadata` column lookup on the production schema (the Supabase client will return an error, which `assertPeekAccess` logs and returns `not_found` for), OR
- if Supabase tolerates the missing column on a select-projection, return `metadata = null` and any anon access will fail closed (`forbidden`).

Either way no real anonymous session can pass the check today. A follow-up packet must:

1. Add `metadata jsonb DEFAULT '{}'::jsonb NOT NULL` to `peek_v2.peeks` (or a dedicated `anonymous_session_id text` column).
2. Make `peek_v2.peeks.curator_id` nullable (drop the NOT NULL on curator_id, or use a sentinel anonymous user).
3. Have the peek-create path stash `{ anonymous_session_id: sessionId }` into `metadata` when no user is signed in.

Until then the route is wired correctly per spec but anonymous flows are effectively gated off — signed-in flows work normally.

## Tool-result event content

`SseEvent.kind === 'tool_result'` emits the actual handler return value from `runTool`. If the handler threw, the output is `{ error: <message> }` and the corresponding `tool_result` block sent back to Claude carries `is_error: true`.

## SSE framing

Each event is emitted as `event: <kind>\ndata: <json>\n\n`. The full SSE event object (including its `kind` field) is serialized into the `data:` line; clients can either dispatch on the `event:` line or parse the JSON. No keep-alive comment frames; the route relies on `X-Accel-Buffering: no` plus the SDK's own delta cadence.

## Streaming loop

The route runs the agent loop inline rather than delegating to `chatTurn`, so it can emit `kind: 'tool_result'` events with the actual handler output (which `chatTurn` swallows internally). Behavior mirrors `chatTurn` otherwise: same MAX_TOOL_ITERATIONS (10), same max_tokens (4096), same system-prompt helper, same per-tool `is_error` handling.

## Rate limiting

No Upstash rate-limit call in this packet — the packet text says to leave that as always-allow for signed-in users. Anonymous metering (5-turn cap via the `events` table) is implemented.
