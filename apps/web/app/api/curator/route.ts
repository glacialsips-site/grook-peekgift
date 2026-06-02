import Anthropic from "@anthropic-ai/sdk";
import { validatePeekIR, emptyDocument } from "@peek/core";
import { runCuratorTurn, type TurnMessage } from "@/lib/curator/turn";

// Server-only. The Anthropic call never reaches the client. Live, no mock: without a key
// it returns an honest 503 rather than a fake turn.
export const runtime = "nodejs";
export const maxDuration = 120;

interface Body {
  doc?: unknown;
  messages?: TurnMessage[];
  peekId?: string;
  curatorId?: string;
}

export async function POST(req: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured in this environment." },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const seedDoc =
    body.doc ??
    emptyDocument({
      id: body.peekId ?? "draft",
      slug: body.peekId ?? "draft",
      curator_id: body.curatorId ?? "anon",
    });
  const parsed = validatePeekIR(seedDoc);
  if (!parsed.ok) {
    return Response.json({ error: `invalid document: ${parsed.error}` }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return Response.json({ error: "messages is required" }, { status: 400 });
  }

  try {
    const client = new Anthropic();
    const result = await runCuratorTurn(client, { doc: parsed.value, messages });
    return Response.json({ doc: result.doc, text: result.text, tools: result.tools });
  } catch (e) {
    return Response.json({ error: (e as Error).message ?? "curator turn failed" }, { status: 500 });
  }
}
