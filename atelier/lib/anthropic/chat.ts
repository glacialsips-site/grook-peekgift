import type Anthropic from '@anthropic-ai/sdk';
import { anthropic, assertAnthropicConfigured, DEFAULT_MODEL } from './client';
import { getSystemPrompt, type SystemPromptOptions } from './system-prompt';
import { getToolSchemas, runTool, type ToolContext } from './tools/index';
import './tools/bootstrap';
import { streamMessage, type StreamEvent } from './streaming';

const MAX_TOOL_ITERATIONS = 10;
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Per-iteration usage record so callers can attribute tokens to chat turns.
 */
export interface IterationUsage {
  iteration: number;
  usage: Anthropic.Usage;
  stop_reason: Anthropic.StopReason | null;
}

export interface ChatTurnInput {
  ctx: ToolContext;
  /** Full prior message history. The new user turn is appended internally. */
  history: Anthropic.MessageParam[];
  /**
   * The new user input. A bare string is sugar for a single text block;
   * passing an array allows multi-modal (image + text) input.
   */
  userMessage: string | Anthropic.ContentBlockParam[];
  /** Override default model (claude-opus-4-7). */
  model?: string;
  /** Override default max_tokens. */
  maxTokens?: number;
  /** System prompt customizations (curator name, peek summary). */
  systemPromptOptions?: SystemPromptOptions;
  /**
   * Optional thinking config. When passed, extended thinking is enabled and
   * thinking deltas appear as `thinking_delta` stream events.
   */
  thinking?: Anthropic.ThinkingConfigParam;
  /**
   * Called after each successful or failed tool execution, before the
   * tool_result block is appended back into the message stream. Lets callers
   * surface tool outputs to the UI (e.g. as SSE events) without re-implementing
   * the agent loop.
   */
  onToolResult?: (
    id: string,
    name: string,
    output: unknown,
  ) => void | Promise<void>;
}

/**
 * The completed-turn return value. The generator yields stream events and
 * resolves with the final message history (caller persists) and per-iteration
 * usage metrics.
 */
export interface ChatTurnResult {
  history: Anthropic.MessageParam[];
  iterations: IterationUsage[];
}

interface PendingToolCall {
  id: string;
  name: string;
  input: unknown;
}

/**
 * Run one conversational turn. Streams the assistant response; when the model
 * emits `tool_use` blocks, runs them server-side, appends `tool_result`
 * messages, and loops until the model returns a non-tool stop_reason (or we
 * hit {@link MAX_TOOL_ITERATIONS}).
 *
 * Usage:
 * ```ts
 * const turn = chatTurn({ ctx, history, userMessage: 'hi' });
 * for await (const event of turn) {
 *   // stream events to the client
 * }
 * const { history: nextHistory } = await turn.return(undefined as never);
 * ```
 *
 * Or, more idiomatically, collect the final value from a wrapper that knows
 * the generator's return type — TypeScript narrows `AsyncGenerator<E, R>`
 * properly when iterated by hand.
 */
export async function* chatTurn(
  input: ChatTurnInput,
): AsyncGenerator<StreamEvent, ChatTurnResult, void> {
  assertAnthropicConfigured();

  const model = input.model ?? DEFAULT_MODEL;
  const maxTokens = input.maxTokens ?? DEFAULT_MAX_TOKENS;
  const tools = getToolSchemas();
  const system = getSystemPrompt(input.systemPromptOptions ?? {});

  const userContent: Anthropic.ContentBlockParam[] =
    typeof input.userMessage === 'string'
      ? [{ type: 'text', text: input.userMessage }]
      : input.userMessage;

  const messages: Anthropic.MessageParam[] = [
    ...input.history,
    { role: 'user', content: userContent },
  ];

  const iterations: IterationUsage[] = [];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const params: Anthropic.MessageStreamParams = {
      model,
      max_tokens: maxTokens,
      system,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      ...(input.thinking ? { thinking: input.thinking } : {}),
    };

    let finalMessage: Anthropic.Message | undefined;
    const pendingToolCalls: PendingToolCall[] = [];

    for await (const event of streamMessage(anthropic, params)) {
      yield event;
      if (event.type === 'message_end') {
        finalMessage = event.message;
        iterations.push({
          iteration: i,
          usage: event.usage,
          stop_reason: event.stop_reason,
        });
      } else if (event.type === 'error') {
        // Stream surfaced an error; propagate by stopping the loop. The
        // caller already saw the `error` event.
        return { history: messages, iterations };
      }
    }

    if (!finalMessage) {
      // Stream ended without a final message — should not happen, but bail
      // safely rather than loop.
      return { history: messages, iterations };
    }

    // Persist the assistant turn (full content array, including any tool_use
    // blocks) into the working history.
    messages.push({ role: 'assistant', content: finalMessage.content });

    // Collect tool_use blocks from the final message.
    for (const block of finalMessage.content) {
      if (block.type === 'tool_use') {
        pendingToolCalls.push({
          id: block.id,
          name: block.name,
          input: block.input,
        });
      }
    }

    if (
      finalMessage.stop_reason !== 'tool_use' ||
      pendingToolCalls.length === 0
    ) {
      // Natural end of turn — no more tool calls to dispatch.
      return { history: messages, iterations };
    }

    // Run each tool and append a single user-role message containing all the
    // tool_result blocks, per Anthropic's tool-use contract.
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const call of pendingToolCalls) {
      let output: unknown;
      let isError = false;
      try {
        output = await runTool(call.name, call.input, input.ctx);
      } catch (err) {
        isError = true;
        output = { error: err instanceof Error ? err.message : String(err) };
      }

      await input.onToolResult?.(call.id, call.name, output);

      const resultBlock: Anthropic.ToolResultBlockParam = {
        type: 'tool_result',
        tool_use_id: call.id,
        content: JSON.stringify(output),
      };
      if (isError) resultBlock.is_error = true;
      toolResults.push(resultBlock);
    }

    messages.push({ role: 'user', content: toolResults });
  }

  // Hit the iteration cap. Append a synthetic note so the model has a chance
  // to wrap up on the next turn (caller's responsibility to recover).
  return { history: messages, iterations };
}
