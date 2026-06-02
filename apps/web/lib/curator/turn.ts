// The curator turn: the streaming-capable Anthropic tool loop that authors a PeekDocument.
// Every tool_use is routed through the core gate — commandFromTool → execute(decide+apply)
// — so the model can ONLY change the document through validated commands; a malformed or
// invariant-breaking op bounces at the boundary and the model is told why, instead of
// corrupting the page. The document the model sees only ever moves through decide().

import type Anthropic from "@anthropic-ai/sdk";
import { execute, commandFromTool, defaultCtx, type PeekIR, type PeekEvent } from "@peek/core";
import { PEEK_STUDIO_SYSTEM_PROMPT } from "./system-prompt";
import { PEEK_STUDIO_TOOLS } from "./tools";

export interface TurnMessage {
  role: "user" | "assistant";
  content: unknown;
}
export interface ToolOutcome {
  name: string;
  ok: boolean;
  error?: string;
}
export interface TurnResult {
  doc: PeekIR;
  text: string;
  events: PeekEvent[];
  tools: ToolOutcome[];
}

const MODEL = "claude-opus-4-8";
const MAX_HOPS = 12;

export async function runCuratorTurn(
  client: Anthropic,
  input: { doc: PeekIR; messages: TurnMessage[] },
): Promise<TurnResult> {
  let doc = input.doc;
  const ctx = defaultCtx();
  const events: PeekEvent[] = [];
  const tools: ToolOutcome[] = [];
  let text = "";

  // System + tools render before messages, so a cache breakpoint on system caches both.
  const system = [
    { type: "text" as const, text: PEEK_STUDIO_SYSTEM_PROMPT, cache_control: { type: "ephemeral" as const } },
  ];
  const anthropicTools = PEEK_STUDIO_TOOLS as unknown as Anthropic.Tool[];
  const messages = input.messages.map((m) => ({ role: m.role, content: m.content })) as Anthropic.MessageParam[];

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    // Opus 4.8 wants adaptive thinking; SDK 0.65 types predate it, so build then cast.
    const params = {
      model: MODEL,
      max_tokens: 8192,
      thinking: { type: "adaptive" },
      system,
      tools: anthropicTools,
      messages,
    } as unknown as Anthropic.MessageCreateParamsNonStreaming;

    const msg = await client.messages.create(params);
    for (const b of msg.content) if (b.type === "text") text += b.text;

    const toolUses = msg.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    messages.push({ role: "assistant", content: msg.content });

    if (msg.stop_reason !== "tool_use" || toolUses.length === 0) break;

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      // resolve_card is app-orchestration, not a core command. The resolver cascade isn't
      // wired in v1, so steer the model to add_card directly (honest, keeps it productive).
      if (tu.name === "resolve_card") {
        tools.push({ name: tu.name, ok: false, error: "resolver not configured" });
        results.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: "the resolver isn't wired yet — infer the details you can and call add_card directly.",
          is_error: true,
        });
        continue;
      }

      const cmd = commandFromTool(tu.name, tu.input);
      if (cmd.isErr()) {
        tools.push({ name: tu.name, ok: false, error: cmd.error.message });
        results.push({ type: "tool_result", tool_use_id: tu.id, content: `rejected: ${cmd.error.message}`, is_error: true });
        continue;
      }

      const r = execute(doc, cmd.value, ctx);
      if (r.isErr()) {
        tools.push({ name: tu.name, ok: false, error: r.error.message });
        results.push({ type: "tool_result", tool_use_id: tu.id, content: `rejected: ${r.error.message}`, is_error: true });
        continue;
      }

      doc = r.value.doc;
      events.push(...r.value.events);
      tools.push({ name: tu.name, ok: true });
      // Feed the resolved ids back so the model can target what it just created
      // (e.g. set_card_rule / update_card by id, add_card into a variant group).
      const ids: Record<string, string> = {};
      for (const e of r.value.events) {
        if (e.type === "card_added") ids.card_id = e.card.id;
        else if (e.type === "variant_group_added") ids.variant_group_id = e.group.id;
        else if (e.type === "section_inserted") ids.section_id = e.section.id;
      }
      results.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: JSON.stringify({ ok: true, ...ids, applied: r.value.events.map((e) => e.type) }),
      });
    }
    messages.push({ role: "user", content: results });
  }

  return { doc, text, events, tools };
}

export type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "page"; doc: PeekIR }
  | { type: "tool"; name: string; ok: boolean; error?: string }
  | { type: "done"; doc: PeekIR }
  | { type: "error"; error: string };

/**
 * Streaming variant: emits text deltas as the model speaks and a `page` snapshot after each
 * command applies, so the preview builds itself in real time. Same maker-checker routing.
 */
export async function runCuratorTurnStreaming(
  client: Anthropic,
  input: { doc: PeekIR; messages: TurnMessage[] },
  emit: (e: StreamEvent) => void,
): Promise<PeekIR> {
  let doc = input.doc;
  const ctx = defaultCtx();
  const system = [
    { type: "text" as const, text: PEEK_STUDIO_SYSTEM_PROMPT, cache_control: { type: "ephemeral" as const } },
  ];
  const anthropicTools = PEEK_STUDIO_TOOLS as unknown as Anthropic.Tool[];
  const messages = input.messages.map((m) => ({ role: m.role, content: m.content })) as Anthropic.MessageParam[];

  try {
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      const params = {
        model: MODEL,
        max_tokens: 8192,
        thinking: { type: "adaptive" },
        system,
        tools: anthropicTools,
        messages,
      } as unknown as Anthropic.MessageStreamParams;

      const stream = client.messages.stream(params);
      stream.on("text", (delta: string) => {
        if (delta) emit({ type: "text", delta });
      });
      const msg = await stream.finalMessage();

      const toolUses = msg.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      messages.push({ role: "assistant", content: msg.content });
      if (msg.stop_reason !== "tool_use" || toolUses.length === 0) break;

      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        if (tu.name === "resolve_card") {
          emit({ type: "tool", name: tu.name, ok: false, error: "resolver not configured" });
          results.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: "the resolver isn't wired yet — infer the details and call add_card directly.",
            is_error: true,
          });
          continue;
        }
        const cmd = commandFromTool(tu.name, tu.input);
        if (cmd.isErr()) {
          emit({ type: "tool", name: tu.name, ok: false, error: cmd.error.message });
          results.push({ type: "tool_result", tool_use_id: tu.id, content: `rejected: ${cmd.error.message}`, is_error: true });
          continue;
        }
        const r = execute(doc, cmd.value, ctx);
        if (r.isErr()) {
          emit({ type: "tool", name: tu.name, ok: false, error: r.error.message });
          results.push({ type: "tool_result", tool_use_id: tu.id, content: `rejected: ${r.error.message}`, is_error: true });
          continue;
        }
        doc = r.value.doc;
        emit({ type: "tool", name: tu.name, ok: true });
        emit({ type: "page", doc });
        const ids: Record<string, string> = {};
        for (const e of r.value.events) {
          if (e.type === "card_added") ids.card_id = e.card.id;
          else if (e.type === "variant_group_added") ids.variant_group_id = e.group.id;
          else if (e.type === "section_inserted") ids.section_id = e.section.id;
        }
        results.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: JSON.stringify({ ok: true, ...ids, applied: r.value.events.map((e) => e.type) }),
        });
      }
      messages.push({ role: "user", content: results });
    }
  } catch (e) {
    emit({ type: "error", error: (e as Error).message ?? "curator turn failed" });
  }

  emit({ type: "done", doc });
  return doc;
}
