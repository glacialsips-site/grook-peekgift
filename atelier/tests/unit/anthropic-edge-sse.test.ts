import { describe, expect, it } from 'vitest';
import { parseAnthropicStream } from '@/lib/anthropic-edge/sse';
import type { AnthropicStreamEvent } from '@/lib/anthropic-edge/types';

// One realistic SSE frame.
function frame(type: string, data: Record<string, unknown>): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

// A full realistic Anthropic stream: message_start, a text block, a ping (must
// be ignored), a tool_use block whose two input_json_delta chunks concatenate
// to valid JSON, message_delta(tool_use), message_stop.
function buildFixture(): string {
  return [
    frame('message_start', {
      type: 'message_start',
      message: { id: 'msg_abc123', model: 'claude-sonnet-4-6' },
    }),
    frame('content_block_start', {
      type: 'content_block_start',
      index: 0,
      content_block: { type: 'text', text: '' },
    }),
    frame('content_block_delta', {
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text: 'one ' },
    }),
    frame('content_block_delta', {
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text: 'sec' },
    }),
    frame('content_block_stop', { type: 'content_block_stop', index: 0 }),
    // ping must produce NO event
    frame('ping', { type: 'ping' }),
    frame('content_block_start', {
      type: 'content_block_start',
      index: 1,
      content_block: { type: 'tool_use', id: 'toolu_1', name: 'add_card' },
    }),
    frame('content_block_delta', {
      type: 'content_block_delta',
      index: 1,
      delta: { type: 'input_json_delta', partial_json: '{"title":' },
    }),
    frame('content_block_delta', {
      type: 'content_block_delta',
      index: 1,
      delta: { type: 'input_json_delta', partial_json: '"Wine"}' },
    }),
    frame('content_block_stop', { type: 'content_block_stop', index: 1 }),
    frame('message_delta', {
      type: 'message_delta',
      delta: { stop_reason: 'tool_use' },
    }),
    frame('message_stop', { type: 'message_stop' }),
  ].join('');
}

// Turn a string into a ReadableStream<Uint8Array>, enqueuing the bytes in a
// few arbitrary MID-FRAME splits to prove cross-chunk buffering works.
function streamFromString(
  s: string,
  splitOffsets: number[],
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(s);
  const cuts = [...splitOffsets, bytes.length].filter(
    (n) => n > 0 && n <= bytes.length,
  );
  cuts.sort((a, b) => a - b);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      let prev = 0;
      for (const cut of cuts) {
        if (cut <= prev) continue;
        controller.enqueue(bytes.slice(prev, cut));
        prev = cut;
      }
      if (prev < bytes.length) controller.enqueue(bytes.slice(prev));
      controller.close();
    },
  });
}

async function collect(
  stream: ReadableStream<Uint8Array>,
): Promise<AnthropicStreamEvent[]> {
  const out: AnthropicStreamEvent[] = [];
  for await (const ev of parseAnthropicStream(stream)) out.push(ev);
  return out;
}

describe('parseAnthropicStream', () => {
  it('parses a full realistic stream across mid-frame chunk splits', async () => {
    const fixture = buildFixture();
    // Cut points chosen to land in the middle of frames (and mid-JSON), so a
    // naive per-chunk parser would break here.
    const splits = [17, 120, 250, 410, fixture.length - 30];
    const events = await collect(streamFromString(fixture, splits));

    // No event should be a ping; assert the exact typed sequence instead.
    expect(events).toHaveLength(11);

    const e0 = events[0];
    expect(e0).toBeDefined();
    if (e0?.type !== 'message_start') throw new Error('expected message_start');
    expect(e0.messageId).toBe('msg_abc123');
    expect(e0.model).toBe('claude-sonnet-4-6');

    const e1 = events[1];
    if (e1?.type !== 'content_block_start') {
      throw new Error('expected content_block_start');
    }
    expect(e1.index).toBe(0);
    expect(e1.block).toEqual({ type: 'text', text: '' });

    const e2 = events[2];
    if (e2?.type !== 'text_delta') throw new Error('expected text_delta');
    expect(e2.text).toBe('one ');

    const e3 = events[3];
    if (e3?.type !== 'text_delta') throw new Error('expected text_delta');
    expect(e3.text).toBe('sec');

    const e4 = events[4];
    if (e4?.type !== 'content_block_stop') {
      throw new Error('expected content_block_stop');
    }
    expect(e4.index).toBe(0);

    // Next event must be the tool_use start — proving the ping produced NOTHING.
    const e5 = events[5];
    if (e5?.type !== 'content_block_start') {
      throw new Error('expected content_block_start (tool_use)');
    }
    expect(e5.index).toBe(1);
    expect(e5.block).toEqual({
      type: 'tool_use',
      id: 'toolu_1',
      name: 'add_card',
      input: {},
    });

    const e6 = events[6];
    if (e6?.type !== 'input_json_delta') {
      throw new Error('expected input_json_delta');
    }
    const e7 = events[7];
    if (e7?.type !== 'input_json_delta') {
      throw new Error('expected input_json_delta');
    }
    const combined = e6.partialJson + e7.partialJson;
    expect(JSON.parse(combined)).toEqual({ title: 'Wine' });

    const e8 = events[8];
    if (e8?.type !== 'content_block_stop') {
      throw new Error('expected content_block_stop');
    }
    expect(e8.index).toBe(1);

    const e9 = events[9];
    if (e9?.type !== 'message_delta') throw new Error('expected message_delta');
    expect(e9.stopReason).toBe('tool_use');

    const e10 = events[10];
    expect(e10?.type).toBe('message_stop');

    // Belt-and-suspenders: no ping leaked through under any type.
    expect(events.some((e) => (e as { type: string }).type === 'ping')).toBe(
      false,
    );
  });
});
