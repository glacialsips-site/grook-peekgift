import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { getStripe, PAY_MODE } from '@/lib/stripe/client';
import { env } from '@/lib/env';
import { getSupabaseService } from '@/lib/supabase/service';
import { getUserId } from '@/lib/auth/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  peekId: z.string().uuid(),
});

type PeekRow = {
  id: string;
  slug: string;
  curator_id: string | null;
  status: 'draft' | 'published' | 'claimed' | 'archived';
};

export async function POST(req: NextRequest): Promise<Response> {
  const userId = await getUserId();
  if (!userId) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

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
  const { data: peekData, error: peekErr } = await sb
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
  if (!peekData) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }

  const peek = peekData as PeekRow;
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
    await sb.from('events').insert({
      user_id: userId,
      peek_id: peekId,
      kind: 'publish',
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
      mode: 'payment',
      payment_method_types: ['card', 'link'],
      line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${env.APP_URL}/build/${peekId}/publish?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.APP_URL}/build/${peekId}`,
      metadata: { peek_id: peekId, curator_id: userId },
    });
    if (!session.url) {
      return Response.json(
        { error: 'session_url_missing' },
        { status: 500 },
      );
    }
    return Response.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return Response.json(
      { error: 'stripe_failed', message },
      { status: 500 },
    );
  }
}
