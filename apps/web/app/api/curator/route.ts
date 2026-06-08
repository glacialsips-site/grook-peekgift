import Anthropic from "@anthropic-ai/sdk";
import { runCuratorTurnStreaming, runSafewordReport, type TurnMessage, type StreamEvent } from "@/lib/curator/turn";
import { applyPageOp } from "@/lib/curator/page-html";
import { buildDraftDocument } from "@/lib/curator/draft";
import { loadDocumentById, savePeekDocument } from "@/lib/persistence/store";

export const runtime = "nodejs";
export const maxDuration = 120;

interface Body {
  messages?: TurnMessage[];
  peekId?: string;
  curatorId?: string;
  currentHtml?: string;
}

function lastUserText(messages: TurnMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m || m.role !== "user") continue;
    const c = m.content;
    if (typeof c === "string") return c;
    if (Array.isArray(c)) {
      const t = c.find((b) => (b as { type?: string }).type === "text") as { text?: string } | undefined;
      return t?.text ?? "";
    }
    return "";
  }
  return "";
}

export async function POST(req: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not configured in this environment." }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  let messages = Array.isArray(body.messages) ? body.messages : [];
  const firstUser = messages.findIndex((m) => m.role === "user");
  if (firstUser > 0) messages = messages.slice(firstUser);
  if (messages.length === 0 || firstUser === -1) {
    return Response.json({ error: "messages must include a user turn" }, { status: 400 });
  }

  const safeword = (process.env.PEEK_SAFEWORD ?? "bananahead").trim().toLowerCase();
  const isSafeword = lastUserText(messages).trim().toLowerCase() === safeword;

  const client = new Anthropic();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let currentHtml = typeof body.currentHtml === "string" ? body.currentHtml : "";
      try { controller.enqueue(encoder.encode(": warming up\n\n")); } catch { closed = true; }
      const ping = setInterval(() => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(": ping\n\n")); } catch { closed = true; }
      }, 15000);
      const emit = (e: StreamEvent) => {
        if (e.type === "page" || e.type === "patch" || e.type === "style" || e.type === "media") {
          currentHtml = applyPageOp(currentHtml, e);
        }
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          closed = true;
        }
      };
      try {
        if (isSafeword) await runSafewordReport(client, { messages }, emit);
        else await runCuratorTurnStreaming(client, { messages, currentHtml: currentHtml || undefined }, emit);
      } catch (e) {
        emit({ type: "error", error: (e as Error).message ?? "curator turn failed" });
      }
      if (!isSafeword && body.peekId && currentHtml.trim()) {
        try {
          const base = await loadDocumentById(body.peekId);
          const doc = buildDraftDocument({
            peekId: body.peekId,
            curatorId: body.curatorId ?? null,
            html: currentHtml,
            base,
          });
          const saved = await savePeekDocument(doc);
          if (saved.ok) emit({ type: "saved", slug: doc.spine.peek.slug, peekId: body.peekId });
        } catch {
        }
      }
      clearInterval(ping);
      try {
        controller.close();
      } catch {
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
