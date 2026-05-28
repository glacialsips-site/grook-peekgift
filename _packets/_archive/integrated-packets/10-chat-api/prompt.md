# Packet 10 — Chat API route (streaming + tool-use loop)

- **Worker:** cc-on-web | webchat-opus
- **Branch:** `claude/packet-10-chat-api`
- **Depends on (sequencing):** `atelier-integration`
- **Imports from siblings:** `@/lib/anthropic`, `@/lib/anthropic/tools`, `@/lib/anthropic/system-prompt`, `@/lib/auth/server`, `@/lib/supabase/service`, `@/lib/env`
- **Validation:** `cd atelier && npm install && npm run typecheck` (cross-packet imports — see PROTOCOL.md)
- **Target paths:** `atelier/app/api/chat/route.ts`, `atelier/app/api/chat/schema.ts`, `atelier/lib/chat/session.ts`

## Context

The chat API is the user-facing entry point for Peek's conversational build experience. The browser POSTs `{ peekId, sessionId, history, userMessage }` to `/api/chat`, the route streams Claude's response back as **Server-Sent Events** (SSE) with typed event types the client knows how to render (text deltas, tool-use indicators, message-end with usage). Inside the route, an agent loop calls Claude → if tool calls appear, executes them via the registry → feeds tool results back → re-streams → until `stop_reason !== 'tool_use'`. Every turn and tool call is logged to the `events` table for analytics + replay + LLM observability.

Anonymous (signed-out) callers get rate-limited and metered: a soft cap of 5 substantive turns before a 401 with a `signup_required` body. Signed-in callers are gated only by Upstash rate limit (drafted separately — for now, stub the rate-limit as always-allow). Peek ownership is enforced: the `peekId` must belong to the caller (or be a draft owned by the anonymous `sessionId`).

This packet is **API-only**. The chat UI is packet 12. The actual tool implementations (set_recipient, add_card, etc.) are packet 11 — they'll register themselves into `TOOL_REGISTRY` and this route picks them up automatically via `getToolSchemas()`.

## Deliver

### `atelier/app/api/chat/schema.ts`

Zod schemas for the request body and the SSE event union. Use **Zod 4** syntax.

```ts
import { z } from 'zod';

export const ChatRequestSchema = z.object({
  peekId: z.string().uuid(),
  sessionId: z.string().min(1),
  history: z.array(z.unknown()),                  // Anthropic.MessageParam[]; opaque at schema level
  userMessage: z.union([z.string(), z.array(z.unknown())]),  // string or content blocks (vision)
  model: z.string().optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export type SseEvent =
  | { kind: 'text'; delta: string }
  | { kind: 'tool_call'; id: string; name: string; input?: unknown }
  | { kind: 'tool_result'; id: string; output: unknown }
  | { kind: 'turn_end'; usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number } }
  | { kind: 'error'; message: string };
```

### `atelier/lib/chat/session.ts`

Helpers used by the route.

```ts
import 'server-only';
import { getSupabaseService } from '@/lib/supabase/service';

export async function recordEvent(input: {
  peekId: string;
  userId: string | null;
  sessionId: string;
  kind: string;
  payload?: Record<string, unknown>;
}): Promise<void> { /* insert into peek_v2.events; swallow errors (log only) */ }

export async function assertPeekAccess(opts: {
  peekId: string;
  userId: string | null;
  sessionId: string;
}): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'forbidden' }> {
  // Look up peek; if user is signed in and curator_id matches → ok.
  // If user is anonymous and peek.curator_id is null AND peek's anonymous_session_id (or a draft-token row) matches sessionId → ok.
  // Else forbidden / not_found.
}

export async function anonymousTurnCount(sessionId: string): Promise<number> {
  // Count rows in peek_v2.events where session_id = sessionId and kind = 'chat_turn' and user_id is null.
}

const ANON_TURN_CAP = 5;
export function anonymousTurnExceeded(count: number): boolean {
  return count >= ANON_TURN_CAP;
}
```

