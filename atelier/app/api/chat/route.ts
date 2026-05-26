import type { NextRequest } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import { chatTurn, DEFAULT_MODEL } from '@/lib/anthropic';
import '@/lib/anthropic/tools/bootstrap';
import { getUserId } from '@/lib/auth/server';
import {
  anonymousTurnCount,
  anonymousTurnExceeded,
  assertPeekAccess,
} from '@/lib/chat/session';
import {
  appendChatMessage,
  loadChatHistory,
} from '@/lib/chat/persistence';
import { track } from '@/lib/analytics/facade';
import { logger } from '@/lib/logger';
import { ChatRequestSchema, type SseEvent, type TurnUsage } from './schema';

const log = logger.child({ component: 'api/chat' });

const FRIENDLY_UPSTREAM_MSG =
  "We're having trouble connecting to the AI. Give it a moment and try again.";

function isUpstream5xx(err: unknown): boolean {
  const status =
    (err as { status?: number }).status ??
    (err as { statusCode?: number }).statusCode;
  return typeof status === 'number' && status >= 500 && status < 600;
}

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const encoder = new TextEncoder();

function encodeSseEvent(event: SseEvent): Uint8Array {
  const payload = `event: ${event.kind}\ndata: ${JSON.stringify(event)}\n\n`;
  return encoder.encode(payload);
}

function toTurnUsage(usage: Anthropic.Usage): TurnUsage {
  const out: TurnUsage = {
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
  };
  if (typeof usage.cache_read_input_tokens === 'number') {
    out.cache_read_input_tokens = usage.cache_read_input_tokens;
  }
  if (typeof usage.cache_creation_input_tokens === 'number') {
    out.cache_creation_input_tokens = usage.cache_creation_input_tokens;
  }
  return out;
}

export async function POST(req: NextRequest): Promise<Response> {
  const userId = await getUserId();

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = ChatRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: 'bad_request', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { peekId, sessionId, history, userMessage, model } = parsed.data;

  const access = await assertPeekAccess({ peekId, userId, sessionId });
  if (!access.ok) {
    return Response.json(
      { error: access.reason },
      { status: access.reason === 'forbidden' ? 403 : 404 },
    );
  }

  if (!userId) {
    const count = await anonymousTurnCount(sessionId);
    if (anonymousTurnExceeded(count)) {
      return Response.json(
        { error: 'signup_required', anonymous_turns_used: count },
        { status: 401 },
      );
    }
  }

  let initialHistory = history as Anthropic.MessageParam[];
  if (initialHistory.length === 0) {
    try {
      const persisted = await loadChatHistory(peekId);
      initialHistory = persisted
        .filter((row) => row.role === 'user' || row.role === 'assistant')
        .map((row) => ({
          role: row.role as 'user' | 'assistant',
          content: row.content as Anthropic.MessageParam['content'],
        }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error('loadChatHistory failed', { peekId, message });
    }
  }

  const userInput = userMessage as string | Anthropic.ContentBlockParam[];
  const userContent: Anthropic.ContentBlockParam[] =
    typeof userInput === 'string'
      ? [{ type: 'text', text: userInput }]
      : userInput;

  const chosenModel = model ?? DEFAULT_MODEL;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (event: SseEvent): void => {
        if (closed) return;
        try {
          controller.enqueue(encodeSseEvent(event));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          log.error('enqueue failed', { message });
        }
      };
      const safeClose = (): void => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      const turnUsages: TurnUsage[] = [];
      let toolCallTotal = 0;
      const pendingToolNames = new Map<string, string>();
      const turnStartedAt = Date.now();

      try {
        await appendChatMessage({
          peekId,
          role: 'user',
          content: userContent,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error('persist user message failed', { peekId, message });
      }

      try {
        const turn = chatTurn({
          ctx: { peekId, userId, sessionId },
          history: initialHistory,
          userMessage: userContent,
          model: chosenModel,
          onToolResult: async (id, _name, output) => {
            safeEnqueue({ kind: 'tool_result', id, output });
            try {
              await appendChatMessage({
                peekId,
                role: 'tool_result',
                content: output,
                toolCallId: id,
              });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              log.error('persist tool_result failed', {
                peekId,
                id,
                message,
              });
            }
          },
        });

        while (true) {
          const next = await turn.next();
          if (next.done) {
            const finalHistory = next.value.history;
            const newAssistantTurns = finalHistory
              .slice(initialHistory.length + 1)
              .filter((m) => m.role === 'assistant');
            for (const msg of newAssistantTurns) {
              try {
                await appendChatMessage({
                  peekId,
                  role: 'assistant',
                  content: msg.content,
                });
              } catch (err) {
                const message =
                  err instanceof Error ? err.message : String(err);
                log.error('persist assistant turn failed', { peekId, message });
              }
            }
            break;
          }
          const event = next.value;
          switch (event.type) {
            case 'text_delta': {
              safeEnqueue({ kind: 'text', delta: event.text });
              break;
            }
            case 'tool_use_start': {
              pendingToolNames.set(event.id, event.name);
              toolCallTotal += 1;
              safeEnqueue({
                kind: 'tool_call',
                id: event.id,
                name: event.name,
              });
              break;
            }
            case 'tool_use_end': {
              if (event.input !== undefined) {
                const name = pendingToolNames.get(event.id);
                if (name) {
                  safeEnqueue({
                    kind: 'tool_call',
                    id: event.id,
                    name,
                    input: event.input,
                  });
                }
              }
              break;
            }
            case 'message_end': {
              const usage = toTurnUsage(event.usage);
              turnUsages.push(usage);
              safeEnqueue({ kind: 'turn_end', usage });
              break;
            }
            case 'error': {
              const upstream = isUpstream5xx(event.error);
              log.warn('stream_error', {
                peekId,
                message: event.error.message,
                upstream_5xx: upstream,
              });
              safeEnqueue({
                kind: 'error',
                message: upstream ? FRIENDLY_UPSTREAM_MSG : event.error.message,
              });
              break;
            }
            case 'thinking_delta':
            case 'tool_use_delta': {
              break;
            }
          }
        }

        const aggregated = turnUsages.reduce<TurnUsage>(
          (acc, u) => ({
            input_tokens: acc.input_tokens + u.input_tokens,
            output_tokens: acc.output_tokens + u.output_tokens,
            cache_read_input_tokens:
              (acc.cache_read_input_tokens ?? 0) +
              (u.cache_read_input_tokens ?? 0),
            cache_creation_input_tokens:
              (acc.cache_creation_input_tokens ?? 0) +
              (u.cache_creation_input_tokens ?? 0),
          }),
          { input_tokens: 0, output_tokens: 0 },
        );

        await track({
          name: 'chat_turn',
          peekId,
          userId,
          sessionId,
          payload: {
            tokens_in: aggregated.input_tokens,
            tokens_out: aggregated.output_tokens,
            cache_read_input_tokens: aggregated.cache_read_input_tokens ?? 0,
            cache_creation_input_tokens:
              aggregated.cache_creation_input_tokens ?? 0,
            tool_calls: toolCallTotal,
            iterations: turnUsages.length,
            latency_ms: Date.now() - turnStartedAt,
            model: chosenModel,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const upstream5xx = isUpstream5xx(err);
        log.error('turn failed', {
          peekId,
          sessionId,
          message,
          upstream_5xx: upstream5xx,
        });
        safeEnqueue({
          kind: 'error',
          message: upstream5xx ? FRIENDLY_UPSTREAM_MSG : message,
        });
      } finally {
        safeClose();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
