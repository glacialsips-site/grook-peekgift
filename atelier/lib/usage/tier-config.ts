import 'server-only';
import { getSupabaseService } from '@/lib/supabase/service';
import { logger } from '@/lib/logger';
import {
  DEFAULT_TIER_LIMITS,
  TIER_NAMES,
  type TierLimit,
  type TierLimits,
  type TierName,
} from './tiers';

const log = logger.child({ component: 'usage/tier-config' });

export {
  DEFAULT_TIER_LIMITS,
  TIER_NAMES,
  type TierLimit,
  type TierLimits,
  type TierName,
};

function isTierLimit(value: unknown): value is TierLimit {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['period_hours'] === 'number' &&
    typeof v['hard_cents'] === 'number' &&
    typeof v['soft_cents'] === 'number'
  );
}

function mergeWithDefaults(raw: unknown): TierLimits {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_TIER_LIMITS };
  const r = raw as Record<string, unknown>;
  const out: TierLimits = { ...DEFAULT_TIER_LIMITS };
  for (const tier of TIER_NAMES) {
    const candidate = r[tier];
    if (isTierLimit(candidate)) {
      out[tier] = candidate;
    }
  }
  return out;
}

export async function getTierConfig(): Promise<TierLimits> {
  try {
    const sb = getSupabaseService();
    const { data, error } = await sb
      .from('tier_config')
      .select('config')
      .eq('id', 1)
      .maybeSingle();
    if (error) {
      log.warn('select_failed', { err: error.message });
      return { ...DEFAULT_TIER_LIMITS };
    }
    if (!data) return { ...DEFAULT_TIER_LIMITS };
    return mergeWithDefaults(data.config);
  } catch (err) {
    log.warn('select_threw', {
      err: err instanceof Error ? err.message : String(err),
    });
    return { ...DEFAULT_TIER_LIMITS };
  }
}

export async function setTierConfig(partial: Partial<TierLimits>): Promise<TierLimits> {
  const current = await getTierConfig();
  const next: TierLimits = { ...current };
  for (const tier of TIER_NAMES) {
    const incoming = partial[tier];
    if (isTierLimit(incoming)) {
      next[tier] = incoming;
    }
  }
  try {
    const sb = getSupabaseService();
    const { error } = await sb.from('tier_config').upsert(
      {
        id: 1,
        config: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
    if (error) {
      log.warn('upsert_failed', { err: error.message });
    }
  } catch (err) {
    log.warn('upsert_threw', {
      err: err instanceof Error ? err.message : String(err),
    });
  }
  return next;
}
