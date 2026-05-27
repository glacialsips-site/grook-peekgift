import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { getStripe, PAY_MODE } from '@/lib/stripe/client';
import { env } from '@/lib/env';
import { getSupabaseService } from '@/lib/supabase/service';
import { getUserId } from '@/lib/auth/server';
import { track } from '@/lib/analytics/facade';
import {
  enforceRateLimit,
  limiters,
  rateLimitResponse,
} from '@/lib/rate-limit/redis';
import { isOriginAllowed, originRejectionResponse } from '@/lib/security/origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RequestSchema = z
  .object({
    peekId: z.string().uuid(),
  })
  .strict();

export async function POST(req: NextRequest): Promise<Response> {
  if (!isOriginAllowed(req)) {
    return originRejectionResponse();
  }

  const userId = await getUserId();
  if (!userId) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const verdict = await enforceRateLimit(limiters.checkoutPerUser(), userId);
  if (!verdict.ok) return rateLimitResponse(verdict);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: 'bad_request', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { peekId } = parsed.data;

  const sb = getSupabaseService();
  const { data: peek, error: peekErr } = await sb
    .from('peeks')
    .select('id, slug, curator_id, status')
    .eq('id', peekId)
    .maybeSingle();

  if (peekErr) {
    return Response.json(
      { error: 'lookup_failed', message: peekErr.message },
      { status: 500 },
    );
  }
  if (!peek) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }

  if (peek.curator_id !== userId) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }
  if (peek.status === 'published' || peek.status === 'claimed') {
    return Response.json({ error: 'already_published' }, { status: 409 });
  }

  if (PAY_MODE === 'mock') {
    const nowIso = new Date().toISOString();
    const shareUrl = `${env.APP_URL}/g/${peek.slug}`;
    const { error: updErr } = await sb
      .from('peeks')
      .update({
        status: 'published',
        published_at: nowIso,
        share_url: shareUrl,
        updated_at: nowIso,
      })
      .eq('id', peekId);
    if (updErr) {
      return Response.json(
        { error: 'update_failed', message: updErr.message },
        { status: 500 },
      );
    }
    await track({
      name: 'publish',
      peekId,
      userId,
      payload: { mock: true },
    });
    return Response.json({
      mock: true,
      redirect_url: `/build/${peekId}/publish?mock=1`,
    });
  }

  if (!env.STRIPE_PRICE_ID) {
    return Response.json(
      { error: 'stripe_not_configured', message: 'STRIPE_PRICE_ID missing' },
      { status: 500 },
    );
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded_page',
      mode: 'payment',
      line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
      return_url: `${env.APP_URL}/build/${peekId}/publish?session_id={CHECKOUT_SESSION_ID}`,
      metadata: { peek_id: peekId, curator_id: userId },
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'auto',
      customer_creation: 'always',
      adaptive_pricing: { enabled: true },
      allow_promotion_codes: true,
    });
    if (!session.client_secret) {
      return Response.json(
        { error: 'session_client_secret_missing' },
        { status: 500 },
      );
    }
    return Response.json({
      client_secret: session.client_secret,
      session_id: session.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return Response.json(
      { error: 'stripe_failed', message },
      { status: 500 },
    );
  }
}
