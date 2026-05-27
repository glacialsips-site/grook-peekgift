import 'server-only';
import type Anthropic from '@anthropic-ai/sdk';
import { anthropic } from './client';
import { getPostHogServer, trackFireAndForget } from '@/lib/analytics/facade';
import { logger } from '@/lib/logger';
import { recordUsageFireAndForget } from '@/lib/usage/record';

const log = logger.child({ component: 'anthropic/observability' });

export interface LlmCallContext {
  peekId: string;
  userId: string | null;
  sessionId: string;
}

interface CapturePayload {
  ctx: LlmCallContext;
  model: string;
  usage: Anthropic.Usage;
  latencyMs: number;
  inputMessages: Anthropic.MessageParam[] | undefined;
  outputContent: Anthropic.ContentBlock[];
  tools: Anthropic.Tool[] | undefined;
  toolCalls: number;
  streaming: boolean;
  stopReason: Anthropic.StopReason | null;
}

interface ToolCallSummary {
  name: string;
  count: number;
}

interface IterationRollup {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  latencyMs: number;
  toolCalls: number;
  toolNames: string[];
  stopReason: Anthropic.StopReason | null;
}

function countToolCalls(content: Anthropic.ContentBlock[]): number {
  let n = 0;
  for (const block of content) {
    if (block.type === 'tool_use') n += 1;
  }
  return n;
}

function collectToolNames(content: Anthropic.ContentBlock[]): string[] {
  const names: string[] = [];
  for (const block of content) {
    if (block.type === 'tool_use') names.push(block.name);
  }
  return names;
}

