import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/resend';

export const runtime = 'nodejs';

// Recipient picks a card. Public endpoint (no auth) — picks are gated by knowing the slug.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    slug?: string;
    card_id?: string;
    recipient_signature?: string;
    recipient_note?: string;
    beg_message?: string;
  };
  if (!body.slug || !body.card_id) {
    return Response.json({ ok: false, error: 'missing' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: peek, error: pErr } = await db
    .from('peeks')
    .select('id, status, curator_id, recipient_name, occasion')
    .eq('slug', body.slug)
    .maybeSingle();
  if (pErr || !peek) return Response.json({ ok: false, error: 'not_found' }, { status: 404 });
  if (peek.status !== 'published' && peek.status !== 'claimed') {
    return Response.json({ ok: false, error: 'not_published' }, { status: 409 });
  }

  const { data: card } = await db
    .from('cards')
    .select('id, title, is_taunt, is_locked, type, value_cents, source_url')
    .eq('id', body.card_id)
    .eq('peek_id', peek.id)
    .maybeSingle();
  if (!card) return Response.json({ ok: false, error: 'card_not_found' }, { status: 404 });
  if (card.is_taunt) return Response.json({ ok: false, error: 'taunt_card' }, { status: 400 });

  const { data: pick, error: pkErr } = await db
    .from('picks')
    .insert({
      peek_id: peek.id,
      card_id: card.id,
      recipient_signature: body.recipient_signature || null,
      recipient_note: body.recipient_note || null,
      beg_message: body.beg_message || null
    })
    .select('id')
    .single();
  if (pkErr) return Response.json({ ok: false, error: pkErr.message }, { status: 500 });

  await db.from('events').insert({ peek_id: peek.id, kind: 'pick', payload: { card_id: card.id, pick_id: pick.id } });
  await db.from('peeks').update({ status: 'claimed' }).eq('id', peek.id);

  // Look up curator email via Clerk would be ideal, but for now use the curators table mirror.
  const { data: curator } = await db
    .from('curators')
    .select('email, display_name')
    .eq('clerk_user_id', peek.curator_id)
    .maybeSingle();
  if (curator?.email) {
    const html = `
      <h2>${peek.recipient_name || 'Your recipient'} picked!</h2>
      <p>From your peek for <strong>${peek.recipient_name || 'them'}</strong> (${peek.occasion || 'no occasion set'}).</p>
      <p><strong>They picked:</strong> ${escapeHtml(card.title)}</p>
      ${card.source_url ? `<p>Source: <a href="${card.source_url}">${card.source_url}</a></p>` : ''}
      ${body.recipient_signature ? `<p>Signed: ${escapeHtml(body.recipient_signature)}</p>` : ''}
      ${body.recipient_note ? `<p>Their note: <em>${escapeHtml(body.recipient_note)}</em></p>` : ''}
      <hr>
      <p>peek.gift — vNext</p>
    `;
    await sendEmail({
      to: curator.email,
      subject: `${peek.recipient_name || 'Someone'} picked from your peek`,
      html
    }).catch((e) => console.error('notify_failed', e));
  }

  return Response.json({ ok: true });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
