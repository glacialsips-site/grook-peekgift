import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return new Response('missing_sig', { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret);
  } catch (e: any) {
    return new Response('bad_sig: ' + (e?.message || ''), { status: 400 });
  }

  const db = supabaseAdmin();
  const base = process.env.APP_URL || 'http://localhost:3000';

  if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
    const peekId =
      (event.data.object as any)?.metadata?.peek_id ||
      ((event.data.object as Stripe.Checkout.Session)?.metadata?.peek_id);
    if (peekId) {
      const { data: peek } = await db.from('peeks').select('slug').eq('id', peekId).single();
      const slug = peek?.slug;
      const shareUrl = slug ? `${base}/g/${slug}` : null;
      await db
        .from('peeks')
        .update({ status: 'published', published_at: new Date().toISOString(), share_url: shareUrl })
        .eq('id', peekId);
      await db.from('events').insert({ peek_id: peekId, kind: 'published_live', payload: { event_id: event.id } });
    }
  }

  return Response.json({ received: true });
}
