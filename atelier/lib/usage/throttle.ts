import 'server-only';
import { getSupabaseService } from '@/lib/supabase/service';
import { logger } from '@/lib/logger';
import { getTierConfig, type TierLimit, type TierName } from './tier-config';
import { getUserTier } from './tier';
import type { Vendor } from './cost';

const log = logger.child({ component: 'usage/throttle' });

export interface ThrottleInput {
  userId?: string | null;
  sessionId?: string | null;
  vendor: Vendor;
  kind: string;
}

export interface ThrottleVerdict {
  allow: boolean;
  warn: boolean;
  reason?: string;
  tier: TierName;
  used_cents: number;
  limit_cents: number;
  soft_cents: number;
}

async function sumUsageCents(args: {
  userId?: string | null;
  sessionId?: string | null;
  sinceIso: string;
}): Promise<number> {
  const sb = getSupabaseService();
  let query = sb.from('usage_ledger').select('cost_cents').gte('ts', args.sinceIso);
  if (args.userId) {
    query = query.eq('user_id', args.userId);
  } else if (args.sessionId) {
    query = query.is('user_id', null).eq('session_id', args.sessionId);
  } else {
    return 0;
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  if (!data) return 0;
  let total = 0;
  for (const row of data) {
    const cost = (row as { cost_cents?: unknown }).cost_cents;
    if (typeof cost === 'number' && Number.isFinite(cost)) total += cost;
  }
  return total;
}

const FAIL_OPEN: Omit<ThrottleVerdict, 'tier'> = {
  allow: true,
  warn: false,
  used_cents: 0,
  limit_cents: 0,
  soft_cents: 0,
};

export async function checkAllowed(input: ThrottleInput): Promise<ThrottleVerdict> {
  const tier = await getUserTier(input.userId);
  if (tier === 'admin') {
    return {
      allow: true,
      warn: false,
      tier,
      used_cents: 0,
      limit_cents: Number.MAX_SAFE_INTEGER,
      soft_cents: Number.MAX_SAFE_INTEGER,
    };
  }

  let limit: TierLimit;
  try {
    const config = await getTierConfig();
    limit = config[tier];
  } catch (err) {
    log.warn('config_failed_fail_open', {
      err: err instanceof Error ? err.message : String(err),
    });
    return { ...FAIL_OPEN, tier };
  }

  const since = new Date(Date.now() - limit.period_hours * 60 * 60 * 1000);

  let used: number;
  try {
    used = await sumUsageCents({
      userId: input.userId ?? null,
      sessionId: input.sessionId ?? null,
      sinceIso: since.toISOString(),
    });
  } catch (err) {
    log.warn('ledger_query_failed_fail_open', {
      tier,
      vendor: input.vendor,
      err: err instanceof Error ? err.message : String(err),
    });
    return {
      allow: true,
      warn: false,
      tier,
      used_cents: 0,
      limit_cents: limit.hard_cents,
      soft_cents: limit.soft_cents,
    };
  }

  if (used >= limit.hard_cents) {
    return {
      allow: false,
      warn: false,
      reason: friendlyReason(tier, used, limit.hard_cents),
      tier,
      used_cents: used,
      limit_cents: limit.hard_cents,
      soft_cents: limit.soft_cents,
    };
  }

  return {
    allow: true,
    warn: used >= limit.soft_cents,
    tier,
    used_cents: used,
    limit_cents: limit.hard_cents,
    soft_cents: limit.soft_cents,
  };
}

function friendlyReason(tier: TierName, used: number, hard: number): string {
  const usedDollars = (used / 100).toFixed(2);
  const hardDollars = (hard / 100).toFixed(2);
  if (tier === 'guest' || tier === 'authenticated') {
    return `You've used $${usedDollars} of compute in the last 24h (limit $${hardDollars}). Publish a peek to unlock more, or come back tomorrow.`;
  }
  return `Daily compute limit reached ($${usedDollars}/$${hardDollars}). Resets in 24h.`;
}
