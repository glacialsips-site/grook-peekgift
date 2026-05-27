import type { NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { z } from 'zod';
import { getStripe, PAY_MODE } from '@/lib/stripe/client';
import { env } from '@/lib/env';
import { getSupabaseService } from '@/lib/supabase/service';
import { getUserId } from '@/lib/auth/server';
import { getOrCreateCustomer } from '@/lib/stripe/customer';
import {
  validatePromotionCode,
  resolvePriceAmount,
  applyDiscount,
  discountAmount,
  type CouponValidation,
} from '@/lib/stripe/coupon';
import { track } from '@/lib/analytics/facade';
import {
  enforceRateLimit,
  limiters,
  rateLimitResponse,
} from '@/lib/rate-limit/redis';
import { isOriginAllowed, originRejectionResponse } from '@/lib/security/origin';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'api/checkout' });

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RequestSchema = z
  .object({
    peekId: z.string().uuid(),
    mode: z.enum(['payment', 'subscription']).default('payment'),
    coupon: z.string().trim().min(1).max(60).optional(),
    currency: z.string().length(3).toLowerCase().optional(),
    price_id: z.string().optional(),
  })
  .strict();

type CheckoutSuccess =
  | {
      mode: 'payment';
      client_secret: string;
      payment_intent_id: string;
      amount: number;
      currency: string;
      base_amount: number;
      savings: number;
      applied_coupon: AppliedCoupon | null;
    }
  | {
      mode: 'subscription';
      client_secret: string;
      subscription_id: string;
      amount: number;
      currency: string;
      base_amount: number;
      savings: number;
      applied_coupon: AppliedCoupon | null;
    }
  | { mock: true; redirect_url: string };

type AppliedCoupon = {
  code: string;
  promotion_code_id: string;
  discount_kind: 'percent' | 'amount';
  discount_pct?: number;
  discount_amount?: number;
};

