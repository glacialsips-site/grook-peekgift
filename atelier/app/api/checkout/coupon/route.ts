import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';
import { PAY_MODE } from '@/lib/stripe/client';
import { getUserId } from '@/lib/auth/server';
import {
  validatePromotionCode,
  resolvePriceAmount,
  couponToClient,
} from '@/lib/stripe/coupon';
import {
  enforceRateLimit,
  limiters,
  rateLimitResponse,
} from '@/lib/rate-limit/redis';
import { isOriginAllowed, originRejectionResponse } from '@/lib/security/origin';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'api/checkout/coupon' });

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RequestSchema = z
  .object({
    code: z.string().trim().min(1).max(60),
    price_id: z.string().optional(),
  })
  .strict();

export async function POST(req: NextRequest): Promise<Response> {
  if (!isOriginAllowed(req)) {
    return originRejectionResponse();
  }

  const userId = await getUserId();
  if (!userId) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const verdict = await enforceRateLimit(limiters.checkoutPerUser(), `coupon:${userId}`);
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
  const { code, price_id } = parsed.data;

  if (PAY_MODE === 'mock') {
    return Response.json({
      valid: true,
      code,
      discount_kind: 'percent',
      discount_pct: 100,
      savings: 1200,
      mock: true,
    });
  }

  try {
    const priceId = price_id ?? env.STRIPE_PRICE_ID;
    let base: number | undefined;
    let currency: string | undefined;
    if (priceId) {
      const price = await resolvePriceAmount(priceId);
      base = price.amount;
      currency = price.currency;
    }
    const v = await validatePromotionCode(code);
    if (!v.valid) {
      return Response.json({ valid: false, reason: v.reason });
    }
    const out = couponToClient(v, base);
    return Response.json({ ...out, base_amount: base, currency });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    log.error('coupon_validation_failed', { userId, message });
    return Response.json(
      { valid: false, reason: 'validation_failed', message },
      { status: 500 },
    );
  }
}
