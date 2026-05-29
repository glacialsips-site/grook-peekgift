// Edge-safe Server-Sent-Events parser for the Anthropic streaming wire.
//
// Ported from app/api/spine/chat/route.ts modelTurn() and generalized into a
// reusable async generator. Only Web APIs (ReadableStream, TextDecoder) — safe
// on a Netlify Edge Function (Deno).

import type {
  AnthropicContentBlock,
  AnthropicStreamEvent,
} from '@/lib/anthropic-edge/types';

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined;
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return typeof v === 'object' && v !== null
    ? (v as Record<string, unknown>)
    : undefined;
}

// Build the seed content block emitted on content_block_start. Returns
// undefined for block types we don't model (caller skips emitting an event).
function seedBlock(cb: Record<string, unknown>): AnthropicContentBlock | undefined {
  const cbType = cb['type'];
  if (cbType === 'text') {
    return { type: 'text', text: '' };
  }
  if (cbType === 'tool_use') {
    const id = asString(cb['id']);
    const name = asString(cb['name']);
    if (id === undefined || name === undefined) return undefined;
    return { type: 'tool_use', id, name, input: {} };
  }
  return undefined;
}

// Map a single parsed wire event to a typed stream event, or undefined to skip.
function mapEvent(ev: Record<string, unknown>): AnthropicStreamEvent | undefined {
  const t = ev['type'];
  switch (t) {
    case 'message_start': {
      const msg = asRecord(ev['message']);
      if (!msg) return undefined;
      const messageId = asString(msg['id']) ?? '';
      const model = asString(msg['model']) ?? '';
      return { type: 'message_start', messageId, model };
    }
    case 'content_block_start': {
      const index = asNumber(ev['index']);
      const cb = asRecord(ev['content_block']);
      if (index === undefined || !cb) return undefined;
      const block = seedBlock(cb);
      if (!block) return undefined;
      return { type: 'content_block_start', index, block };
    }
    case 'content_block_delta': {
      const index = asNumber(ev['index']);
      const delta = asRecord(ev['delta']);
      if (index === undefined || !delta) return undefined;
      const deltaType = delta['type'];
      if (deltaType === 'text_delta') {
        const text = asString(delta['text']);
        if (text === undefined) return undefined;
        return { type: 'text_delta', index, text };
      }
      if (deltaType === 'input_json_delta') {
        const partialJson = asString(delta['partial_json']);
        if (partialJson === undefined) return undefined;
        return { type: 'input_json_delta', index, partialJson };
      }
      return undefined;
    }
    case 'content_block_stop': {
      const index = asNumber(ev['index']);
      if (index === undefined) return undefined;
      return { type: 'content_block_stop', index };
    }
    case 'message_delta': {
      const delta = asRecord(ev['delta']);
      const stopReasonRaw = delta ? delta['stop_reason'] : undefined;
      const stopReason =
        typeof stopReasonRaw === 'string' ? stopReasonRaw : null;
      return { type: 'message_delta', stopReason };
    }
    case 'message_stop': {
      return { type: 'message_stop' };
    }
    default:
      return undefined;
  }
}

// Extract the JSON payload from one SSE frame, or undefined if the frame
// carries no usable data (comment line, ping, [DONE], empty).
function extractFrameJson(frame: string): string | undefined {
  const dataLine = frame.split('\n').find((l) => l.startsWith('data:'));
  if (!dataLine) return undefined;
  const json = dataLine.slice('data:'.length).trim();
  if (!json || json === '[DONE]') return undefined;
  return json;
}

export async function* parseAnthropicStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<AnthropicStreamEvent, void, void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Split complete frames on the SSE record separator; keep the trailing
      // partial frame in the buffer for the next read.
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        // Skip SSE comment-only frames (e.g. ": ping" or the open marker).
        // extractFrameJson already ignores comment lines because they don't
        // start with "data:", but bail early when there's no data line.
        const json = extractFrameJson(frame);
        if (json === undefined) continue;

        let ev: Record<string, unknown>;
        try {
          ev = JSON.parse(json) as Record<string, unknown>;
        } catch {
          continue; // skip frames that fail to parse
        }

        // `ping` events carry type:'ping' and no useful payload — mapEvent
        // returns undefined for them, so they produce no stream event.
        const mapped = mapEvent(ev);
        if (mapped !== undefined) yield mapped;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
