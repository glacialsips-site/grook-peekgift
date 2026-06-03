import Anthropic from "@anthropic-ai/sdk";
import { validatePeekIR, emptyDocument } from "@peek/core";
import { runCuratorTurnStreaming, runSafewordReport, type TurnMessage, type StreamEvent } from "@/lib/curator/turn";
import { savePeekDocument } from "@/lib/persistence/store";

// Server-only. The Anthropic call never reaches the client. Live, no mock: without a key
// it returns an honest 503. Streams the turn as Server-Sent Events so the preview builds in
// real time; persists the final snapshot.
export const runtime = "nodejs";
export const maxDuration = 120;

interface Body {
  doc?: unknown;
  messages?: TurnMessage[];
  peekId?: string;
  curatorId?: string;
}

// The founder handshake: when the last user message is exactly the safeword, the turn drops
// the peek persona and streams a structured self-report instead of authoring the page.
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

  const seedDoc =
    body.doc ??
    emptyDocument({ id: body.peekId ?? "draft", slug: body.peekId ?? "draft", curator_id: body.curatorId ?? "anon" });
  const parsed = validatePeekIR(seedDoc);
  if (!parsed.ok) {
    return Response.json({ error: `invalid document: ${parsed.error}` }, { status: 400 });
  }
  let messages = Array.isArray(body.messages) ? body.messages : [];
  // The Anthropic API requires the first message to be a user turn. The studio seeds an
  // assistant greeting in the UI; drop any leading non-user messages before the first user.
  const firstUser = messages.findIndex((m) => m.role === "user");
  if (firstUser > 0) messages = messages.slice(firstUser);
  if (messages.length === 0 || firstUser === -1) {
    return Response.json({ error: "messages must include a user turn" }, { status: 400 });
  }

  // Founder handshake detection (config, never inline in the system prompt).
  const safeword = (process.env.PEEK_SAFEWORD ?? "bananahead").trim().toLowerCase();
  const isSafeword = lastUserText(messages).trim().toLowerCase() === safeword;

  const client = new Anthropic();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // If the client navigates away mid-turn, enqueue throws; swallow it so the work unwinds
      // cleanly instead of surfacing a phantom "curator turn failed" on a dead connection.
      let closed = false;
      const emit = (e: StreamEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          closed = true;
        }
      };
      try {
        if (isSafeword) {
          // The founder handshake — report, don't author; nothing to persist.
          await runSafewordReport(client, { doc: parsed.value, messages }, emit);
        } else {
          const finalDoc = await runCuratorTurnStreaming(client, { doc: parsed.value, messages }, emit);
          try {
            await savePeekDocument(finalDoc);
          } catch {
            /* persistence optional here; deploy holds the Supabase key */
          }
        }
      } catch (e) {
        emit({ type: "error", error: (e as Error).message ?? "curator turn failed" });
      }
      try {
        controller.close();
      } catch {
        /* already closed by client disconnect */
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
