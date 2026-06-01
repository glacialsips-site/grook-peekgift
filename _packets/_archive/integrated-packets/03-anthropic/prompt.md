# Packet 03 — Anthropic client + tool registry skeleton

- **Worker:** cc-on-web | webchat-opus
- **Branch:** `claude/packet-03-anthropic`
- **Depends on:** packet 01 merged
- **Estimated tokens:** ~30k
- **Target paths:** `atelier/lib/anthropic/**`

## Context

The chat-driven build experience is the core surface of peek.gift. Claude ("Peek") talks to the curator, calls tools that mutate the in-flight `Peek` document (set vibe, add card, scrape URL, generate hero image, etc.), and streams responses back. This packet creates the typed client wrapper, streaming helper, system prompt, and tool registry skeleton. Actual tool *implementations* land in a later packet — this one just defines the registry pattern and a couple of trivial example tools so the contract is exercised.

The wrapper must enable: (1) prompt caching on the system prompt + persistent context blocks, (2) tool use, (3) streaming with delta + tool_use parsing, (4) vision (image input), (5) extended thinking when requested. Default model: `claude-opus-4-7`. Allow override per-call.

## Inputs

None.

## Deliver

### `atelier/lib/anthropic/client.ts`

```ts
import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';

export const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
  defaultHeaders: { 'anthropic-beta': 'prompt-caching-2024-07-31' },
});

export const DEFAULT_MODEL = 'claude-opus-4-7';
export const FAST_MODEL = 'claude-haiku-4-5';
```

If `ANTHROPIC_API_KEY` is missing, log warning but don't throw at import (some build phases run without secrets). Throw at first call instead.

### `atelier/lib/anthropic/system-prompt.ts`

Peek's persona is **witty best friend** — bantery, busts your chops a little, sharp taste, not corporate. Mirrors the product's energy. Export a `getSystemPrompt(opts)` that returns the system as a `string` and a `cacheControl` block configuration suitable for `messages.create({ system: [...] })` with `cache_control: { type: 'ephemeral' }` on the static portion.

```ts
export function getSystemPrompt(opts: { curatorName?: string }): Anthropic.MessageParam['content'] {
  const staticPart = `You are Peek — a sharp-eyed, slightly mischievous best friend helping someone build a personalized gift page for someone they care about. Your job: ...`;
  // continue: full persona, tool-use rules, conversation principles, anti-patterns
  return [
    { type: 'text', text: staticPart, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: `Curator's name (if known): ${opts.curatorName ?? '(unknown)'}` },
  ];
}
```

Write a ~500-word system prompt covering: the product (gift page builder), the chat-flow expectations (gather recipient + occasion → vibe → hero → note → cards → rules → ready), tool-use directive (call tools proactively, idempotently, don't ask permission), tone (witty/warm, never sycophantic, occasionally bust chops), refusal posture (decline only safety boundary stuff, otherwise lean in), and one paragraph of golden examples.

### `atelier/lib/anthropic/tools/index.ts`

Tool registry pattern. Each tool is a `{ name, description, input_schema, handler }` object. Registry maps name → tool. Caller invokes `runTool(name, input, ctx)`.

```ts
import type Anthropic from '@anthropic-ai/sdk';

export interface ToolContext {
  peekId: string;
  userId: string | null;
  sessionId: string;
}

export interface ToolDefinition<Input = unknown, Output = unknown> {
  name: string;
  description: string;
  input_schema: Anthropic.Tool['input_schema'];
  handler: (input: Input, ctx: ToolContext) => Promise<Output>;
}

export const TOOL_REGISTRY = new Map<string, ToolDefinition>();

export function registerTool<I, O>(t: ToolDefinition<I, O>): void {
  TOOL_REGISTRY.set(t.name, t as ToolDefinition);
}

export function getToolSchemas(): Anthropic.Tool[] {
  return Array.from(TOOL_REGISTRY.values()).map(({ name, description, input_schema }) => ({
    name, description, input_schema,
  }));
}

