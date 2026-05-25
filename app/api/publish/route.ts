import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { stripe, STRIPE_PRICE_ID, isMockPay } from '@/lib/stripe';

export const runtime = 'nodejs';

// Either creates a Stripe Checkout Session for $12 (live mode) OR
// publishes the peek immediately for free (mock mode).
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response('unauthorized', { status: 401 });

  const { peek_id } = (await req.json().catch(() => ({}))) as { peek_id?: string };
  if (!peek_id) return Response.json({ ok: false, error: 'missing_peek_id' }, { status: 400 });

  const db = supabaseAdmin();
  const { data: peek, error } = await db
    .from('peeks')
    .select('id, slug, curator_id, status')
    .eq('id', peek_id)
    .eq('curator_id', userId)
    .maybeSingle();
  if (error || !peek) return Response.json({ ok: false, error: 'not_found' }, { status: 404 });

  const base = process.env.APP_URL || 'http://localhost:3000';

  if (isMockPay()) {
    // Dev mode: publish immediately, no charge
    const { data: updated } = await db
      .from('peeks')
      .update({ status: 'published', published_at: new Date().toISOString(), share_url: `${base}/g/${peek.slug}` })
      .eq('id', peek_id)
      .select('slug, share_url')
      .single();
    await db.from('events').insert({ peek_id, kind: 'published_mock', payload: {} });
    return Response.json({ ok: true, mode: 'mock', share_url: updated?.share_url, slug: updated?.slug });
  }

  if (!STRIPE_PRICE_ID) return Response.json({ ok: false, error: 'no_price_id' }, { status: 500 });

  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${base}/build/${peek_id}/done?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/build/${peek_id}?canceled=1`,
    metadata: { peek_id, product: 'peek.gift_vnext' },
    payment_intent_data: { metadata: { peek_id, product: 'peek.gift_vnext' } }
  });

  await db.from('peeks').update({ stripe_checkout_session_id: session.id }).eq('id', peek_id);
  return Response.json({ ok: true, mode: 'live', checkout_url: session.url });
}