If the schema doesn't yet have an "anonymous_session_id" column for peeks, use a temporary `metadata.anonymous_session_id` jsonb field — note the deviation in NOTES.md. A future schema-fix packet can promote it to a real column.

### `atelier/app/api/chat/route.ts`

POST handler. Pseudocode (worker fleshes out):

```ts
import { NextRequest } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import { anthropic, DEFAULT_MODEL } from '@/lib/anthropic';
import { getSystemPrompt } from '@/lib/anthropic/system-prompt';
import { getToolSchemas, runTool } from '@/lib/anthropic/tools';
import '@/lib/anthropic/tools/bootstrap';
import { streamMessage } from '@/lib/anthropic/streaming';
import { getUserId } from '@/lib/auth/server';
import { ChatRequestSchema, type SseEvent } from './schema';
import { assertPeekAccess, anonymousTurnCount, anonymousTurnExceeded, recordEvent } from '@/lib/chat/session';

export const runtime = 'nodejs';
export const maxDuration = 300;          // long-running SSE

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  const json = await req.json();
  const parsed = ChatRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: 'bad_request', issues: parsed.error.flatten() }, { status: 400 });
  }
  const { peekId, sessionId, history, userMessage, model } = parsed.data;

  // Access check
  const access = await assertPeekAccess({ peekId, userId, sessionId });
  if (!access.ok) {
    return Response.json({ error: access.reason }, { status: access.reason === 'forbidden' ? 403 : 404 });
  }

  // Anonymous metering
  if (!userId) {
    const count = await anonymousTurnCount(sessionId);
    if (anonymousTurnExceeded(count)) {
      return Response.json({ error: 'signup_required', anonymous_turns_used: count }, { status: 401 });
    }
  }

  // SSE stream
  const stream = new ReadableStream<Uint8Array>({ start: async (controller) => { ... } });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
```

Inside the SSE generator:

1. Encode each SseEvent as `event: <kind>\ndata: <json>\n\n` and enqueue.
2. Build `messages = [...history, { role: 'user', content: userMessage }]`.
3. Loop (max 10 iterations):
   a. Call `streamMessage(anthropic, { model: model ?? DEFAULT_MODEL, max_tokens: 4096, system: getSystemPrompt({ curatorName: ... }), tools: getToolSchemas(), messages })`.
   b. For each event: text deltas → emit `{kind:'text', delta}`; tool_use_start → emit `{kind:'tool_call', id, name}`; collect tool_use inputs; on stream end emit `{kind:'turn_end', usage}`.
   c. If `finalMessage.stop_reason === 'tool_use'`: collect all tool_use blocks from the final message, execute each via `runTool(name, input, { peekId, userId, sessionId })`, append assistant message + a user message of `{ role:'user', content: [{ type:'tool_result', tool_use_id: id, content: JSON.stringify(output) }, ...] }` to `messages`. Emit `{kind:'tool_result', id, output}` per executed tool. Continue loop.
   d. Else: break.
4. `recordEvent({ kind: 'chat_turn', payload: { tokens_in, tokens_out, tool_calls } })`.
5. Close the stream.

Catch errors at every layer and emit `{kind:'error', message}` then close.

## Constraints

- TS strict. No `any`. Use the SDK's typed event interface.
- Anthropic SDK 0.98: events on `MessageStream` are `streamEvent` / `text` / `thinking` / `inputJson` / `finalMessage` / `error` / `abort` / `end`. `Anthropic.Tool.InputSchema` is the (namespaced) type for tool schemas — use it.
- Supabase service client is already schema-scoped to `peek_v2` — call `getSupabaseService().from('events')` etc., no `.schema()` chaining.
- Do NOT modify `package.json`, anything inside `lib/anthropic/`, `lib/supabase/`, `lib/auth/`, or unrelated files.
- No narrative comments. Log any necessary comments to `_packets/COMMENTS.md`.

## Reply format

Branch `claude/packet-10-chat-api`, commit `packet 10: chat api`, push. NOTES.md if deviations.

Worker briefing (always apply): workspace check, code only, ambiguities in NOTES.md, minimal reply.
