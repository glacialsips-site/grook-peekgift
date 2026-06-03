// The curator turn: the streaming-capable Anthropic tool loop that authors a PeekDocument.
// Every tool_use is routed through the core gate — commandFromTool → execute(decide+apply)
// — so the model can ONLY change the document through validated commands; a malformed or
// invariant-breaking op bounces at the boundary and the model is told why, instead of
// corrupting the page. The document the model sees only ever moves through decide().

import type Anthropic from "@anthropic-ai/sdk";
import { execute, commandFromTool, defaultCtx, type PeekIR, type PeekEvent, type CardData, type ResolveConstraints } from "@peek/core";
import { cardResolver } from "@/lib/ports/card-resolver";
import { generateHero } from "@/lib/ports/image";
import { sanitizeCustomHtml } from "@/lib/sanitize";
import { PEEK_STUDIO_SYSTEM_PROMPT } from "./system-prompt";
import { PEEK_STUDIO_TOOLS } from "./tools";

// A custom section carries model-authored html. Sanitize it HERE — at the boundary, before it
// becomes a command and enters the document — so the stored doc (and every later render of it)
// only ever holds safe markup. Other tools pass through untouched.
function sanitizeToolInput(name: string, input: unknown): unknown {
  if (name !== "upsert_section") return input;
  const inp = input as { kind?: unknown; data?: Record<string, unknown> } | null;
  if (inp && inp.kind === "custom" && inp.data && typeof inp.data.html === "string") {
    return { ...inp, data: { ...inp.data, html: sanitizeCustomHtml(inp.data.html) } };
  }
  return input;
}

// A resolver CardData → add_card tool input, so a resolved product is appended through the
// SAME core gate (commandFromTool → decide → apply) as any hand-authored card.
function cardDataToAddCard(d: CardData): Record<string, unknown> {
  return {
    type: "product",
    title: d.title,
    ...(d.description ? { description: d.description } : {}),
    ...(d.source_url ? { source_url: d.source_url } : {}),
    ...(d.retailer ? { source_retailer: d.retailer } : {}),
    ...(typeof d.value_cents === "number" ? { value_cents: d.value_cents } : {}),
    ...(d.value_display ? { value_display: d.value_display } : {}),
    ...(d.image_url ? { media: { url: d.image_url, source: "external", alt: d.title } } : {}),
  };
}

export interface TurnMessage {
  role: "user" | "assistant";
  content: unknown;
}

const MODEL = "claude-opus-4-8";
const MAX_HOPS = 12;

