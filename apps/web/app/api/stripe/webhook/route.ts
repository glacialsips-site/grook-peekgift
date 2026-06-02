import type Stripe from "stripe";
import { stripeClient } from "@/lib/payment/stripe";
import { markPeekPublished } from "@/lib/persistence/store";

// On a completed $12 checkout, publish the peek. Idempotent (publishing an already-published
// peek is a no-op). The raw body + signature are verified against STRIPE_WEBHOOK_SECRET.
export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  const s = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s || !secret) return new Response("stripe not configured", { status: 503 });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("missing stripe-signature", { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await s.webhooks.constructEventAsync(raw, sig, secret);
  } catch (e) {
    return new Response(`bad signature: ${(e as Error).message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
    const obj = event.data.object as { id: string; metadata?: Record<string, string> | null; payment_intent?: string };
    const peekId = obj.metadata?.peek_id;
    if (peekId) {
      await markPeekPublished(peekId, {
        sessionId: event.type === "checkout.session.completed" ? obj.id : undefined,
        paymentIntentId: event.type === "payment_intent.succeeded" ? obj.id : undefined,
      });
    }
  }

  return new Response("ok", { status: 200 });
}
