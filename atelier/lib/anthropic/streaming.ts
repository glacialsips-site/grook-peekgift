import type Anthropic from '@anthropic-ai/sdk';

/**
 * Public, normalized stream event surface. We collapse the SDK's raw
 * `RawMessageStreamEvent` union into a smaller set of cases that the chat
 * route + UI care about: text deltas, tool-use lifecycle, and final usage.
 */
export type StreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'thinking_delta'; text: string }
  | { type: 'tool_use_start'; id: string; name: string; index: number }
  | { type: 'tool_use_delta'; id: string; partial_json: string; index: number }
  | { type: 'tool_use_end'; id: string; index: number; input: unknown }
  | { type: 'message_end'; usage: Anthropic.Usage; stop_reason: Anthropic.StopReason | null; message: Anthropic.Message }
  | { type: 'error'; error: Error };

interface ToolUseAccumulator {
  id: string;
  name: string;
  index: number;
}

/**
 * Wrap `client.messages.stream(params)` and yield normalized events. The
 * generator drains the SDK's typed event API (`on('text', ...)`,
 * `on('inputJson', ...)`, `on('contentBlock', ...)`, `on('finalMessage', ...)`)
 * and bridges into an async iterator.
 *
 * Errors are emitted as `{ type: 'error', error }` and terminate the
 * generator; the underlying SDK stream is aborted automatically when the
 * consumer breaks out of the loop.
 */
export async function* streamMessage(
  client: Anthropic,
  params: Anthropic.MessageStreamParams,
): AsyncGenerator<StreamEvent, void, void> {
  const stream = client.messages.stream(params);

  // Event queue + a pending resolver so we can bridge the SDK's emitter API
  // into an `AsyncGenerator`. The SDK fires listeners synchronously from its
  // internal loop; we buffer and yield in order.
  const queue: StreamEvent[] = [];
  let done = false;
  let pendingResolve: (() => void) | null = null;

  const wake = (): void => {
    if (pendingResolve) {
      const resolve = pendingResolve;
      pendingResolve = null;
      resolve();
    }
  };

  const push = (event: StreamEvent): void => {
    queue.push(event);
    wake();
  };

  // Track tool_use blocks by content-block index so we can emit
  // structured start / delta / end events.
  const toolUses: Map<number, ToolUseAccumulator> = new Map();

  stream.on('streamEvent', (event) => {
    // Handle the structured per-block lifecycle here so we can track tool_use
    // indices. We do NOT emit text/inputJson here — those come from the
    // dedicated `text` / `inputJson` listeners which already deliver deltas.
    if (event.type === 'content_block_start') {
      const block = event.content_block;
      if (block.type === 'tool_use') {
        toolUses.set(event.index, {
          id: block.id,
          name: block.name,
          index: event.index,
        });
        push({
          type: 'tool_use_start',
          id: block.id,
          name: block.name,
          index: event.index,
        });
      }
      return;
    }
    if (event.type === 'content_block_stop') {
      const tu = toolUses.get(event.index);
      if (tu) {
        // The full parsed input is available on the snapshot once the block
        // closes; we capture it from finalMessage as well, but emit a
        // best-effort end event here so consumers can mark the tool as
        // dispatchable as soon as the model finishes streaming it.
        push({
          type: 'tool_use_end',
          id: tu.id,
          index: tu.index,
          input: undefined,
        });
        toolUses.delete(event.index);
      }
      return;
    }
  });

  stream.on('text', (textDelta) => {
    push({ type: 'text_delta', text: textDelta });
  });

  stream.on('thinking', (thinkingDelta) => {
    push({ type: 'thinking_delta', text: thinkingDelta });
  });

  stream.on('inputJson', (partialJson, jsonSnapshot) => {
    // The SDK doesn't pass us the content-block index on this event, but the
    // model only streams input_json for one tool_use at a time per content
    // block. Find the most recently started open tool_use and attribute the
    // delta to it. If multiple are open we fall back to the lowest index.
    let target: ToolUseAccumulator | undefined;
    for (const tu of toolUses.values()) {
      if (!target || tu.index < target.index) target = tu;
    }
    if (!target) return;
    // We pass jsonSnapshot through opaquely; consumers can either reparse the
    // partial_json themselves or wait for the final tool_use_end with input.
    void jsonSnapshot;
    push({
      type: 'tool_use_delta',
      id: target.id,
      partial_json: partialJson,
      index: target.index,
    });
  });

  stream.on('finalMessage', (message) => {
    // Re-emit tool_use_end with parsed inputs from the final message so
    // downstream callers don't have to reparse partial JSON.
    for (const [index, block] of message.content.entries()) {
      if (block.type === 'tool_use') {
        push({
          type: 'tool_use_end',
          id: block.id,
          index,
          input: block.input,
        });
      }
    }
    push({
      type: 'message_end',
      usage: message.usage,
      stop_reason: message.stop_reason,
      message,
    });
  });

  stream.on('error', (error) => {
    push({
      type: 'error',
      error: error instanceof Error ? error : new Error(String(error)),
    });
    done = true;
    wake();
  });

  stream.on('abort', (error) => {
    push({
      type: 'error',
      error: error instanceof Error ? error : new Error(String(error)),
    });
    done = true;
    wake();
  });

  stream.on('end', () => {
    done = true;
    wake();
  });

  try {
    while (true) {
      if (queue.length > 0) {
        const event = queue.shift();
        if (event !== undefined) {
          yield event;
          if (event.type === 'error') return;
          continue;
        }
      }
      if (done) return;
      await new Promise<void>((resolve) => {
        pendingResolve = resolve;
      });
    }
  } finally {
    if (!done) {
      stream.abort();
    }
  }
}
