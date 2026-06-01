// Streaming endpoint for the Peek chat. POST { messages, page } and receive an
// SSE stream of text deltas + full page snapshots. Runs the real Claude tool loop
// when ANTHROPIC_API_KEY is set, the scripted preview driver otherwise.

import type { NextRequest } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { getClient, hasApiKey, PEEK_MODEL } from "../../../lib/peek/anthropic";
import { PEEK_SYSTEM } from "../../../lib/peek/system-prompt";
import { PEEK_TOOLS, applyTool } from "../../../lib/peek/tools";
import { emptyPage } from "../../../lib/peek/types";
import type { ChatMessage, GiftPage, PeekEvent } from "../../../lib/peek/types";
import { runPreview } from "../../../lib/peek/preview-driver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function frame(e: PeekEvent): string {
  return `data: ${JSON.stringify(e)}\n\n`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}) as any);
  const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
  const startPage: GiftPage = body?.page ?? emptyPage();

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: PeekEvent) => controller.enqueue(encoder.encode(frame(e)));
      try {
        if (hasApiKey()) {
          await runLive(messages, startPage, send);
        } else {
          await runPreview(messages, startPage, send);
        }
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "Peek hit an error." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

async function runLive(messages: ChatMessage[], startPage: GiftPage, send: (e: PeekEvent) => void) {
  const client = getClient();
  let page = startPage;

  const aMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let finalText = "";

  // Manual streaming tool loop: stream text live, apply each tool to the page,
  // push a snapshot to the client, feed results back, repeat until end_turn.
  // Loop is bounded to avoid a runaway tool cycle.
  for (let turn = 0; turn < 12; turn++) {
    finalText = "";
    const params: any = {
      model: PEEK_MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: [{ type: "text", text: PEEK_SYSTEM, cache_control: { type: "ephemeral" } }],
      tools: PEEK_TOOLS,
      messages: aMessages,
    };

    const llm = client.messages.stream(params);
    llm.on("text", (delta: string) => {
      finalText += delta;
      send({ type: "text", text: delta });
    });

    const msg = await llm.finalMessage();
    aMessages.push({ role: "assistant", content: msg.content });

    const toolUses = msg.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (toolUses.length === 0) break;

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const { page: nextPage, result } = applyTool(page, tu.name, tu.input);
      page = nextPage;
      send({ type: "page", page });
      results.push({ type: "tool_result", tool_use_id: tu.id, content: result });
    }
    aMessages.push({ role: "user", content: results });
  }

  send({ type: "done", message: finalText });
}
