// Edge-safe agentic tool loop for the Anthropic Messages API.
//
// Generalizes the loop in app/api/spine/chat/route.ts POST(): stream a model
// turn, assemble content blocks, dispatch any tool_use blocks, feed results
// back, repeat until the model stops or maxIters is hit. Pure Web APIs — safe
// on a Netlify Edge Function (Deno).

import { callAnthropic as defaultCallAnthropic } from '@/lib/anthropic-edge/client';
import { parseAnthropicStream } from '@/lib/anthropic-edge/sse';
import type { CallAnthropic } from '@/lib/anthropic-edge/client';
import type {
  AnthropicContentBlock,
  AnthropicMessage,
  AnthropicToolDef,
  AnthropicToolResultBlock,
  AnthropicToolUseBlock,
  StopReason,
} from '@/lib/anthropic-edge/types';

// Matches the node lib's MAX_TOOL_RESULT_BYTES (lib/anthropic/chat.ts). Bytes
// are measured as JS string length (UTF-16 code units), matching that lib's
// char-length convention rather than true UTF-8 byte count. Consistent on both
// sides; the cap is a guardrail, not an exact transport budget.
const MAX_TOOL_RESULT_BYTES = 24 * 1024;

export type ToolDispatch = (name: string, input: unknown) => Promise<unknown>;

export type ToolLoopEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | {
      type: 'tool_result';
      id: string;
      name: string;
      ok: boolean;
      bytes: number;
      truncated: boolean;
    }
  | { type: 'tool_batch_complete'; count: number };

export type RunToolLoopParams = {
  model: string;
  // String, or a thunk re-evaluated before EVERY model turn. The thunk form
  // lets a caller refresh the system prompt as tool calls mutate external
  // state (e.g. the spine route folds the live page state into the prompt each
  // iteration), so the model always sees current state, not the seed snapshot.
  system: string | (() => string);
  messages: AnthropicMessage[]; // seed; NOT mutated — we work on a copy
  tools: AnthropicToolDef[];
  dispatch: ToolDispatch;
  onEvent: (event: ToolLoopEvent) => void;
  maxIters?: number; // default 8
  maxTokens?: number; // default 1024
  apiKey?: string;
  baseUrl?: string;
  signal?: AbortSignal;
  callAnthropic?: CallAnthropic; // DI for tests; default = real callAnthropic
};

export type ToolLoopResult = {
  messages: AnthropicMessage[];
  stopReason: StopReason;
  iters: number;
};

export type CapToolResult = {
  content: string;
  bytes: number;
  truncated: boolean;
};

// Serialize a tool payload, capping at 24KB. On overflow, retain the head and
// wrap it with recovery metadata so the model can still react. Handles
// JSON.stringify throwing (e.g. circular refs).
export function capToolResult(payload: unknown): CapToolResult {
  let serialized: string;
  try {
    serialized = JSON.stringify(payload);
  } catch {
    const content = JSON.stringify({ error: 'serialization_failed' });
    return { content, bytes: content.length, truncated: false };
  }
  // JSON.stringify returns undefined for inputs like a bare `undefined` or a
  // function; treat that as an empty-object payload to keep `content` a string.
  if (typeof serialized !== 'string') {
    const content = JSON.stringify({ error: 'serialization_returned_undefined' });
    return { content, bytes: content.length, truncated: false };
  }
  const bytes = serialized.length;
  if (bytes <= MAX_TOOL_RESULT_BYTES) {
    return { content: serialized, bytes, truncated: false };
  }
  const content = JSON.stringify({
    truncated: true,
    original_bytes: bytes,
    note: 'tool output exceeded 24KB; head retained for model recovery',
    head: serialized.slice(0, MAX_TOOL_RESULT_BYTES - 200),
  });
  return { content, bytes, truncated: true };
}

// Per-iteration accumulator: stream the model turn into ordered content blocks.
type AssembledTurn = {
  blocks: AnthropicContentBlock[];
  stopReason: StopReason;
};

