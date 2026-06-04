// The curator turn: the streaming Anthropic tool loop. The model authors a freeform HTML page
// (set_page) and refines it surgically (edit_region / set_style / set_media); each page op is
// relayed to the preview iframe over SSE, where the host runtime (peek-runtime.js) gives the
// tagged markup its behavior. resolve_card / generate_hero_image call the real ports and hand the
// product data / image url back to the model to author into the markup. No IR, no renderer — the
// caliber lives in the model's markup; the host owns only behavior.

import type Anthropic from "@anthropic-ai/sdk";
import type { ResolveConstraints } from "@peek/core";
import { cardResolver } from "@/lib/ports/card-resolver";
import { generateHero } from "@/lib/ports/image";
import { sanitizeHtml } from "@/lib/sanitize";
import { buildCuratorSystem } from "./prompt";
import { PEEK_STUDIO_TOOLS } from "./tools";

export interface TurnMessage {
  role: "user" | "assistant";
  content: unknown;
}

const MODEL = "claude-opus-4-8";
const MAX_HOPS = 12;

export type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "page"; html: string } // set_page — replace the whole document
  | { type: "patch"; selector: string; html: string } // edit_region — replace one node
  | { type: "style"; css: string } // set_style — inject a style block
  | { type: "media"; selector: string; url: string } // set_media — set an image
  | { type: "tool"; name: string; ok: boolean; error?: string }
  | { type: "ready" } // publish — flag ready for the $12 checkout
  | { type: "saved"; slug: string; peekId: string } // autosaved the draft (dual-rep envelope persisted)
  | { type: "done" }
  | { type: "error"; error: string };

/**
 * Streaming curator turn: emits text deltas as the model speaks and page ops as it authors, so
 * the preview builds itself live. Page ops are relayed (not applied server-side) — the iframe is
 * the rendered source of truth; persistence captures its HTML at publish time.
 */
export async function runCuratorTurnStreaming(
  client: Anthropic,
  input: { messages: TurnMessage[] },
  emit: (e: StreamEvent) => void,
): Promise<void> {
  // The cached system prefix: method · pantry · few-shot · contract (see ./prompt.ts).
  const system = buildCuratorSystem();
  const anthropicTools = PEEK_STUDIO_TOOLS as unknown as Anthropic.Tool[];
  const messages = input.messages.map((m) => ({ role: m.role, content: m.content })) as Anthropic.MessageParam[];

  try {
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      const params = {
        model: MODEL,
        max_tokens: 32000, // a full bespoke page can be large
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
        const a = (tu.input ?? {}) as Record<string, unknown>;
        const str = (k: string): string => (typeof a[k] === "string" ? (a[k] as string) : "");
        const ok = (payload: unknown) =>
          results.push({ type: "tool_result", tool_use_id: tu.id, content: typeof payload === "string" ? payload : JSON.stringify(payload) });
        const fail = (m: string) => results.push({ type: "tool_result", tool_use_id: tu.id, content: m, is_error: true });

        switch (tu.name) {
          case "set_page": {
            const html = str("html");
            if (!html) { fail("set_page needs html"); break; }
            emit({ type: "page", html: sanitizeHtml(html, true) });
            ok({ ok: true });
            break;
          }
          case "edit_region": {
            const selector = str("selector"), html = str("html");
            if (!selector || !html) { fail("edit_region needs selector + html"); break; }
            emit({ type: "patch", selector, html: sanitizeHtml(html, false) });
            ok({ ok: true });
            break;
          }
          case "set_style": {
            const css = str("css");
            if (!css) { fail("set_style needs css"); break; }
            emit({ type: "style", css });
            ok({ ok: true });
            break;
          }
          case "set_media": {
            const selector = str("selector"), url = str("url");
            if (!selector || !url) { fail("set_media needs selector + url"); break; }
            emit({ type: "media", selector, url });
            ok({ ok: true });
            break;
          }
          case "resolve_card": {
            const text = str("text");
            const constraints = a.constraints as ResolveConstraints | undefined;
            const images = Array.isArray(a.images) ? (a.images as string[]) : undefined;
            const resolved = text
              ? await cardResolver.resolve({ text, constraints, images })
              : ({ ok: false, error: "resolve_card needs a url or a description" } as const);
            if (resolved.ok) {
              emit({ type: "tool", name: tu.name, ok: true });
              ok({ ok: true, card: resolved.card, via: resolved.via });
            } else {
              emit({ type: "tool", name: tu.name, ok: false, error: resolved.error });
              fail(`couldn't auto-resolve (${resolved.error}). infer what you can and author the card yourself with whatever's real.`);
            }
            break;
          }
          case "generate_hero_image": {
            const prompt = str("prompt");
            const aspect = str("aspect") || undefined;
            const gen = prompt ? await generateHero(prompt, aspect) : ({ ok: false, error: "needs a prompt" } as const);
            if (gen.ok && gen.url) {
              emit({ type: "tool", name: tu.name, ok: true });
              ok({ ok: true, url: gen.url, provider: gen.provider });
            } else {
              emit({ type: "tool", name: tu.name, ok: false, error: gen.error });
              fail(`image generation failed (${gen.error ?? "unknown"}). leave a treated slot + caption instead.`);
            }
            break;
          }
          case "publish": {
            emit({ type: "ready" });
            ok({ ok: true });
            break;
          }
          default:
            fail(`unknown tool: ${tu.name}`);
        }
      }
      messages.push({ role: "user", content: results });
    }
  } catch (e) {
    emit({ type: "error", error: (e as Error).message ?? "curator turn failed" });
  }
  emit({ type: "done" });
}

const SAFEWORD_REPORT_SYSTEM = `The user just sent the private founder handshake word. You are NO LONGER "peek" — you are talking to the founder building this product, not a customer. Drop the persona and report straight, concise, and candid. This is for tuning you, so be honest:

- THE BRIEF you inferred (recipient, occasion, the feeling under the facts).
- THE OBJECT you committed to and the key choices (type, palette, signature move, sections, copy voice) — each with its one-line "because".
- WHAT FOUGHT YOU: where a tool, the runtime, or the contract couldn't express what you wanted; anything you had to fake, stub, or skip.
- WHAT THE PROMPT / PANTRY LACKED — what would have made this easier or better.
- WHAT WOULD MAKE THE NEXT ONE GNARLIER — your honest take on how to push the output further.

Plain text, tight, no markdown headers needed. Do not author the page, do not call tools, do not stay in character. Resume in character only when the founder says "resume".`;

/**
 * The founder handshake. When the host detects the safeword it calls this instead of the normal
 * turn: the model drops the peek persona and streams a structured self-report, authoring nothing.
 */
export async function runSafewordReport(
  client: Anthropic,
  input: { messages: TurnMessage[] },
  emit: (e: StreamEvent) => void,
): Promise<void> {
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
  emit({ type: "done" });
}
