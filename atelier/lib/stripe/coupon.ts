import 'server-only';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/client';

export type CouponValidation =
  | { valid: true; promotion_code_id: string; code: string; discount: CouponDiscount }
  | { valid: false; reason: string };

export type CouponDiscount =
  | { kind: 'percent'; percent_off: number }
  | { kind: 'amount'; amount_off: number; currency: string };

export async function validatePromotionCode(code: string): Promise<CouponValidation> {
  const stripe = getStripe();
  const trimmed = code.trim();
  if (!trimmed) return { valid: false, reason: 'empty' };
  if (trimmed.length > 60) return { valid: false, reason: 'too_long' };

  const list = await stripe.promotionCodes.list({
    code: trimmed,
    active: true,
    limit: 1,
    expand: ['data.promotion.coupon'],
  });
  const pc = list.data[0];
  if (!pc) return { valid: false, reason: 'not_found' };
  const promotion = pc.promotion;
  const couponRef = promotion?.coupon ?? null;
  const coupon: Stripe.Coupon | null =
    couponRef && typeof couponRef === 'object'
      ? couponRef
      : typeof couponRef === 'string'
        ? await stripe.coupons.retrieve(couponRef)
        : null;
  if (!coupon) return { valid: false, reason: 'not_found' };
  if (!coupon.valid) return { valid: false, reason: 'expired' };

  if (coupon.percent_off != null) {
    return {
      valid: true,
      promotion_code_id: pc.id,
      code: pc.code,
      discount: { kind: 'percent', percent_off: coupon.percent_off },
    };
  }
  if (coupon.amount_off != null) {
    return {
      valid: true,
      promotion_code_id: pc.id,
      code: pc.code,
      discount: {
        kind: 'amount',
        amount_off: coupon.amount_off,
        currency: coupon.currency ?? 'usd',
      },
    };
  }
  return { valid: false, reason: 'malformed' };
}

export function applyDiscount(
  base: number,
  discount: CouponDiscount | null,
): number {
  if (!discount) return base;
  if (discount.kind === 'percent') {
    const off = Math.round((base * discount.percent_off) / 100);
    return Math.max(0, base - off);
  }
  return Math.max(0, base - discount.amount_off);
}

export function discountAmount(
  base: number,
  discount: CouponDiscount | null,
): number {
  if (!discount) return 0;
  return base - applyDiscount(base, discount);
}

export function couponToClient(v: CouponValidation, base?: number) {
  if (!v.valid) {
    return { valid: false as const, reason: v.reason };
  }
  const out: {
    valid: true;
    code: string;
    discount_kind: 'percent' | 'amount';
    discount_pct?: number;
    discount_amount?: number;
    currency?: string;
    savings?: number;
  } = {
    valid: true,
    code: v.code,
    discount_kind: v.discount.kind,
  };
  if (v.discount.kind === 'percent') {
    out.discount_pct = v.discount.percent_off;
  } else {
    out.discount_amount = v.discount.amount_off;
    out.currency = v.discount.currency;
  }
  if (base != null) out.savings = discountAmount(base, v.discount);
  return out;
}

export async function resolvePriceAmount(priceId: string): Promise<{
  amount: number;
  currency: string;
  product_id: string;
}> {
  const stripe = getStripe();
  const price: Stripe.Price = await stripe.prices.retrieve(priceId);
  if (price.unit_amount == null) {
    throw new Error('price_has_no_unit_amount');
  }
  const productId = typeof price.product === 'string' ? price.product : price.product.id;
  return {
    amount: price.unit_amount,
    currency: price.currency,
    product_id: productId,
  };
}
