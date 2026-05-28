import type { NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/client';
import { env } from '@/lib/env';
import { getSupabaseService } from '@/lib/supabase/service';
import { track } from '@/lib/analytics/facade';
import { inngest } from '@/lib/inngest/client';
import { checkIdempotency } from '@/lib/security/idempotency';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'api/stripe/webhook' });

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function logWebhook(payload: Record<string, unknown>, success: boolean) {
  try {
    await inngest.send({
      name: 'peek/webhook.received',
      data: { source: 'stripe', payload, success },
    });
  } catch (err) {
    log.warn('inngest_publish_failed', {
      source: 'stripe',
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

type PublishOutcome = 'published' | 'already' | 'missing' | 'error';

async function publishPeek(args: {
  peekId: string;
  curatorId: string | null;
  source: 'checkout_session' | 'payment_intent';
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  amountTotal?: number | null;
  currency?: string | null;
}): Promise<PublishOutcome> {
  const sb = getSupabaseService();
  const { data: peek, error: peekErr } = await sb
    .from('peeks')
    .select('id, slug, status')
    .eq('id', args.peekId)
    .maybeSingle();
  if (peekErr) {
    log.error('peek_lookup_failed', { peekId: args.peekId, err: peekErr.message });
    return 'error';
  }
  if (!peek) return 'missing';
  if (peek.status === 'published' || peek.status === 'claimed') return 'already';

  const nowIso = new Date().toISOString();
  const shareUrl = `${env.APP_URL}/g/${peek.slug}`;
  const { error: updErr } = await sb
    .from('peeks')
    .update({
      status: 'published',
      published_at: nowIso,
      share_url: shareUrl,
      stripe_checkout_session_id: args.stripeCheckoutSessionId ?? null,
      stripe_payment_intent_id: args.stripePaymentIntentId ?? null,
      updated_at: nowIso,
    })
    .eq('id', args.peekId);
  if (updErr) {
    log.error('peek_update_failed', { peekId: args.peekId, err: updErr.message });
    return 'error';
  }

  await track({
    name: 'publish',
    peekId: args.peekId,
    userId: args.curatorId,
    payload: {
      mock: false,
      stripe_checkout_session_id: args.stripeCheckoutSessionId ?? undefined,
      stripe_payment_intent_id: args.stripePaymentIntentId ?? undefined,
      amount_total: args.amountTotal ?? undefined,
      currency: args.currency ?? undefined,
    },
  });

  log.info('peek_published', {
    peekId: args.peekId,
    source: args.source,
    payment_intent_id: args.stripePaymentIntentId ?? null,
  });
  return 'published';
}

type PaymentFailedOutcome = 'recorded' | 'already_terminal' | 'missing' | 'error';

async function markPeekPaymentFailed(args: {
  peekId: string;
  curatorId: string | null;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  failureReason?: string | null;
  paymentMethodType?: string | null;
}): Promise<PaymentFailedOutcome> {
  const sb = getSupabaseService();
  const { data: peek, error: peekErr } = await sb
    .from('peeks')
    .select('id, status')
    .eq('id', args.peekId)
    .maybeSingle();
  if (peekErr) {
    log.error('peek_lookup_failed', { peekId: args.peekId, err: peekErr.message });
    return 'error';
  }
  if (!peek) return 'missing';
  if (peek.status === 'published' || peek.status === 'claimed') {
    return 'already_terminal';
  }

  const nowIso = new Date().toISOString();
  if (peek.status !== 'draft') {
    const { error: updErr } = await sb
      .from('peeks')
      .update({ status: 'draft', updated_at: nowIso })
      .eq('id', args.peekId);
    if (updErr) {
      log.error('peek_revert_failed', { peekId: args.peekId, err: updErr.message });
      return 'error';
    }
  }

  const { error: evErr } = await sb.from('events').insert({
    user_id: args.curatorId,
    session_id: null,
    peek_id: args.peekId,
    kind: 'peek_payment_failed',
    payload: {
      stripe_checkout_session_id: args.stripeCheckoutSessionId ?? null,
      stripe_payment_intent_id: args.stripePaymentIntentId ?? null,
      failure_reason: args.failureReason ?? null,
      payment_method_type: args.paymentMethodType ?? null,
    },
  });
  if (evErr) {
    log.error('peek_payment_failed_event_insert_failed', {
      peekId: args.peekId,
      err: evErr.message,
    });
  }

  log.info('peek_payment_failed', {
    peekId: args.peekId,
    payment_intent_id: args.stripePaymentIntentId ?? null,
    reason: args.failureReason ?? null,
  });
  return 'recorded';
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    // No webhook secret configured: gracefully no-op so unkeyed deliveries
    // don't pile up as failed retries on Stripe's side. Log so we notice if
    // events arrive before the integration is provisioned.
    log.warn('webhook_unconfigured', { reason: 'STRIPE_WEBHOOK_SECRET unset' });
    return Response.json(
      { received: true, skipped: 'service_not_configured' },
      { status: 200 },
    );
  }
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('missing signature', { status: 400 });
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
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        const peekId = session.metadata?.['peek_id'];
        const curatorId =
          session.metadata?.['curator_clerk_id'] ?? session.metadata?.['curator_id'] ?? null;
        if (!peekId) {
          success = true;
          return new Response('missing peek_id metadata', { status: 200 });
        }
        const paymentIntentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : (session.payment_intent?.id ?? null);
        const outcome = await publishPeek({
          peekId,
          curatorId,
          source: 'checkout_session',
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
          amountTotal: session.amount_total,
          currency: session.currency,
        });
        if (outcome === 'error') {
          return new Response('update failed', { status: 500 });
        }
        success = true;
        return new Response('ok', { status: 200 });
      }

      case 'checkout.session.async_payment_failed': {
        const session = event.data.object;
        const peekId = session.metadata?.['peek_id'];
        const curatorId =
          session.metadata?.['curator_clerk_id'] ?? session.metadata?.['curator_id'] ?? null;
        if (!peekId) {
          success = true;
          return new Response('missing peek_id metadata', { status: 200 });
        }
        const paymentIntentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : (session.payment_intent?.id ?? null);
        const paymentMethodType =
          session.payment_method_types && session.payment_method_types.length > 0
            ? session.payment_method_types[0]
            : null;
        const failureReason =
          (session as unknown as { last_payment_error?: { message?: string; code?: string } })
            .last_payment_error?.message ??
          (session as unknown as { last_payment_error?: { code?: string } }).last_payment_error
            ?.code ??
          null;
        const outcome = await markPeekPaymentFailed({
          peekId,
          curatorId,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
          failureReason,
          paymentMethodType,
        });
        if (outcome === 'error') {
          return new Response('update failed', { status: 500 });
        }
        success = true;
        return new Response('ok', { status: 200 });
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        const peekId = pi.metadata?.['peek_id'];
        const curatorId =
          pi.metadata?.['curator_clerk_id'] ?? pi.metadata?.['curator_id'] ?? null;
        if (!peekId) {
          success = true;
          return new Response('missing peek_id metadata', { status: 200 });
        }
        const outcome = await publishPeek({
          peekId,
          curatorId,
          source: 'payment_intent',
          stripePaymentIntentId: pi.id,
          amountTotal: pi.amount_received ?? pi.amount,
          currency: pi.currency,
        });
        if (outcome === 'error') {
          return new Response('update failed', { status: 500 });
        }
        success = true;
        return new Response('ok', { status: 200 });
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        log.info('invoice_paid', {
          invoice_id: invoice.id,
          customer: invoice.customer,
          subscription: (invoice as unknown as { subscription?: string | null }).subscription ?? null,
          amount_paid: invoice.amount_paid,
        });
        success = true;
        return new Response('ok', { status: 200 });
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        log.info('subscription_event', {
          type: event.type,
          subscription_id: sub.id,
          status: sub.status,
          customer: sub.customer,
        });
        success = true;
        return new Response('ok', { status: 200 });
      }

      default: {
        success = true;
        return new Response('ok', { status: 200 });
      }
    }
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
