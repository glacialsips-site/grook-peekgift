import type Anthropic from '@anthropic-ai/sdk';
import { anthropic, assertAnthropicConfigured, DEFAULT_MODEL } from './client';
import { getSystemPrompt, type SystemPromptOptions } from './system-prompt';
import { getToolSchemas, runTool, type ToolContext } from './tools/index';
import './tools/bootstrap';
import { streamMessage, type StreamEvent } from './streaming';
import { beginTurnCapture } from './observability';

const MAX_TOOL_ITERATIONS = 10;
const DEFAULT_MAX_TOKENS = 4096;

export interface IterationUsage {
  iteration: number;
  usage: Anthropic.Usage;
  stop_reason: Anthropic.StopReason | null;
}

export interface ChatTurnInput {
  ctx: ToolContext;
  history: Anthropic.MessageParam[];
  userMessage: string | Anthropic.ContentBlockParam[];
  model?: string;
  maxTokens?: number;
  systemPromptOptions?: SystemPromptOptions;
  thinking?: Anthropic.ThinkingConfigParam;
  onToolResult?: (
    id: string,
    name: string,
    output: unknown,
  ) => void | Promise<void>;
}

export interface ChatTurnResult {
  history: Anthropic.MessageParam[];
  iterations: IterationUsage[];
}

interface PendingToolCall {
  id: string;
  name: string;
  input: unknown;
}

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
  const turnCapture = beginTurnCapture(input.ctx);

  try {
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
      const iterationCapture = turnCapture.iteration(params);
      const startedAt = Date.now();

      for await (const event of streamMessage(anthropic, params)) {
        yield event;
        if (event.type === 'message_end') {
          finalMessage = event.message;
          iterations.push({
            iteration: i,
            usage: event.usage,
            stop_reason: event.stop_reason,
          });
          iterationCapture.recordFinal({ message: event.message, startedAt });
        } else if (event.type === 'error') {
          iterationCapture.recordError({ error: event.error, startedAt });
          return { history: messages, iterations };
        }
      }

      if (!finalMessage) {
        return { history: messages, iterations };
      }

      messages.push({ role: 'assistant', content: finalMessage.content });

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
        return { history: messages, iterations };
      }

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

    return { history: messages, iterations };
  } finally {
    turnCapture.flush();
  }
}
