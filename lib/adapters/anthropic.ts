// ============================================================================
// peek.gift — REAL LLMPort adapter (Anthropic, Opus 4.8)
// ----------------------------------------------------------------------------
// Satisfies lib/ir/ports.ts `LLMPort`. Opus 4.8 + streaming + manual tool loop +
// prompt caching. This is the adapter the registry selects when ANTHROPIC_API_KEY
// is set (the spine-builder left `realAdapterPlaceholder = null` for exactly this).
//
// Why a manual streaming loop (not the tool-runner): the host wires the actual
// tool runner via `onToolCall`, and the engine needs to interleave text deltas,
// per-tool brackets, and IR snapshots in real call order — that needs fine-grained
// control over each iteration. See lib/peek-chat/engine.ts for the orchestration.
//
// Caching: `tools` and `system` render before `messages`, so a cache_control
// breakpoint on the last system block caches BOTH the (deterministic) tool defs and
// the (frozen) system prompt. The system string and tool list are byte-stable across
// a session, so cache_read_input_tokens should be > 0 from the second turn on.
//
// Opus 4.8 surface (per /claude-api): adaptive thinking only (no budget_tokens),
// NO temperature/top_p/top_k (they 400), stream for large outputs.
// ============================================================================

import Anthropic from '@anthropic-ai/sdk';
import type { LLMPort, Result } from '@/lib/ir/ports';

export const PEEK_STUDIO_MODEL = 'claude-opus-4-8';

let _client: Anthropic | null = null;
function client(): Anthropic {
  // Resolves ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN / profile) from the env.
  if (!_client) _client = new Anthropic();
  return _client;
}

// Coerce a tool's return into the content the API expects for a tool_result block.
function toToolResultContent(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * The real Anthropic LLM adapter. Drives a streaming tool-use loop:
 *   - streams assistant text via `onText`
 *   - on each tool_use block, calls `onToolCall(name, input)` and feeds the result
 *     back as a tool_result, then continues the loop
 *   - returns the concatenated assistant text when the model reaches end_turn
 *
 * Tools are passed through verbatim (LLMTool ≅ Anthropic.Tool). The host (engine)
 * owns the reducer behind `onToolCall` and emits IR snapshots — this adapter stays
 * a thin, swappable transport.
 */
export const anthropicLLM: LLMPort = {
  async chat(args): Promise<Result<{ text: string }>> {
    const model = args.model || PEEK_STUDIO_MODEL;

    // Cache the frozen system prompt (+ the tool defs that render before it).
    const system: Anthropic.MessageCreateParams['system'] = [
      { type: 'text', text: args.system, cache_control: { type: 'ephemeral' } },
    ];

    const tools = (args.tools ?? []) as unknown as Anthropic.Tool[];
    const messages = [...(args.messages as unknown as Anthropic.MessageParam[])];

    let fullText = '';
    const MAX_HOPS = 12; // generous ceiling; a normal turn is 1–6 hops.

    try {
      for (let hop = 0; hop < MAX_HOPS; hop++) {
        // Opus 4.8 requires adaptive thinking (budget_tokens / enabled would 400).
        // SDK 0.65.0's static types predate the `adaptive` variant, so the wire-correct
        // params are built then cast — the shape is right; only the d.ts is behind.
        const params = {
          model,
          max_tokens: 8192,
          thinking: { type: 'adaptive' },
          system,
          tools,
          messages,
        } as unknown as Anthropic.MessageStreamParams;
        const stream = client().messages.stream(params);

        // Stream text deltas to the caller as they arrive.
        stream.on('text', (delta: string) => {
          if (!delta) return;
          fullText += delta;
          try {
            args.onText?.(delta);
          } catch {
            /* a UI sink throwing must not kill the model loop */
          }
        });

        const message = await stream.finalMessage();

        // Collect tool_use blocks (text already streamed above).
        const toolUses = message.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
        );

        // Always append the full assistant content (preserves tool_use + any
        // thinking blocks) so the conversation stays well-formed.
        messages.push({ role: 'assistant', content: message.content });

        if (message.stop_reason !== 'tool_use' || toolUses.length === 0) {
          // end_turn (or refusal / max_tokens) — the turn is complete.
          return { ok: true, text: fullText };
        }

        // Run each tool via the host-wired runner, feed results back.
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const tu of toolUses) {
          if (!args.onToolCall) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: tu.id,
              content: 'no tool runner wired',
              is_error: true,
            });
            continue;
          }
          try {
            const out = await args.onToolCall(tu.name, tu.input);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: tu.id,
              content: toToolResultContent(out),
            });
          } catch (e) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: tu.id,
              content: `tool error: ${(e as Error).message}`,
              is_error: true,
            });
          }
        }
        messages.push({ role: 'user', content: toolResults });
      }

      // Ran out of hops — return what we have rather than throwing.
      return { ok: true, text: fullText };
    } catch (e) {
      const err = e as { status?: number; message?: string };
      // 429 / 5xx are retryable; everything else (400/401/403) is not.
      const retryable = err.status === 429 || (typeof err.status === 'number' && err.status >= 500);
      return { ok: false, error: err.message || 'anthropic chat failed', retryable };
    }
  },
};

export default anthropicLLM;