async function assembleTurn(
  body: ReadableStream<Uint8Array>,
  onText: (text: string) => void,
): Promise<AssembledTurn> {
  // Index-keyed maps preserve wire ordering even if indices arrive sparsely.
  const blocksByIndex = new Map<number, AnthropicContentBlock>();
  const partialsByIndex = new Map<number, string>();
  let stopReason: StopReason = null;

  for await (const event of parseAnthropicStream(body)) {
    switch (event.type) {
      case 'message_start':
        break;
      case 'content_block_start':
        blocksByIndex.set(event.index, event.block);
        if (event.block.type === 'tool_use') {
          partialsByIndex.set(event.index, '');
        }
        break;
      case 'text_delta': {
        const block = blocksByIndex.get(event.index);
        if (block && block.type === 'text') {
          block.text += event.text;
        }
        // Forward incremental text immediately for live streaming.
        onText(event.text);
        break;
      }
      case 'input_json_delta': {
        const prev = partialsByIndex.get(event.index) ?? '';
        partialsByIndex.set(event.index, prev + event.partialJson);
        break;
      }
      case 'content_block_stop': {
        const block = blocksByIndex.get(event.index);
        if (block && block.type === 'tool_use') {
          const raw = partialsByIndex.get(event.index) ?? '';
          try {
            block.input = raw ? (JSON.parse(raw) as unknown) : {};
          } catch {
            block.input = {};
          }
        }
        break;
      }
      case 'message_delta':
        stopReason = event.stopReason;
        break;
      case 'message_stop':
        break;
      default:
        break;
    }
  }

  // Emit blocks in ascending index order.
  const blocks = [...blocksByIndex.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, block]) => block);

  return { blocks, stopReason };
}

export async function runToolLoop(
  params: RunToolLoopParams,
): Promise<ToolLoopResult> {
  const {
    model,
    system,
    tools,
    dispatch,
    onEvent,
    maxIters = 8,
    maxTokens = 1024,
    apiKey,
    baseUrl,
    signal,
  } = params;
  const call = params.callAnthropic ?? defaultCallAnthropic;

  // Work on a copy; the seed array passed by the caller is never mutated.
  const messages: AnthropicMessage[] = [...params.messages];
  let stopReason: StopReason = null;
  let iters = 0;

  for (let i = 0; i < maxIters; i++) {
    iters = i + 1;

    // Re-resolve the system prompt each turn so a thunk can reflect state that
    // tool dispatch mutated on the previous iteration.
    const resolvedSystem = typeof system === 'function' ? system() : system;

    const res = await call({
      model,
      system: resolvedSystem,
      messages,
      tools,
      max_tokens: maxTokens,
      stream: true,
      apiKey,
      baseUrl,
      signal,
    });

    // callAnthropic already guarantees a body when stream:true, but guard for
    // the (impossible-by-contract) null to satisfy strict types.
    if (!res.body) {
      throw new Error('anthropic_no_body: streaming response had no body');
    }

    const { blocks, stopReason: turnStop } = await assembleTurn(
      res.body,
      (text) => onEvent({ type: 'text', text }),
    );
    stopReason = turnStop;

    messages.push({ role: 'assistant', content: blocks });

    const toolUses = blocks.filter(
      (b): b is AnthropicToolUseBlock => b.type === 'tool_use',
    );

    if (stopReason !== 'tool_use' || toolUses.length === 0) break;

    const toolResultBlocks: AnthropicToolResultBlock[] = [];
    for (const tu of toolUses) {
      onEvent({ type: 'tool_use', id: tu.id, name: tu.name, input: tu.input });

      let payload: unknown;
      let ok: boolean;
      try {
        payload = await dispatch(tu.name, tu.input);
        ok = true;
      } catch (err) {
        payload = {
          error: err instanceof Error ? err.message : String(err),
        };
        ok = false;
      }

      const { content, bytes, truncated } = capToolResult(payload);
      onEvent({
        type: 'tool_result',
        id: tu.id,
        name: tu.name,
        ok,
        bytes,
        truncated,
      });

      toolResultBlocks.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content,
        is_error: !ok,
      });
    }

    onEvent({ type: 'tool_batch_complete', count: toolResultBlocks.length });
    messages.push({ role: 'user', content: toolResultBlocks });
  }

  return { messages, stopReason, iters };
}
