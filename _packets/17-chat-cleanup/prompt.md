# Packet 17 — Chat plumbing cleanup (shared SseEvent, chatTurn onToolResult, Vibe cast removal)

- **Worker:** cc-on-web | webchat-opus
- **Branch:** `claude/packet-17-chat-cleanup`
- **Depends on (sequencing):** packets 13 (schema fix) and 14/15/16 not required — only depends on what's already in `atelier-integration` after batch 2A merge
- **Imports from siblings:** N/A (refactors across `lib/anthropic`, `app/api/chat`, `lib/peek`, `lib/anthropic/tools`)
- **Validation:** `cd atelier && npm install && npm run build`
- **Target paths:** `atelier/lib/chat/sse-types.ts` (new), `atelier/app/api/chat/schema.ts`, `atelier/lib/peek/types.ts`, `atelier/lib/anthropic/chat.ts`, `atelier/lib/anthropic/tools/set_vibe.ts`, `atelier/lib/anthropic/tools/update_vibe.ts`

## Context

Worker feedback from batch 2A flagged three drift items. None are bugs — they're tech-debt-by-pace that should be cleared before more product packets pile on.

1. **`SseEvent` is defined twice** — once in `app/api/chat/schema.ts` (packet 10, server-only) and once in `lib/peek/types.ts` (packet 12, client). The server module can't be imported by client code, so the client redefined the union. Single source of truth needed.
2. **`chatTurn()` helper in `lib/anthropic/chat.ts` (packet 03) is now unused** because packet 10's API route had to inline the agent loop to emit tool-result SSE events. Drift between the two will only get worse. Refactor `chatTurn()` to accept an `onToolResult` callback, then have the chat route use the helper instead of an inline loop.
3. **Two `as unknown as Vibe` casts** in `tools/set_vibe.ts` and `tools/update_vibe.ts` (packet 11) — needed because the old `Vibe` type was wrong. Packet 13 fixed the type; the casts should be deleted.

## Inputs

None.

## Deliver

### `atelier/lib/chat/sse-types.ts` (new)

Move the `SseEvent` union here. Pure types, no runtime imports — safe to import from both server and client.

```ts
export type SseEvent =
  | { kind: 'text'; delta: string }
  | { kind: 'tool_call'; id: string; name: string; input?: unknown }
  | { kind: 'tool_result'; id: string; output: unknown }
  | { kind: 'turn_end'; usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number } }
  | { kind: 'error'; message: string };
```

### `atelier/app/api/chat/schema.ts`

Re-export `SseEvent` from `@/lib/chat/sse-types`. Delete the local definition. The Zod request schema stays here unchanged.

```ts
export { type SseEvent } from '@/lib/chat/sse-types';
```

### `atelier/lib/peek/types.ts`

Replace the locally-defined `SseEvent` with a re-export from `@/lib/chat/sse-types`. Delete the local definition.

### `atelier/lib/anthropic/chat.ts`

Refactor `chatTurn()` to expose tool results to callers. Add an optional callback parameter:

```ts
export interface ChatTurnInput {
  ctx: ToolContext;
  history: Anthropic.MessageParam[];
  userMessage: string | Anthropic.MessageParam['content'];
  model?: string;
  maxTokens?: number;
  onToolResult?: (id: string, name: string, output: unknown) => void | Promise<void>;
}
```

Inside the loop, after each tool execution, call `await input.onToolResult?.(id, name, output)` before pushing the tool_result back into the message stream. Everything else about the helper's behavior stays the same.

### `atelier/app/api/chat/route.ts`

Replace the inline agent loop with `chatTurn(...)` driving the SSE stream. The route handler becomes:

```ts
for await (const event of chatTurn({
  ctx: { peekId, userId, sessionId },
  history,
  userMessage,
  model,
  onToolResult: async (id, name, output) => {
    sendSse({ kind: 'tool_result', id, output });
  },
})) {
  switch (event.type) {
    case 'text_delta':       sendSse({ kind: 'text', delta: event.text }); break;
    case 'tool_use_start':   sendSse({ kind: 'tool_call', id: event.id, name: event.name }); break;
    case 'message_end':      sendSse({ kind: 'turn_end', usage: event.usage }); break;
    case 'error':            sendSse({ kind: 'error', message: event.error.message }); break;
  }
}
```

Keep the access check, anon metering, and Zod parse at the top of the handler exactly as written. Keep the SSE encoding helper. Keep the `recordEvent('chat_turn', ...)` at the end.

### `atelier/lib/anthropic/tools/set_vibe.ts` and `atelier/lib/anthropic/tools/update_vibe.ts`

Remove the `as unknown as Vibe` casts now that packet 13 fixed the type. The tools should compile cleanly with `Vibe` imported from `@/db/schema/peeks` (or wherever it's exported).

If packet 13 has NOT merged at the time you run, leave the casts in place and note in `NOTES.md` that the cleanup is pending. Otherwise remove.

## Constraints

- TS strict. No `any`.
- After all edits, `npm run build` MUST be green end-to-end.
- Do not introduce new runtime imports in `lib/chat/sse-types.ts` — it's a pure-type module.
- Do not touch any other tools, schemas, components, or routes beyond the target paths.
- No narrative comments. Log any to `_packets/COMMENTS.md`.

## Reply format

Branch `claude/packet-17-chat-cleanup`, commit `packet 17: chat plumbing cleanup`, push. NOTES.md only if something unexpected surfaces.

Worker briefing (always apply): workspace check, code only, ambiguities in NOTES.md, minimal reply.