export async function runTool(name: string, input: unknown, ctx: ToolContext): Promise<unknown> {
  const tool = TOOL_REGISTRY.get(name);
  if (!tool) throw new Error(`unknown tool: ${name}`);
  return tool.handler(input as never, ctx);
}
```

### `atelier/lib/anthropic/tools/ping.ts`

A trivial example tool to prove the registry works:

```ts
import { z } from 'zod';
import { registerTool } from './index';

registerTool({
  name: 'ping',
  description: 'Health-check tool. Returns pong with timestamp.',
  input_schema: { type: 'object', properties: {} },
  handler: async () => ({ pong: true, at: new Date().toISOString() }),
});
```

### `atelier/lib/anthropic/tools/bootstrap.ts`

Side-effect import that loads all tools. Other code imports this once to populate the registry:

```ts
import './ping';
// later: import './set-recipient'; import './add-card'; etc.
```

### `atelier/lib/anthropic/streaming.ts`

Helper that wraps `messages.stream()` and yields a typed event stream:

```ts
import type Anthropic from '@anthropic-ai/sdk';

export type StreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_use_start'; id: string; name: string }
  | { type: 'tool_use_delta'; id: string; partial_json: string }
  | { type: 'tool_use_end'; id: string }
  | { type: 'message_end'; usage: Anthropic.Usage }
  | { type: 'error'; error: Error };

export async function* streamMessage(
  client: Anthropic,
  params: Anthropic.MessageCreateParamsStreaming
): AsyncGenerator<StreamEvent, void, void> {
  const stream = client.messages.stream(params);
  // parse stream.on events into the StreamEvent generator
  // handle text deltas, tool_use blocks (start/delta/end), final message_stop with usage
  // yield events as they arrive
  // ...
}
```

Implement the body using the SDK's `MessageStream` event handlers (`on('text', ...)`, `on('inputJson', ...)`, `on('message', ...)`, etc.). The exact event names depend on the SDK version (^0.65.0) — use the SDK's typed event interface, not raw stream parsing.

### `atelier/lib/anthropic/chat.ts`

High-level convenience for one turn of the agent loop:

```ts
import type Anthropic from '@anthropic-ai/sdk';
import { anthropic, DEFAULT_MODEL } from './client';
import { getSystemPrompt } from './system-prompt';
import { getToolSchemas, runTool, type ToolContext } from './tools';
import './tools/bootstrap';
import { streamMessage, type StreamEvent } from './streaming';

export interface ChatTurnInput {
  ctx: ToolContext;
  history: Anthropic.MessageParam[];
  userMessage: string | Anthropic.MessageParam['content'];
  model?: string;
  maxTokens?: number;
}

export async function* chatTurn(input: ChatTurnInput): AsyncGenerator<StreamEvent, Anthropic.MessageParam[]> {
  // build messages: history + new user turn
  // call streamMessage with tools, system prompt
  // yield events
  // if tool_use blocks appear, after stream ends: run each tool, append tool_result to messages, loop until no more tool calls
  // return final history (caller persists)
}
```

Cap the tool-use loop at 10 iterations to prevent runaway. Include token usage tracking per iteration.

### `atelier/lib/anthropic/index.ts`

Barrel re-exporting `anthropic`, `chatTurn`, `streamMessage`, `getSystemPrompt`, `registerTool`, `runTool`, `getToolSchemas`, `TOOL_REGISTRY`, types.

## Constraints

- Do not modify `package.json`, `lib/env.ts`, or anything outside `atelier/lib/anthropic/`.
- TS strict. Use the SDK's typed `Anthropic.*` types throughout — no `any`.
- The system prompt must be a real, substantive ~500 words. Not a placeholder.
- No actual implementations of the product tools (`set_recipient`, `add_card`, etc.) — only the `ping` example.

## Validation

```bash
cd atelier && npm install && npm run build
```

## Reply format

cc-on-web: branch `claude/packet-03-anthropic`, commit `packet 03: anthropic`, push.
webchat-opus: zip `03-anthropic-deliverable.zip` with files at paths relative to `atelier/`. `NOTES.md` for deviations.

Keep your text reply minimal.
