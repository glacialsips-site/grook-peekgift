import type { NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/client';
import { env } from '@/lib/env';
import { getSupabaseService } from '@/lib/supabase/service';
import { track } from '@/lib/analytics/facade';
import { inngest } from '@/lib/inngest/client';
import { checkIdempotency } from '@/lib/security/idempotency';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function logWebhook(payload: Record<string, unknown>, success: boolean) {
  try {
    await inngest.send({
      name: 'peek/webhook.received',
      data: { source: 'stripe', payload, success },
    });
  } catch {}
}

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
    await logWebhook({ error: 'invalid_signature', message }, false);
    return new Response(`invalid signature: ${message}`, { status: 400 });
  }

  const idemp = await checkIdempotency({ source: 'stripe', eventId: event.id });
  if (!idemp.firstSeen) {
    void logWebhook(
      { id: event.id, type: event.type, idempotent: true },
      true,
    );
    return new Response('ok', { status: 200 });
  }

  let success = false;
  try {
    if (event.type !== 'checkout.session.completed') {
      success = true;
      return new Response('ok', { status: 200 });
    }

    const session = event.data.object;
    const peekId = session.metadata?.['peek_id'];
    const curatorId = session.metadata?.['curator_id'] ?? null;
    if (!peekId) {
      success = true;
      return new Response('missing peek_id metadata', { status: 200 });
    }

    const sb = getSupabaseService();
    const { data: peek, error: peekErr } = await sb
      .from('peeks')
      .select('id, slug, status')
      .eq('id', peekId)
      .maybeSingle();

    if (peekErr) {
      return new Response(`lookup failed: ${peekErr.message}`, { status: 500 });
    }
    if (!peek) {
      success = true;
      return new Response('peek not found', { status: 200 });
    }
    if (peek.status === 'published' || peek.status === 'claimed') {
      success = true;
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

    success = true;
    return new Response('ok', { status: 200 });
  } finally {
    void logWebhook(
      {
        id: event.id,
        type: event.type,
        livemode: event.livemode,
        created: event.created,
      },
      success,
    );
  }
}
