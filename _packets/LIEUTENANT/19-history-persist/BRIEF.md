# BRIEF 19 — Persist per-turn message history + SSE keep-alive (resume)

**Source of need:** spine chat route is currently stateless per turn — each request injects current page-state into the system prompt; no chat history persisted. If the client disconnects mid-turn, the work is lost. Edge runtime has no hard wall-clock once streaming, but a dropped client kills the function. Need: persist turn-state + emit keep-alives so a reconnect resumes from last committed turn.

**Pre-reqs:**
- BRIEF 03 (edge plumbing) merged.
- BRIEF 04 (mutation tools) merged — mutations are checkpointed by the dispatch wrapper writing to mutation log.

**Read first:**
1. `atelier/app/api/spine/chat/route.ts` — current stateless turn pattern.
2. `_packets/LIEUTENANT/_research/curator-tools/REPORT.md` §6 (mutation log shape — already provides per-turn ordering via `turn_id`).
3. `atelier/lib/anthropic-edge/tool-loop.ts` — the loop where keep-alives slot in.
4. STACK-LOCK section on Edge runtime keep-alive recommendation.

## DELIVERABLES

### 1. Message-history table

`atelier/db/migrations/0019_chat_messages.sql`:
- `chat_messages` (or extend existing if present — check schema):
  - `id text primary key` (ulid)
  - `peek_id uuid references peeks on delete cascade`
  - `turn_id text not null` (one turn = one user message → many model deltas)
  - `role text not null` ('user' | 'assistant' | 'tool')
  - `content jsonb not null` (Anthropic-shaped: text blocks, tool_use blocks, tool_result blocks)
  - `created_at timestamptz default now()`
  - `parent_message_id text` (for tool_result → tool_use threading)
  - INDEX by (peek_id, created_at)
  - RLS default-deny; service-role write only

### 2. Persistence layer

`atelier/lib/db-edge/messages.ts`:
- `appendMessage(peekId, message)` — atomic insert.
- `getMessagesForPeek(peekId, { sinceTurnId? })` — ordered fetch.
- `getLastCompletedTurn(peekId)` — for resume.

### 3. Loop integration

In `lib/anthropic-edge/tool-loop.ts` or the spine chat route:
- BEFORE each model call: `appendMessage(peekId, { role: 'user', content: userMessage })`.
- AFTER each `content_block_stop` for an assistant text block: `appendMessage(peekId, { role: 'assistant', content: assembledBlocks })`.
- AFTER each tool dispatch: `appendMessage(peekId, { role: 'tool', content: toolResult })`.
- All fire-and-forget; never block the streaming response.

### 4. Resume endpoint

`atelier/app/api/spine/resume/route.ts` (edge):
- `GET ?peek_id=X` returns the last N messages + current state.
- Client reconnects → calls `/resume` → continues from there.
- If a turn is mid-flight (last message is `tool_use` without a matching `tool_result`), the resume re-runs that tool call before returning state.

### 5. SSE keep-alive

In `lib/anthropic-edge/tool-loop.ts`:
- Emit a `: keep-alive\n\n` SSE comment every 15s during a long-running turn. Comments don't trigger event listeners but keep the connection warm against intermediary timeouts.
- Use `setInterval` (Edge supports it) cleared on completion.

### 6. Tests

- `appendMessage` round-trips Anthropic-shaped blocks.
- `getMessagesForPeek` returns in order.
- Resume from mid-turn correctly re-applies the unfinished tool call (mock the tool to deterministic output).
- Keep-alive emits every 15s during a slow mock turn.

## HARD RULES

- **Append-only.** Never delete or update past messages. Mutation history is immutable.
- **Fire-and-forget writes** so they never block the user-facing stream.
- **Edge-safe.** All db calls via `lib/db-edge`.
- **Don't duplicate the mutation log.** `chat_messages` = full Anthropic conversation; `peek_mutation_log` = structured-mutation audit (different shape, different use case). Both exist.
- **Branch:** `lt/history-persist` off `claude/bold-ride-Li5zK`. Push.

## VERIFICATION

- typecheck/test/build green.
- Migration applies.
- Simulated dropped-client reconnect: fire a turn, kill the client mid-stream, reconnect via `/resume`, verify it continues.

## RETURN.md

Sections: schema migration number; persistence overhead measured (per-message latency added to the loop); resume tested or stubbed; keep-alive tested at 15s; bright ideas (e.g. WebSocket upgrade for true bidirectional once mid-conversation system messages from 4.8 are wired). Honesty section.

Per PROTOCOL.md: push `lt/history-persist`, write RETURN.md.
