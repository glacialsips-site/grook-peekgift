import { decidePick } from "@peek/core";
import { loadPeekBySlug } from "@/lib/persistence/store";
import { loadPicks, savePicks } from "@/lib/persistence/picks";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  let body: { slug?: string; cardId?: string };
  try {
    body = (await req.json()) as { slug?: string; cardId?: string };
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!body.slug || !body.cardId) {
    return Response.json({ error: "slug and cardId are required" }, { status: 400 });
  }

  const doc = await loadPeekBySlug(body.slug);
  if (!doc) return Response.json({ error: "peek not found" }, { status: 404 });

  const current = await loadPicks(doc.peek.id);
  const r = decidePick(doc, current, { type: "toggle", cardId: body.cardId });
  if (r.isErr()) {
    return Response.json({ error: r.error.message, code: r.error.code }, { status: 409 });
  }

  const saved = await savePicks(doc.peek.id, r.value.picks);
  if (!saved.ok) return Response.json({ error: saved.error }, { status: 503 });

  return Response.json({
    picks: r.value.picks,
    committedCents: r.value.committedCents,
    overSoftCap: r.value.overSoftCap,
  });
}
