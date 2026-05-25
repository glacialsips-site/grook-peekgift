import Stripe from 'stripe';

const stripeSecret = process.env.STRIPE_SECRET_KEY;
let _stripe: Stripe | null = null;

export function stripe(): Stripe {
  if (!_stripe) {
    if (!stripeSecret) throw new Error('STRIPE_SECRET_KEY missing');
    _stripe = new Stripe(stripeSecret, { apiVersion: '2025-09-30.clover' as Stripe.LatestApiVersion });
  }
  return _stripe;
}

export const PAY_MODE = (process.env.PAY_MODE || 'mock') as 'mock' | 'live';
export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || '';

export function isMockPay(): boolean {
  return PAY_MODE !== 'live';
}
