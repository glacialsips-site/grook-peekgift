import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { getUserId } from '@/lib/auth/server';
import { getUserTier, setUserTier } from '@/lib/usage/tier';
import { TIER_NAMES, type TierName } from '@/lib/usage/tier-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z
  .object({
    clerk_user_id: z.string().min(3),
    tier: z.enum(TIER_NAMES as unknown as [TierName, ...TierName[]]),
  })
  .strict();

export async function POST(req: NextRequest): Promise<Response> {
  const userId = await getUserId();
  const adminTier = await getUserTier(userId);
  if (adminTier !== 'admin') {
    return new Response('forbidden', { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'invalid_input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  try {
    await setUserTier(parsed.data.clerk_user_id, parsed.data.tier);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
  return Response.json({ ok: true });
}
