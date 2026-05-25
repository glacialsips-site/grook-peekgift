import type { NextRequest } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import {
  anthropic,
  DEFAULT_MODEL,
  getSystemPrompt,
  getToolSchemas,
  runTool,
  streamMessage,
} from '@/lib/anthropic';
import '@/lib/anthropic/tools/bootstrap';
import { getUserId } from '@/lib/auth/server';
import {
  anonymousTurnCount,
  anonymousTurnExceeded,
  assertPeekAccess,
  recordEvent,
} from '@/lib/chat/session';
import { ChatRequestSchema, type SseEvent, type TurnUsage } from './schema';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const encoder = new TextEncoder();
const MAX_TOOL_ITERATIONS = 10;
const DEFAULT_MAX_TOKENS = 4096;

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

  const initialHistory = history as Anthropic.MessageParam[];
  const userInput = userMessage as string | Anthropic.ContentBlockParam[];
  const chosenModel = model ?? DEFAULT_MODEL;
  const userContent: Anthropic.ContentBlockParam[] =
    typeof userInput === 'string'
      ? [{ type: 'text', text: userInput }]
      : userInput;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (event: SseEvent): void => {
        if (closed) return;
        try {
          controller.enqueue(encodeSseEvent(event));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error('[chat] enqueue failed', { message });
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

      const messages: Anthropic.MessageParam[] = [
        ...initialHistory,
        { role: 'user', content: userContent },
      ];

      const turnUsages: TurnUsage[] = [];
      let toolCallTotal = 0;

      try {
        const tools = getToolSchemas();
        const system = getSystemPrompt({});

        for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
          const params: Anthropic.MessageStreamParams = {
            model: chosenModel,
            max_tokens: DEFAULT_MAX_TOKENS,
            system,
            messages,
            tools: tools.length > 0 ? tools : undefined,
          };

          const pendingToolNames = new Map<string, string>();
          let finalMessage: Anthropic.Message | undefined;
          let streamErrored = false;

          for await (const event of streamMessage(anthropic, params)) {
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
                finalMessage = event.message;
                const usage = toTurnUsage(event.usage);
                turnUsages.push(usage);
                safeEnqueue({ kind: 'turn_end', usage });
                break;
              }
              case 'error': {
                safeEnqueue({ kind: 'error', message: event.error.message });
                streamErrored = true;
                break;
              }
              case 'thinking_delta':
              case 'tool_use_delta': {
                break;
              }
            }
          }

          if (streamErrored || !finalMessage) {
            break;
          }

          messages.push({ role: 'assistant', content: finalMessage.content });

          if (finalMessage.stop_reason !== 'tool_use') {
            break;
          }

          const toolUseBlocks: Anthropic.ToolUseBlock[] = [];
          for (const block of finalMessage.content) {
            if (block.type === 'tool_use') {
              toolUseBlocks.push(block);
            }
          }

          if (toolUseBlocks.length === 0) {
            break;
          }

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const call of toolUseBlocks) {
            let output: unknown;
            let isError = false;
            try {
              output = await runTool(call.name, call.input, {
                peekId,
                userId,
                sessionId,
              });
            } catch (err) {
              isError = true;
              output = {
                error: err instanceof Error ? err.message : String(err),
              };
            }

            safeEnqueue({ kind: 'tool_result', id: call.id, output });

            const resultBlock: Anthropic.ToolResultBlockParam = {
              type: 'tool_result',
              tool_use_id: call.id,
              content: JSON.stringify(output),
            };
            if (isError) {
              resultBlock.is_error = true;
            }
            toolResults.push(resultBlock);
          }

          messages.push({ role: 'user', content: toolResults });
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

        await recordEvent({
          peekId,
          userId,
          sessionId,
          kind: 'chat_turn',
          payload: {
            tokens_in: aggregated.input_tokens,
            tokens_out: aggregated.output_tokens,
            cache_read_input_tokens: aggregated.cache_read_input_tokens ?? 0,
            cache_creation_input_tokens:
              aggregated.cache_creation_input_tokens ?? 0,
            tool_calls: toolCallTotal,
            iterations: turnUsages.length,
            model: chosenModel,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[chat] turn failed', { peekId, sessionId, message });
        safeEnqueue({ kind: 'error', message });
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
