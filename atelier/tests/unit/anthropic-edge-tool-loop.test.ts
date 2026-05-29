import { describe, expect, it, vi } from 'vitest';
import {
  capToolResult,
  runToolLoop,
  type ToolLoopEvent,
} from '@/lib/anthropic-edge/tool-loop';
import type {
  AnthropicMessage,
  AnthropicToolResultBlock,
  AnthropicToolUseBlock,
} from '@/lib/anthropic-edge/types';
import type { CallAnthropic } from '@/lib/anthropic-edge/client';

function frame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// Build an SSE Response from raw frames (same framing as the sse test).
function sseResponse(frames: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(frames));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { 'content-type': 'text/event-stream' },
  });
}

// Turn #1: a text block "one sec" + a tool_use `set_hero` with input
// {recipientName:'Maya'}, stop_reason tool_use.
const TURN_TOOL_USE =
  frame('message_start', {
    type: 'message_start',
    message: { id: 'msg_1', model: 'claude-sonnet-4-6' },
  }) +
  frame('content_block_start', {
    type: 'content_block_start',
    index: 0,
    content_block: { type: 'text', text: '' },
  }) +
  frame('content_block_delta', {
    type: 'content_block_delta',
    index: 0,
    delta: { type: 'text_delta', text: 'one sec' },
  }) +
  frame('content_block_stop', { type: 'content_block_stop', index: 0 }) +
  frame('content_block_start', {
    type: 'content_block_start',
    index: 1,
    content_block: { type: 'tool_use', id: 'toolu_hero', name: 'set_hero' },
  }) +
  frame('content_block_delta', {
    type: 'content_block_delta',
    index: 1,
    delta: { type: 'input_json_delta', partial_json: '{"recipientName"' },
  }) +
  frame('content_block_delta', {
    type: 'content_block_delta',
    index: 1,
    delta: { type: 'input_json_delta', partial_json: ':"Maya"}' },
  }) +
  frame('content_block_stop', { type: 'content_block_stop', index: 1 }) +
  frame('message_delta', {
    type: 'message_delta',
    delta: { stop_reason: 'tool_use' },
  }) +
  frame('message_stop', { type: 'message_stop' });

// Turn #2: text-only "done!", stop_reason end_turn.
const TURN_TEXT =
  frame('message_start', {
    type: 'message_start',
    message: { id: 'msg_2', model: 'claude-sonnet-4-6' },
  }) +
  frame('content_block_start', {
    type: 'content_block_start',
    index: 0,
    content_block: { type: 'text', text: '' },
  }) +
  frame('content_block_delta', {
    type: 'content_block_delta',
    index: 0,
    delta: { type: 'text_delta', text: 'done!' },
  }) +
  frame('content_block_stop', { type: 'content_block_stop', index: 0 }) +
  frame('message_delta', {
    type: 'message_delta',
    delta: { stop_reason: 'end_turn' },
  }) +
  frame('message_stop', { type: 'message_stop' });

describe('runToolLoop', () => {
  it('runs a two-turn tool loop: dispatches, threads tool_result, ends on end_turn', async () => {
    let callCount = 0;
    const fakeCall: CallAnthropic = vi.fn(async () => {
      callCount += 1;
      return callCount === 1 ? sseResponse(TURN_TOOL_USE) : sseResponse(TURN_TEXT);
    });

    const dispatch = vi.fn(async () => ({ ok: true, summary: 'hero updated' }));

    const events: ToolLoopEvent[] = [];
    const seed: AnthropicMessage[] = [{ role: 'user', content: 'gift for Maya' }];

    const result = await runToolLoop({
      model: 'claude-sonnet-4-6',
      system: 'be helpful',
      messages: seed,
      tools: [
        {
          name: 'set_hero',
          input_schema: { type: 'object', properties: {} },
        },
      ],
      dispatch,
      onEvent: (e) => events.push(e),
      callAnthropic: fakeCall,
    });

    // dispatch called once with the assembled tool input.
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith('set_hero', { recipientName: 'Maya' });

    // Two model turns.
    expect(callCount).toBe(2);
    expect(result.iters).toBe(2);
    expect(result.stopReason).toBe('end_turn');

    // Seed not mutated.
    expect(seed).toHaveLength(1);

    // Assistant message carries the tool_use block.
    const assistantMsg = result.messages.find(
      (m) =>
        m.role === 'assistant' &&
        Array.isArray(m.content) &&
        m.content.some((b) => (b as { type: string }).type === 'tool_use'),
    );
    expect(assistantMsg).toBeDefined();
    const toolUse = (assistantMsg!.content as AnthropicToolUseBlock[]).find(
      (b) => b.type === 'tool_use',
    );
    expect(toolUse).toMatchObject({
      type: 'tool_use',
      id: 'toolu_hero',
      name: 'set_hero',
      input: { recipientName: 'Maya' },
    });

    // A following user message carries the tool_result with matching id.
    const resultMsg = result.messages.find(
      (m) =>
        m.role === 'user' &&
        Array.isArray(m.content) &&
        m.content.some((b) => (b as { type: string }).type === 'tool_result'),
    );
    expect(resultMsg).toBeDefined();
    const toolResult = (resultMsg!.content as AnthropicToolResultBlock[]).find(
      (b) => b.type === 'tool_result',
    );
    expect(toolResult?.tool_use_id).toBe('toolu_hero');
    expect(toolResult?.is_error).toBe(false);

    // Text deltas forwarded in order, and a tool_result event emitted.
    const texts = events
      .filter((e): e is Extract<ToolLoopEvent, { type: 'text' }> => e.type === 'text')
      .map((e) => e.text);
    expect(texts).toEqual(['one sec', 'done!']);
    expect(events.some((e) => e.type === 'tool_result')).toBe(true);
    expect(
      events.find((e) => e.type === 'tool_result'),
    ).toMatchObject({ type: 'tool_result', name: 'set_hero', ok: true });
  });

  it('capToolResult truncates payloads over 24KB', () => {
    const big = { blob: 'x'.repeat(30 * 1024) };
    const capped = capToolResult(big);
    expect(capped.truncated).toBe(true);
    expect(capped.bytes).toBeGreaterThan(24 * 1024);
    const parsed = JSON.parse(capped.content) as {
      truncated: boolean;
      original_bytes: number;
      head: string;
    };
    expect(parsed.truncated).toBe(true);
    expect(parsed.original_bytes).toBe(capped.bytes);
    expect(typeof parsed.head).toBe('string');
  });

  it('capToolResult passes through small payloads intact', () => {
    const small = { ok: true };
    const capped = capToolResult(small);
    expect(capped.truncated).toBe(false);
    expect(JSON.parse(capped.content)).toEqual(small);
  });
});
