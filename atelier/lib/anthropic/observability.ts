import 'server-only';
import type Anthropic from '@anthropic-ai/sdk';
import { anthropic } from './client';
import { getPostHogServer, trackFireAndForget } from '@/lib/analytics/facade';
import { logger } from '@/lib/logger';

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

function countToolCalls(content: Anthropic.ContentBlock[]): number {
  let n = 0;
  for (const block of content) {
    if (block.type === 'tool_use') n += 1;
  }
  return n;
}

function capture(payload: CapturePayload): void {
  const ph = getPostHogServer();
  if (ph) {
    try {
      const distinctId = payload.ctx.userId ?? `anon-${payload.ctx.sessionId}`;
      const properties: Record<string, unknown> = {
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
      };
      ph.capture({
        distinctId,
        event: '$ai_generation',
        properties,
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
    capture({
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

export function makeStreamCaptureHandle(args: {
  ctx: LlmCallContext;
  params: Anthropic.MessageStreamParams;
}): StreamCaptureHandle {
  return {
    recordFinal({ message, startedAt }) {
      capture({
        ctx: args.ctx,
        model: message.model,
        usage: message.usage,
        latencyMs: Date.now() - startedAt,
        inputMessages: args.params.messages,
        outputContent: message.content,
        tools: args.params.tools as Anthropic.Tool[] | undefined,
        toolCalls: countToolCalls(message.content),
        streaming: true,
        stopReason: message.stop_reason,
      });
    },
    recordError({ error, startedAt }) {
      captureError({
        ctx: args.ctx,
        model: args.params.model,
        latencyMs: Date.now() - startedAt,
        inputMessages: args.params.messages,
        error,
        streaming: true,
      });
    },
  };
}
