'use client';

import { loadStripe, type Stripe } from '@stripe/stripe-js';

let _promise: Promise<Stripe | null> | null = null;

export function getStripeBrowser(): Promise<Stripe | null> {
  if (_promise) return _promise;
  const pk = process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'];
  if (!pk) {
    _promise = Promise.resolve(null);
    return _promise;
  }
  _promise = loadStripe(pk);
  return _promise;
}
