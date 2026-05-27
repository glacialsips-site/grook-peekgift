import 'server-only';
import { env } from '@/lib/env';
import { getSupabaseService } from '@/lib/supabase/service';
import { logger } from '@/lib/logger';
import type { TierName } from './tier-config';
import { TIER_NAMES } from './tier-config';

const log = logger.child({ component: 'usage/tier' });

function parseAdminIds(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  );
}

const ADMIN_IDS = parseAdminIds(env.ADMIN_CLERK_USER_IDS);

export function isAdmin(clerkUserId: string | null | undefined): boolean {
  if (!clerkUserId) return false;
  return ADMIN_IDS.has(clerkUserId);
}

function isTierName(value: unknown): value is TierName {
  return typeof value === 'string' && (TIER_NAMES as readonly string[]).includes(value);
}

export async function getUserTier(
  clerkUserId: string | null | undefined,
): Promise<TierName> {
  if (!clerkUserId) return 'guest';
  if (isAdmin(clerkUserId)) return 'admin';

  const sb = getSupabaseService();

  let storedTier: TierName | null = null;
  try {
    const { data, error } = await sb
      .from('users')
      .select('tier')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle();
    if (error) {
      log.warn('select_user_failed', { err: error.message });
    } else if (data && isTierName(data.tier)) {
      storedTier = data.tier;
    }
  } catch (err) {
    log.warn('select_user_threw', {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  if (
    storedTier === 'subscriber' ||
    storedTier === 'promo' ||
    storedTier === 'gift_recipient'
  ) {
    return storedTier;
  }

  let publishedCount = 0;
  try {
    const { count, error } = await sb
      .from('peeks')
      .select('id', { count: 'exact', head: true })
      .eq('curator_id', clerkUserId)
      .in('status', ['published', 'claimed']);
    if (error) {
      log.warn('count_peeks_failed', { err: error.message });
    } else if (typeof count === 'number') {
      publishedCount = count;
    }
  } catch (err) {
    log.warn('count_peeks_threw', {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  let resolved: TierName;
  if (publishedCount >= 2) resolved = 'purchased_multiple';
  else if (publishedCount >= 1) resolved = 'purchased_once';
  else resolved = storedTier ?? 'authenticated';

  if (storedTier !== resolved) {
    try {
      await sb
        .from('users')
        .update({ tier: resolved, updated_at: new Date().toISOString() })
        .eq('clerk_user_id', clerkUserId);
    } catch (err) {
      log.warn('update_tier_failed', {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return resolved;
}

export async function setUserTier(
  clerkUserId: string,
  tier: TierName,
): Promise<void> {
  const sb = getSupabaseService();
  const { error } = await sb
    .from('users')
    .update({ tier, updated_at: new Date().toISOString() })
    .eq('clerk_user_id', clerkUserId);
  if (error) {
    throw new Error(`update_user_tier_failed: ${error.message}`);
  }
}