function aggregateToolCalls(rollups: IterationRollup[]): ToolCallSummary[] {
  const counts = new Map<string, number>();
  for (const r of rollups) {
    for (const name of r.toolNames) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
}

function captureSingle(payload: CapturePayload): void {
  const ph = getPostHogServer();
  if (ph) {
    try {
      const distinctId = payload.ctx.userId ?? `anon-${payload.ctx.sessionId}`;
      ph.capture({
        distinctId,
        event: '$ai_generation',
        properties: {
          $ai_provider: 'anthropic',
          $ai_model: payload.model,
          $ai_input_tokens: payload.usage.input_tokens,
          $ai_output_tokens: payload.usage.output_tokens,
          $ai_cache_read_input_tokens:
            payload.usage.cache_read_input_tokens ?? 0,
          $ai_cache_creation_input_tokens:
            payload.usage.cache_creation_input_tokens ?? 0,
          $ai_latency: payload.latencyMs,
          $ai_input: payload.inputMessages,
          $ai_output_choices: payload.outputContent,
          $ai_tools: payload.tools,
          $ai_is_error: false,
          $ai_streaming: payload.streaming,
          $ai_stop_reason: payload.stopReason,
          peek_id: payload.ctx.peekId,
          session_id: payload.ctx.sessionId,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error('posthog capture failed', { message });
    }
  }

  trackFireAndForget({
    name: 'llm_call',
    peekId: payload.ctx.peekId,
    userId: payload.ctx.userId,
    sessionId: payload.ctx.sessionId,
    payload: {
      provider: 'anthropic',
      model: payload.model,
      input_tokens: payload.usage.input_tokens,
      output_tokens: payload.usage.output_tokens,
      cache_read_input_tokens: payload.usage.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens:
        payload.usage.cache_creation_input_tokens ?? 0,
      latency_ms: payload.latencyMs,
      tool_calls: payload.toolCalls,
      streaming: payload.streaming,
      stop_reason: payload.stopReason,
    },
  });

  recordUsageFireAndForget({
    userId: payload.ctx.userId,
    sessionId: payload.ctx.sessionId,
    vendor: 'anthropic',
    kind: payload.model,
    payload: {
      input_tokens: payload.usage.input_tokens,
      output_tokens: payload.usage.output_tokens,
      cache_read_input_tokens: payload.usage.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens:
        payload.usage.cache_creation_input_tokens ?? 0,
      peek_id: payload.ctx.peekId,
    },
  });
}

function captureError(args: {
  ctx: LlmCallContext;
  model: string;
  latencyMs: number;
  inputMessages: Anthropic.MessageParam[] | undefined;
  error: unknown;
  streaming: boolean;
}): void {
  const ph = getPostHogServer();
  if (ph) {
    try {
      const distinctId = args.ctx.userId ?? `anon-${args.ctx.sessionId}`;
      const message = args.error instanceof Error
        ? args.error.message
        : String(args.error);
      ph.capture({
        distinctId,
        event: '$ai_generation',
        properties: {
          $ai_provider: 'anthropic',
          $ai_model: args.model,
          $ai_latency: args.latencyMs,
          $ai_input: args.inputMessages,
          $ai_is_error: true,
          $ai_error: message,
          $ai_streaming: args.streaming,
          peek_id: args.ctx.peekId,
          session_id: args.ctx.sessionId,
        },
      });
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      log.error('posthog error-capture failed', { message: m });
    }
  }
}

export async function tracedCreate(opts: {
  params: Anthropic.MessageCreateParamsNonStreaming;
  ctx: LlmCallContext;
}): Promise<Anthropic.Message> {
  const start = Date.now();
  try {
    const res = await anthropic.messages.create(opts.params);
    const latencyMs = Date.now() - start;
    captureSingle({
      ctx: opts.ctx,
      model: res.model,
      usage: res.usage,
      latencyMs,
      inputMessages: opts.params.messages,
      outputContent: res.content,
      tools: opts.params.tools as Anthropic.Tool[] | undefined,
      toolCalls: countToolCalls(res.content),
      streaming: false,
      stopReason: res.stop_reason,
    });
    return res;
  } catch (err) {
    captureError({
      ctx: opts.ctx,
      model: opts.params.model,
      latencyMs: Date.now() - start,
      inputMessages: opts.params.messages,
      error: err,
      streaming: false,
    });
    throw err;
  }
}

export interface StreamCaptureHandle {
  recordFinal(args: { message: Anthropic.Message; startedAt: number }): void;
  recordError(args: { error: unknown; startedAt: number }): void;
}

export interface TurnCapture {
  /** Per-iteration handle. Each loop iteration calls one of recordFinal / recordError. */
  iteration(params: Anthropic.MessageStreamParams): StreamCaptureHandle;
  /** Emit one aggregated PostHog `$ai_generation` event for the whole turn. */
  flush(): void;
}

export function beginTurnCapture(ctx: LlmCallContext): TurnCapture {
  const rollups: IterationRollup[] = [];
  const firstInput: { messages: Anthropic.MessageParam[] | undefined } = {
    messages: undefined,
  };
  let firstTools: Anthropic.Tool[] | undefined;
  let lastOutput: Anthropic.ContentBlock[] | undefined;
  let lastStopReason: Anthropic.StopReason | null = null;
  let errored = false;
  let errorMessage: string | undefined;
  const turnStartedAt = Date.now();

  return {
    iteration(params) {
      if (firstInput.messages === undefined) {
        firstInput.messages = params.messages;
      }
      if (!firstTools) {
        firstTools = params.tools as Anthropic.Tool[] | undefined;
      }
      const iterationModel = params.model;
      return {
        recordFinal({ message, startedAt }) {
          rollups.push({
            model: message.model || iterationModel,
            inputTokens: message.usage.input_tokens,
            outputTokens: message.usage.output_tokens,
            cacheReadInputTokens: message.usage.cache_read_input_tokens ?? 0,
            cacheCreationInputTokens:
              message.usage.cache_creation_input_tokens ?? 0,
            latencyMs: Date.now() - startedAt,
            toolCalls: countToolCalls(message.content),
            toolNames: collectToolNames(message.content),
            stopReason: message.stop_reason,
          });
          lastOutput = message.content;
          lastStopReason = message.stop_reason;
        },
        recordError({ error, startedAt }) {
          rollups.push({
            model: iterationModel,
            inputTokens: 0,
            outputTokens: 0,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
            latencyMs: Date.now() - startedAt,
            toolCalls: 0,
            toolNames: [],
            stopReason: null,
          });
          errored = true;
          errorMessage =
            error instanceof Error ? error.message : String(error);
        },
      };
    },
    flush() {
      if (rollups.length === 0) return;

      const totalInputTokens = rollups.reduce((s, r) => s + r.inputTokens, 0);
      const totalOutputTokens = rollups.reduce(
        (s, r) => s + r.outputTokens,
        0,
      );
      const totalCacheRead = rollups.reduce(
        (s, r) => s + r.cacheReadInputTokens,
        0,
      );
      const totalCacheCreation = rollups.reduce(
        (s, r) => s + r.cacheCreationInputTokens,
        0,
      );
      const totalToolCalls = rollups.reduce((s, r) => s + r.toolCalls, 0);
      const totalLatency = Date.now() - turnStartedAt;
      const toolCallSummary = aggregateToolCalls(rollups);
      const model = rollups[rollups.length - 1]?.model ?? rollups[0]?.model;

      const ph = getPostHogServer();
      if (ph) {
        try {
          const distinctId = ctx.userId ?? `anon-${ctx.sessionId}`;
          ph.capture({
            distinctId,
            event: '$ai_generation',
            properties: {
              $ai_provider: 'anthropic',
              $ai_model: model,
              $ai_input_tokens: totalInputTokens,
              $ai_output_tokens: totalOutputTokens,
              $ai_cache_read_input_tokens: totalCacheRead,
              $ai_cache_creation_input_tokens: totalCacheCreation,
              $ai_latency: totalLatency,
              $ai_input: firstInput.messages,
              $ai_output_choices: lastOutput,
              $ai_tools: firstTools,
              $ai_is_error: errored,
              $ai_error: errorMessage,
              $ai_streaming: true,
              $ai_stop_reason: lastStopReason,
              tool_iterations: rollups.length,
              tool_calls_summary: toolCallSummary,
              tool_calls_total: totalToolCalls,
              peek_id: ctx.peekId,
              session_id: ctx.sessionId,
            },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error('[llm-obs] posthog turn capture failed', { message });
        }
      }

      trackFireAndForget({
        name: 'llm_call',
        peekId: ctx.peekId,
        userId: ctx.userId,
        sessionId: ctx.sessionId,
        payload: {
          provider: 'anthropic',
          model: model ?? 'unknown',
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
          cache_read_input_tokens: totalCacheRead,
          cache_creation_input_tokens: totalCacheCreation,
          latency_ms: totalLatency,
          tool_calls: totalToolCalls,
          streaming: true,
          stop_reason: lastStopReason,
        },
      });

      for (const r of rollups) {
        recordUsageFireAndForget({
          userId: ctx.userId,
          sessionId: ctx.sessionId,
          vendor: 'anthropic',
          kind: r.model,
          payload: {
            input_tokens: r.inputTokens,
            output_tokens: r.outputTokens,
            cache_read_input_tokens: r.cacheReadInputTokens,
            cache_creation_input_tokens: r.cacheCreationInputTokens,
            peek_id: ctx.peekId,
          },
        });
      }
    },
  };
}
