import type { NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/client';
import { env } from '@/lib/env';
import { getSupabaseService } from '@/lib/supabase/service';
import { track } from '@/lib/analytics/facade';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PeekRow = {
  id: string;
  slug: string;
  status: 'draft' | 'published' | 'claimed' | 'archived';
};

export async function POST(req: NextRequest): Promise<Response> {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('missing signature', { status: 400 });
  }
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return new Response('webhook not configured', { status: 500 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    return new Response(`invalid signature: ${message}`, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response('ok', { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const peekId = session.metadata?.peek_id;
  const curatorId = session.metadata?.curator_id ?? null;
  if (!peekId) {
    return new Response('missing peek_id metadata', { status: 200 });
  }

  const sb = getSupabaseService();
  const { data: peekData, error: peekErr } = await sb
    .from('peeks')
    .select('id, slug, status')
    .eq('id', peekId)
    .maybeSingle();

  if (peekErr) {
    return new Response(`lookup failed: ${peekErr.message}`, { status: 500 });
  }
  if (!peekData) {
    return new Response('peek not found', { status: 200 });
  }
  const peek = peekData as PeekRow;
  if (peek.status === 'published' || peek.status === 'claimed') {
    return new Response('already published', { status: 200 });
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  const nowIso = new Date().toISOString();
  const shareUrl = `${env.APP_URL}/g/${peek.slug}`;

  const { error: updErr } = await sb
    .from('peeks')
    .update({
      status: 'published',
      published_at: nowIso,
      share_url: shareUrl,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      updated_at: nowIso,
    })
    .eq('id', peekId);

  if (updErr) {
    return new Response(`update failed: ${updErr.message}`, { status: 500 });
  }

  await track({
    name: 'publish',
    peekId,
    userId: curatorId,
    payload: {
      mock: false,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      amount_total: session.amount_total,
      currency: session.currency,
    },
  });

  return new Response('ok', { status: 200 });
}
