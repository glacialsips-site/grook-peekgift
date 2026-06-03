import Anthropic from "@anthropic-ai/sdk";
import { runCuratorTurnStreaming, runSafewordReport, type TurnMessage, type StreamEvent } from "@/lib/curator/turn";

// Server-only. The Anthropic call never reaches the client. Live, no mock: without a key it
// returns an honest 503. Streams the turn as Server-Sent Events so the preview iframe builds in
// real time. The page is the model's HTML — persistence happens at publish (client serializes the
// rendered iframe), so the turn just streams ops.
export const runtime = "nodejs";
export const maxDuration = 120;

interface Body {
  messages?: TurnMessage[];
  peekId?: string;
  curatorId?: string;
}

// The founder handshake: when the last user message is exactly the safeword, the turn drops the
// peek persona and streams a structured self-report instead of authoring the page.
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
  // The Anthropic API requires the first message to be a user turn. The studio seeds an assistant
  // greeting in the UI; drop any leading non-user messages before the first user.
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
      // cleanly instead of surfacing a phantom failure on a dead connection.
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
        if (isSafeword) await runSafewordReport(client, { messages }, emit);
        else await runCuratorTurnStreaming(client, { messages }, emit);
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
