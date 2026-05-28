import type Anthropic from '@anthropic-ai/sdk';
import { anthropic, assertAnthropicConfigured, DEFAULT_MODEL } from './client';
import { consumeExtendedThinking } from './extended-thinking';
import { dispatchMemoryCommand } from './memory/store';
import { loadPeekStateJson } from './progress-block';
import { getServerToolDescriptors } from './server-tools';
import { getSystemPrompt, type SystemPromptOptions } from './system-prompt';
import { getToolSchemas, runTool, type ToolContext } from './tools/index';
import './tools/bootstrap';
import { streamMessage, type StreamEvent } from './streaming';
import { beginTurnCapture } from './observability';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { getPostHogServer } from '@/lib/analytics/facade';

const MAX_TOOL_ITERATIONS = 10;
const DEFAULT_MAX_TOKENS = 4096;
const MAX_TOOL_RESULT_BYTES = 24 * 1024;

const log = logger.child({ component: 'anthropic/chat' });

function safeStringifyToolOutput(output: unknown): string {
  let serialized: string;
  try {
    serialized = JSON.stringify(output);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return JSON.stringify({ error: 'serialization_failed', detail: msg });
  }
  if (typeof serialized !== 'string') {
    return JSON.stringify({ error: 'serialization_returned_undefined' });
  }
  if (serialized.length <= MAX_TOOL_RESULT_BYTES) return serialized;
  return JSON.stringify({
    truncated: true,
    original_bytes: serialized.length,
    note: 'tool output exceeded 24KB; head retained for model recovery',
    head: serialized.slice(0, MAX_TOOL_RESULT_BYTES - 200),
  });
}

type AnyTool =
  | Anthropic.Tool
  | Anthropic.CodeExecutionTool20260120
  | Anthropic.WebSearchTool20260209
  | Anthropic.WebFetchTool20260209
  | Anthropic.ToolSearchToolBm25_20251119
  | Anthropic.MemoryTool20250818;

export function withToolsCacheControl<T extends AnyTool>(tools: T[]): T[] {
  if (tools.length === 0) return tools;
  const lastIndex = tools.length - 1;
  return tools.map((tool, i) =>
    i === lastIndex
      ? ({ ...tool, cache_control: { type: 'ephemeral', ttl: '1h' } } as T)
      : tool,
  );
}

export interface IterationUsage {
  iteration: number;
  usage: Anthropic.Usage;
  stop_reason: Anthropic.StopReason | null;
}

export interface ChatTurnSystemPromptOptions extends SystemPromptOptions {
  peekSummary?: string | null;
}

export interface ChatTurnInput {
  ctx: ToolContext;
  history: Anthropic.MessageParam[];
  userMessage: string | Anthropic.ContentBlockParam[];
  model?: string;
  maxTokens?: number;
  systemPromptOptions?: ChatTurnSystemPromptOptions;
  thinking?: Anthropic.ThinkingConfigParam;
  signal?: AbortSignal;
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
  const clientTools = getToolSchemas();
  const serverTools = getServerToolDescriptors();
  const tools: AnyTool[] = withToolsCacheControl<AnyTool>([
    ...serverTools,
    ...clientTools,
  ]);
  const baseOpts: ChatTurnSystemPromptOptions = input.systemPromptOptions ?? {};
  const signal = input.signal;

  // C05 from BUGS-CHAT-LOOP: per-turn id so request_extended_thinking can't
  // be raced between two parallel chatTurn invocations sharing a sessionId.
  const turnId =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ctx: ToolContext = { ...input.ctx, turnId };

  const userContent: Anthropic.ContentBlockParam[] =
    typeof input.userMessage === 'string'
      ? [{ type: 'text', text: input.userMessage }]
      : input.userMessage;

  const messages: Anthropic.MessageParam[] = [
    ...input.history,
    { role: 'user', content: userContent },
  ];

  const iterations: IterationUsage[] = [];
  const turnCapture = beginTurnCapture(ctx);

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      if (signal?.aborted) {
        return { history: messages, iterations };
      }

      const peekStateJson = await loadPeekStateJson(ctx.peekId);
      const resolvedPeekState =
        peekStateJson ?? baseOpts.peekStateJson ?? null;
      const summary = baseOpts.peekSummary?.trim();
      const dynamicPeekState =
        summary && summary.length > 0
          ? resolvedPeekState
            ? `Peek summary: ${summary}\n\n${resolvedPeekState}`
            : `Peek summary: ${summary}`
          : resolvedPeekState;

      const system = getSystemPrompt({
        ...baseOpts,
        curatorName: baseOpts.curatorName ?? null,
        peekStateJson: dynamicPeekState,
        peekId: baseOpts.peekId ?? ctx.peekId,
        curatorMemory: baseOpts.curatorMemory ?? null,
      });

      const thinkingConsumed = consumeExtendedThinking(ctx.sessionId, turnId);
      const thinkingBudget = env.EXTENDED_THINKING_BUDGET_TOKENS ?? 8000;
      const thinkingParam: Anthropic.ThinkingConfigParam | undefined =
        thinkingConsumed
          ? { type: 'enabled', budget_tokens: thinkingBudget }
          : input.thinking;

