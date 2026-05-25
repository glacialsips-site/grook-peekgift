import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { q, q1opt } from '@/lib/db';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return new Response('missing_sig', { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret);
  } catch (e: any) {
    return new Response('bad_sig: ' + (e?.message || ''), { status: 400 });
  }

  const base = process.env.APP_URL || 'http://localhost:3000';

  if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
    const peekId =
      (event.data.object as any)?.metadata?.peek_id ||
      (event.data.object as Stripe.Checkout.Session)?.metadata?.peek_id;
    if (peekId) {
      const peek = await q1opt<{ slug: string }>(`SELECT slug FROM peeks WHERE id = $1`, [peekId]);
      const slug = peek?.slug;
      const shareUrl = slug ? `${base}/g/${slug}` : null;
      await q(
        `UPDATE peeks SET status = 'published', published_at = now(), share_url = $1 WHERE id = $2`,
        [shareUrl, peekId]
      );
      await q(
        `INSERT INTO events (peek_id, kind, payload) VALUES ($1,'published_live',$2::jsonb)`,
        [peekId, JSON.stringify({ event_id: event.id })]
      );
    }
  }

  return Response.json({ received: true });
}
