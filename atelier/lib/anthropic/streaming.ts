import type Anthropic from '@anthropic-ai/sdk';

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

export async function* streamMessage(
  client: Anthropic,
  params: Anthropic.MessageStreamParams,
): AsyncGenerator<StreamEvent, void, void> {
  const stream = client.messages.stream(params);

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

  const toolUses: Map<number, ToolUseAccumulator> = new Map();

  stream.on('streamEvent', (event) => {
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
    let target: ToolUseAccumulator | undefined;
    for (const tu of toolUses.values()) {
      if (!target || tu.index < target.index) target = tu;
    }
    if (!target) return;
    void jsonSnapshot;
    push({
      type: 'tool_use_delta',
      id: target.id,
      partial_json: partialJson,
      index: target.index,
    });
  });

  stream.on('finalMessage', (message) => {
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