      // W02 from BUGS-WAVE2: max_tokens must be > thinking.budget_tokens or
      // the API 400s. When thinking is active, bump max_tokens to budget +
      // generous output headroom.
      const effectiveMaxTokens =
        thinkingParam?.type === 'enabled'
          ? Math.max(maxTokens, thinkingParam.budget_tokens + 4096)
          : maxTokens;

      const params: Anthropic.MessageStreamParams = {
        model,
        max_tokens: effectiveMaxTokens,
        system,
        messages,
        tools:
          tools.length > 0
            ? (tools as Anthropic.MessageStreamParams['tools'])
            : undefined,
        ...(thinkingParam ? { thinking: thinkingParam } : {}),
      };

      let finalMessage: Anthropic.Message | undefined;
      const pendingToolCalls: PendingToolCall[] = [];
      const iterationCapture = turnCapture.iteration(params);
      const startedAt = Date.now();
      let messageEnded = false;

      const streamIter = streamMessage(anthropic, params);
      let aborted = false;
      const onAbort = (): void => {
        aborted = true;
        streamIter.return(undefined).catch(() => undefined);
      };
      if (signal) {
        if (signal.aborted) {
          onAbort();
        } else {
          signal.addEventListener('abort', onAbort, { once: true });
        }
      }
      try {
        for await (const event of streamIter) {
          if (signal?.aborted) {
            aborted = true;
            break;
          }
          yield event;
          if (event.type === 'message_end') {
            finalMessage = event.message;
            messageEnded = true;
            iterations.push({
              iteration: i,
              usage: event.usage,
              stop_reason: event.stop_reason,
            });
            iterationCapture.recordFinal({ message: event.message, startedAt });
          } else if (event.type === 'error') {
            // C10 from BUGS-CHAT-LOOP: only record error when message_end
            // hasn't already populated the rollup; otherwise we'd add a
            // duplicate zero-token iteration entry.
            if (!messageEnded) {
              iterationCapture.recordError({ error: event.error, startedAt });
            }
            return { history: messages, iterations };
          }
        }
      } finally {
        if (signal) signal.removeEventListener('abort', onAbort);
        if (aborted) {
          await streamIter.return(undefined).catch(() => undefined);
        }
      }

      if (aborted || signal?.aborted) {
        return { history: messages, iterations };
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
      let abortedMidDispatch = false;
      for (const call of pendingToolCalls) {
        if (signal?.aborted) {
          abortedMidDispatch = true;
          break;
        }
        let output: unknown;
        let isError = false;
        let memoryResultString: string | undefined;
        try {
          if (call.name === 'memory') {
            if (!ctx.userId) {
              memoryResultString =
                'Error: Memory requires sign-in. Use set_recipient_profile or peek metadata for transient state instead.';
              output = { ok: false, error: 'memory_unauthorized' };
            } else {
              const cmd =
                call.input as Anthropic.Beta.Messages.BetaMemoryTool20250818Command;
              memoryResultString = await dispatchMemoryCommand(
                { clerkUserId: ctx.userId },
                cmd,
              );
              output = { ok: true, memory_response: memoryResultString };
              try {
                const ph = getPostHogServer();
                if (ph) {
                  ph.capture({
                    distinctId: ctx.userId,
                    event: 'memory_command',
                    properties: {
                      command: cmd.command,
                      peek_id: ctx.peekId,
                      session_id: ctx.sessionId,
                      ok: !memoryResultString.startsWith('Error:'),
                    },
                  });
                }
              } catch (_phErr) {
                void 0;
              }
            }
          } else {
            output = await runTool(call.name, call.input, ctx);
          }
        } catch (err) {
          isError = true;
          const msg = err instanceof Error ? err.message : String(err);
          log.warn('tool_handler_threw', { name: call.name, msg });
          output = { error: msg };
          if (call.name === 'memory') {
            memoryResultString = `Error: ${msg}`;
          }
        }

        try {
          await input.onToolResult?.(call.id, call.name, output);
        } catch (cbErr) {
          const msg = cbErr instanceof Error ? cbErr.message : String(cbErr);
          log.warn('onToolResult_threw', { name: call.name, msg });
        }

        const resultBlock: Anthropic.ToolResultBlockParam = {
          type: 'tool_result',
          tool_use_id: call.id,
          content: memoryResultString ?? safeStringifyToolOutput(output),
        };
        if (isError) resultBlock.is_error = true;
        toolResults.push(resultBlock);
      }

      if (abortedMidDispatch) {
        // C11 from BUGS-CHAT-LOOP: synthesize is_error tool_results for
        // not-yet-dispatched calls so every assistant tool_use has a
        // matching tool_result follow-up. Without this, the next replay
        // would see a dangling tool_use and Anthropic 400s.
        const dispatched = new Set(toolResults.map((r) => r.tool_use_id));
        for (const call of pendingToolCalls) {
          if (dispatched.has(call.id)) continue;
          toolResults.push({
            type: 'tool_result',
            tool_use_id: call.id,
            content: JSON.stringify({ error: 'aborted_mid_turn' }),
            is_error: true,
          });
        }
        messages.push({ role: 'user', content: toolResults });
        return { history: messages, iterations };
      }

      messages.push({ role: 'user', content: toolResults });
    }

    return { history: messages, iterations };
  } finally {
    turnCapture.flush();
  }
}
