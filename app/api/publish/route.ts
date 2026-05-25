import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { q, q1opt } from '@/lib/db';
import { stripe, STRIPE_PRICE_ID, isMockPay } from '@/lib/stripe';
import { track } from '@/lib/posthog';
import { generateOgImage } from '@/lib/imagegen';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response('unauthorized', { status: 401 });

  const { peek_id } = (await req.json().catch(() => ({}))) as { peek_id?: string };
  if (!peek_id) return Response.json({ ok: false, error: 'missing_peek_id' }, { status: 400 });

  const peek = await q1opt<{ id: string; slug: string; curator_id: string; status: string }>(
    `SELECT id, slug, curator_id, status FROM peeks WHERE id = $1 AND curator_id = $2`,
    [peek_id, userId]
  );
  if (!peek) return Response.json({ ok: false, error: 'not_found' }, { status: 404 });

  const base = process.env.APP_URL || 'http://localhost:3000';

  // Pre-warm OG image so first share-preview lookup is cheap
  generateOgImage(peek_id).catch(() => {});

  if (isMockPay()) {
    const shareUrl = `${base}/g/${peek.slug}`;
    await q(
      `UPDATE peeks SET status = 'published', published_at = now(), share_url = $1 WHERE id = $2`,
      [shareUrl, peek_id]
    );
    await q(`INSERT INTO events (peek_id, kind, payload) VALUES ($1,'published_mock','{}'::jsonb)`, [peek_id]);
    track('peek_published', userId, { peek_id, slug: peek.slug, mode: 'mock' });
    return Response.json({ ok: true, mode: 'mock', share_url: shareUrl, slug: peek.slug });
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

  await q(`UPDATE peeks SET stripe_checkout_session_id = $1 WHERE id = $2`, [session.id, peek_id]);
  track('peek_checkout_started', userId, { peek_id, slug: peek.slug });
  return Response.json({ ok: true, mode: 'live', checkout_url: session.url });
}
