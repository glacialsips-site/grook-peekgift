import type { NextRequest } from 'next/server';
import { getUserId } from '@/lib/auth/server';
import { getUserTier } from '@/lib/usage/tier';
import {
  getTierConfig,
  setTierConfig,
  TIER_NAMES,
  type TierLimits,
  type TierName,
} from '@/lib/usage/tier-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin(): Promise<{ ok: true } | { ok: false; res: Response }> {
  const userId = await getUserId();
  const tier = await getUserTier(userId);
  if (tier !== 'admin') {
    return {
      ok: false,
      res: new Response('forbidden', { status: 403 }),
    };
  }
  return { ok: true };
}

function isTierLimit(value: unknown): value is { period_hours: number; hard_cents: number; soft_cents: number } {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['period_hours'] === 'number' &&
    typeof v['hard_cents'] === 'number' &&
    typeof v['soft_cents'] === 'number'
  );
}

export async function GET(): Promise<Response> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.res;
  const config = await getTierConfig();
  return Response.json(config);
}

export async function POST(req: NextRequest): Promise<Response> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  const partial: Partial<TierLimits> = {};
  for (const tier of TIER_NAMES) {
    const candidate = (body as Record<string, unknown>)[tier];
    if (isTierLimit(candidate)) {
      partial[tier as TierName] = candidate;
    }
  }
  const next = await setTierConfig(partial);
  return Response.json(next);
}