function appliedFromValidation(v: CouponValidation): AppliedCoupon | null {
  if (!v.valid) return null;
  if (v.discount.kind === 'percent') {
    return {
      code: v.code,
      promotion_code_id: v.promotion_code_id,
      discount_kind: 'percent',
      discount_pct: v.discount.percent_off,
    };
  }
  return {
    code: v.code,
    promotion_code_id: v.promotion_code_id,
    discount_kind: 'amount',
    discount_amount: v.discount.amount_off,
  };
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!isOriginAllowed(req)) {
    return originRejectionResponse();
  }

  const userId = await getUserId();
  if (!userId) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const verdict = await enforceRateLimit(limiters.checkoutPerUser(), userId);
  if (!verdict.ok) return rateLimitResponse(verdict);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: 'bad_request', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { peekId, mode, coupon, currency: currencyOverride, price_id: priceOverride } = parsed.data;

  const sb = getSupabaseService();
  const { data: peek, error: peekErr } = await sb
    .from('peeks')
    .select('id, slug, curator_id, status')
    .eq('id', peekId)
    .maybeSingle();

  if (peekErr) {
    return Response.json(
      { error: 'lookup_failed', message: peekErr.message },
      { status: 500 },
    );
  }
  if (!peek) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }
  if (peek.curator_id !== userId) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }
  if (peek.status === 'published' || peek.status === 'claimed') {
    return Response.json({ error: 'already_published' }, { status: 409 });
  }

  if (PAY_MODE === 'mock') {
    const nowIso = new Date().toISOString();
    const shareUrl = `${env.APP_URL}/g/${peek.slug}`;
    const { error: updErr } = await sb
      .from('peeks')
      .update({
        status: 'published',
        published_at: nowIso,
        share_url: shareUrl,
        updated_at: nowIso,
      })
      .eq('id', peekId);
    if (updErr) {
      return Response.json(
        { error: 'update_failed', message: updErr.message },
        { status: 500 },
      );
    }
    await track({
      name: 'publish',
      peekId,
      userId,
      payload: { mock: true },
    });
    const body: CheckoutSuccess = {
      mock: true,
      redirect_url: `/build/${peekId}/publish?mock=1`,
    };
    return Response.json(body);
  }

  const priceId = priceOverride ?? env.STRIPE_PRICE_ID;
  if (!priceId) {
    return Response.json(
      { error: 'stripe_not_configured', message: 'STRIPE_PRICE_ID missing' },
      { status: 500 },
    );
  }

  try {
    const stripe = getStripe();
    const price = await resolvePriceAmount(priceId);
    const baseAmount = price.amount;
    const finalCurrency = currencyOverride ?? price.currency;

    let validation: CouponValidation = { valid: false, reason: 'none' };
    if (coupon) {
      validation = await validatePromotionCode(coupon);
    }
    const applied = appliedFromValidation(validation);
    const finalAmount =
      validation.valid ? applyDiscount(baseAmount, validation.discount) : baseAmount;
    const savings = baseAmount - finalAmount;

    const customer = await getOrCreateCustomer(userId);

    if (mode === 'subscription') {
      const subParams: Stripe.SubscriptionCreateParams = {
        customer: customer.id,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent', 'latest_invoice.confirmation_secret'],
        automatic_tax: { enabled: true },
        metadata: { peek_id: peekId, curator_clerk_id: userId },
      };
      if (validation.valid) {
        subParams.discounts = [{ promotion_code: validation.promotion_code_id }];
      }
      const subscription = await stripe.subscriptions.create(subParams);
      const latestInvoice = subscription.latest_invoice as Stripe.Invoice | null;
      const piRaw = latestInvoice
        ? (latestInvoice as unknown as { payment_intent?: Stripe.PaymentIntent | string | null })
            .payment_intent
        : null;
      const pi =
        piRaw && typeof piRaw === 'object' ? (piRaw as Stripe.PaymentIntent) : null;
      const confirmationSecret =
        (latestInvoice as unknown as { confirmation_secret?: { client_secret?: string } } | null)
          ?.confirmation_secret?.client_secret ?? null;
      const clientSecret = pi?.client_secret ?? confirmationSecret;
      if (!clientSecret) {
        return Response.json(
          { error: 'subscription_client_secret_missing' },
          { status: 500 },
        );
      }
      const body: CheckoutSuccess = {
        mode: 'subscription',
        client_secret: clientSecret,
        subscription_id: subscription.id,
        amount: finalAmount,
        currency: finalCurrency,
        base_amount: baseAmount,
        savings,
        applied_coupon: applied,
      };
      return Response.json(body);
    }

    const piParams: Stripe.PaymentIntentCreateParams = {
      amount: finalAmount,
      currency: finalCurrency,
      customer: customer.id,
      automatic_payment_methods: { enabled: true, allow_redirects: 'always' },
      setup_future_usage: 'off_session',
      receipt_email: customer.email ?? undefined,
      description: 'peek.gift — publish gate',
      statement_descriptor_suffix: 'PEEK',
      metadata: {
        peek_id: peekId,
        curator_clerk_id: userId,
        price_id: priceId,
        base_amount: String(baseAmount),
      },
    };
    if (applied) {
      piParams.metadata = {
        ...piParams.metadata,
        promotion_code_id: applied.promotion_code_id,
        coupon_code: applied.code,
        discount_amount_cents: String(discountAmount(baseAmount, validation.valid ? validation.discount : null)),
      };
    }

    const intent = await stripe.paymentIntents.create(piParams);
    if (!intent.client_secret) {
      return Response.json(
        { error: 'payment_intent_client_secret_missing' },
        { status: 500 },
      );
    }
    const body: CheckoutSuccess = {
      mode: 'payment',
      client_secret: intent.client_secret,
      payment_intent_id: intent.id,
      amount: finalAmount,
      currency: finalCurrency,
      base_amount: baseAmount,
      savings,
      applied_coupon: applied,
    };
    return Response.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    log.error('checkout_failed', { peekId, userId, mode, message });
    return Response.json(
      { error: 'stripe_failed', message },
      { status: 500 },
    );
  }
}
