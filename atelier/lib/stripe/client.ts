import 'server-only';
import Stripe from 'stripe';
import { env } from '@/lib/env';

let _client: Stripe | null = null;

export function getStripe(): Stripe {
  if (_client) return _client;
  if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set');
  _client = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-04-22.dahlia',
  });
  return _client;
}

export const PAY_MODE: 'mock' | 'live' = env.PAY_MODE ?? 'mock';