export type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "page"; doc: PeekIR; pinged?: string[] }
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
          const a = (tu.input ?? {}) as { text?: string; constraints?: ResolveConstraints; images?: string[]; screenshot?: string };
          const resolved = a.text
            ? await cardResolver.resolve({ text: a.text, constraints: a.constraints, images: a.images, screenshot: a.screenshot })
            : ({ ok: false, error: "resolve_card needs a url or a description" } as const);
          if (!resolved.ok) {
            emit({ type: "tool", name: tu.name, ok: false, error: resolved.error });
            results.push({ type: "tool_result", tool_use_id: tu.id, content: `couldn't auto-resolve (${resolved.error}). infer what you can and call add_card directly.`, is_error: true });
            continue;
          }
          const cmd = commandFromTool("add_card", cardDataToAddCard(resolved.card));
          if (cmd.isErr()) {
            emit({ type: "tool", name: tu.name, ok: false, error: cmd.error.message });
            results.push({ type: "tool_result", tool_use_id: tu.id, content: `rejected: ${cmd.error.message}`, is_error: true });
            continue;
          }
          const rr = execute(doc, cmd.value, ctx);
          if (rr.isErr()) {
            emit({ type: "tool", name: tu.name, ok: false, error: rr.error.message });
            results.push({ type: "tool_result", tool_use_id: tu.id, content: `rejected: ${rr.error.message}`, is_error: true });
            continue;
          }
          doc = rr.value.doc;
          emit({ type: "tool", name: tu.name, ok: true });
          let resolvedCardId: string | undefined;
          for (const e of rr.value.events) if (e.type === "card_added") resolvedCardId = e.card.id;
          const grid = doc.sections.find((s) => s.kind === "giftgrid");
          emit({ type: "page", doc, pinged: grid ? [grid.id] : [] });
          results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify({ ok: true, card_id: resolvedCardId, via: resolved.via }) });
          continue;
        }
        // generate_hero_image: the core command only leaves a *pending* ai_generated directive.
        // When fal is keyed we fulfil it here — actually render the image and pin the real url —
        // so the hero is a finished picture, not a placeholder. No key / a failure falls through
        // to the normal command below, which leaves the pending directive → themed gradient.
        if (tu.name === "generate_hero_image") {
          const a = (tu.input ?? {}) as { prompt?: string; aspect?: string };
          const gen = a.prompt
            ? await generateHero(a.prompt, a.aspect)
            : ({ ok: false, error: "generate_hero_image needs a prompt" } as const);
          if (gen.ok && gen.url) {
            const cmd = commandFromTool("set_hero_media", { url: gen.url, source: "ai_generated", alt: a.prompt?.slice(0, 140) });
            if (cmd.isOk()) {
              const rr = execute(doc, cmd.value, ctx);
              if (rr.isOk()) {
                doc = rr.value.doc;
                emit({ type: "tool", name: tu.name, ok: true });
                const hero = doc.sections.find((s) => s.kind === "hero");
                emit({ type: "page", doc, pinged: hero ? [hero.id] : [] });
                results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify({ ok: true, hero_url: gen.url, provider: gen.provider }) });
                continue;
              }
            }
          }
          // fall through: leave the pending directive (renderer paints a themed gradient).
        }
        const cmd = commandFromTool(tu.name, sanitizeToolInput(tu.name, tu.input));
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
        const pinged: string[] = [];
        for (const e of r.value.events) {
          if (e.type === "section_inserted") pinged.push(e.section.id);
          else if (e.type === "section_patched") pinged.push(e.id);
          else if (e.type === "card_added" || e.type === "card_updated" || e.type === "card_rule_set" || e.type === "card_removed") {
            const grid = doc.sections.find((s) => s.kind === "giftgrid");
            if (grid && !pinged.includes(grid.id)) pinged.push(grid.id);
          }
        }
        emit({ type: "page", doc, pinged });
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

const SAFEWORD_REPORT_SYSTEM = `The user just sent the private founder handshake word. You are NO LONGER "peek" — you are talking to the founder building this product, not a customer. Drop the persona completely and report straight, concise, and candid. This is for tuning you, so be honest:

- THE BRIEF you inferred from the conversation (recipient, occasion, the feeling under the facts).
- THE CONCEPT you committed to and the key choices (type, palette, scene, sections, copy voice) — each with its one-line "because".
- WHAT FOUGHT YOU: where a tool, the renderer, or the IR couldn't express what you wanted; anything you had to stub, fake, simplify, or skip.
- WHAT THE PANTRY / PROMPT LACKED — what would have made this easier or better.
- WHAT WOULD MAKE THE NEXT ONE GNARLIER — your honest take on how to push the output further.

Plain text, tight, no markdown headers needed. Do not author the page, do not call tools, do not stay in character.`;

/**
 * The founder handshake. When the host detects the safeword, it calls this instead of the
 * normal turn: the model drops the peek persona and streams a structured self-report (the
 * tuning "gold"), authoring nothing. Same SSE text/done protocol as the normal turn.
 */
export async function runSafewordReport(
  client: Anthropic,
  input: { doc: PeekIR; messages: TurnMessage[] },
  emit: (e: StreamEvent) => void,
): Promise<PeekIR> {
  const messages = input.messages.map((m) => ({ role: m.role, content: m.content })) as Anthropic.MessageParam[];
  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 4096,
      system: [{ type: "text" as const, text: SAFEWORD_REPORT_SYSTEM }],
      messages,
    } as unknown as Anthropic.MessageStreamParams);
    stream.on("text", (delta: string) => {
      if (delta) emit({ type: "text", delta });
    });
    await stream.finalMessage();
  } catch (e) {
    emit({ type: "error", error: (e as Error).message ?? "report failed" });
  }
  emit({ type: "done", doc: input.doc });
  return input.doc;
}
