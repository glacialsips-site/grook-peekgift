import { describe, expect, it } from 'vitest';
import { DEFAULT_TIER_LIMITS } from '@/lib/usage/tiers';
import { ANON_TURN_CAP } from '@/lib/chat/session';

describe('anon (guest) tier cap — non-blocking until we have data', () => {
  it('guest cost cap is effectively infinite so the turn-count gate is the only block', () => {
    expect(DEFAULT_TIER_LIMITS.guest.hard_cents).toBeGreaterThanOrEqual(10000);
  });

  it('the turn-count gate is the real anon cap', () => {
    expect(ANON_TURN_CAP).toBeGreaterThanOrEqual(5);
  });

  it('guest period is the same 24h window as authenticated', () => {
    expect(DEFAULT_TIER_LIMITS.guest.period_hours).toBe(24);
    expect(DEFAULT_TIER_LIMITS.guest.period_hours).toBe(
      DEFAULT_TIER_LIMITS.authenticated.period_hours,
    );
  });

  it('guest soft_cents <= hard_cents (warn before block, even if neither fires)', () => {
    expect(DEFAULT_TIER_LIMITS.guest.soft_cents).toBeLessThanOrEqual(
      DEFAULT_TIER_LIMITS.guest.hard_cents,
    );
  });
});
