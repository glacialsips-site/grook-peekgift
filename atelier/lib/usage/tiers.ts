export type TierName =
  | 'guest'
  | 'authenticated'
  | 'purchased_once'
  | 'purchased_multiple'
  | 'subscriber'
  | 'gift_recipient'
  | 'promo'
  | 'admin';

export const TIER_NAMES: readonly TierName[] = [
  'guest',
  'authenticated',
  'purchased_once',
  'purchased_multiple',
  'subscriber',
  'gift_recipient',
  'promo',
  'admin',
] as const;

export interface TierLimit {
  period_hours: number;
  hard_cents: number;
  soft_cents: number;
}

export type TierLimits = Record<TierName, TierLimit>;

export const DEFAULT_TIER_LIMITS: TierLimits = {
  guest:               { period_hours: 24, hard_cents: 999999, soft_cents: 999999 },
  authenticated:       { period_hours: 24, hard_cents: 50,     soft_cents: 40 },
  purchased_once:      { period_hours: 24, hard_cents: 200,    soft_cents: 160 },
  purchased_multiple:  { period_hours: 24, hard_cents: 500,    soft_cents: 400 },
  subscriber:          { period_hours: 24, hard_cents: 1500,   soft_cents: 1200 },
  gift_recipient:      { period_hours: 24, hard_cents: 100,    soft_cents: 80 },
  promo:               { period_hours: 24, hard_cents: 300,    soft_cents: 240 },
  admin:               { period_hours: 24, hard_cents: 999999, soft_cents: 999999 },
};
