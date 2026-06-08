import { createPublishCheckout, paymentConfigured } from "@/lib/payment/stripe";
import { loadPeekById } from "@/lib/persistence/store";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  if (!paymentConfigured()) {
    return Response.json({ error: "payments not configured in this environment" }, { status: 503 });
  }
  let body: { peekId?: string };
  try {
    body = (await req.json()) as { peekId?: string };
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!body.peekId) return Response.json({ error: "peekId is required" }, { status: 400 });

  const doc = await loadPeekById(body.peekId);
  if (!doc) return Response.json({ error: "peek not found — save a draft first" }, { status: 404 });

  const appUrl = process.env.APP_URL ?? new URL(req.url).origin;
  const res = await createPublishCheckout({ peekId: doc.peek.id, curatorId: doc.peek.curator_id, appUrl });
  if ("error" in res) return Response.json(res, { status: 500 });
  return Response.json({ clientSecret: res.clientSecret });
}
