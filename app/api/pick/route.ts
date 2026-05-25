import { NextRequest } from 'next/server';
import { q, q1, q1opt } from '@/lib/db';
import { sendEmail } from '@/lib/resend';
import { track } from '@/lib/posthog';

export const runtime = 'nodejs';

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

  const peek = await q1opt<{
    id: string;
    status: string;
    curator_id: string;
    recipient_name: string | null;
    occasion: string | null;
  }>(
    `SELECT id, status, curator_id, recipient_name, occasion FROM peeks WHERE slug = $1`,
    [body.slug]
  );
  if (!peek) return Response.json({ ok: false, error: 'not_found' }, { status: 404 });
  if (peek.status !== 'published' && peek.status !== 'claimed') {
    return Response.json({ ok: false, error: 'not_published' }, { status: 409 });
  }

  const card = await q1opt<{
    id: string;
    title: string;
    is_taunt: boolean;
    is_locked: boolean;
    type: string;
    value_cents: number | null;
    source_url: string | null;
  }>(
    `SELECT id, title, is_taunt, is_locked, type, value_cents, source_url
     FROM cards WHERE id = $1 AND peek_id = $2`,
    [body.card_id, peek.id]
  );
  if (!card) return Response.json({ ok: false, error: 'card_not_found' }, { status: 404 });
  if (card.is_taunt) return Response.json({ ok: false, error: 'taunt_card' }, { status: 400 });

  const pick = await q1<{ id: string }>(
    `INSERT INTO picks (peek_id, card_id, recipient_signature, recipient_note, beg_message)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [
      peek.id, card.id,
      body.recipient_signature || null,
      body.recipient_note || null,
      body.beg_message || null
    ]
  );

  await q(`INSERT INTO events (peek_id, kind, payload) VALUES ($1,'pick',$2::jsonb)`, [
    peek.id,
    JSON.stringify({ card_id: card.id, pick_id: pick.id })
  ]);
  await q(`UPDATE peeks SET status = 'claimed' WHERE id = $1`, [peek.id]);
  track('peek_pick', peek.curator_id, { peek_id: peek.id, card_id: card.id, card_type: card.type });

  const curator = await q1opt<{ email: string | null; display_name: string | null }>(
    `SELECT email, display_name FROM curators WHERE clerk_user_id = $1`,
    [peek.curator_id]
  );
  if (curator?.email) {
    const html = `
      <div style="font-family: Georgia, serif; max-width: 540px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 12px;">${escapeHtml(peek.recipient_name || 'Your recipient')} picked.</h2>
        <p style="color:#555;">From your peek for ${escapeHtml(peek.recipient_name || 'them')} (${escapeHtml(peek.occasion || 'no occasion set')}).</p>
        <div style="background:#f7f6f3;border-radius:14px;padding:18px;margin:18px 0;">
          <div style="text-transform:uppercase;font-size:11px;letter-spacing:2px;color:#888;">they picked</div>
          <div style="font-size:22px;margin-top:6px;">${escapeHtml(card.title)}</div>
          ${card.source_url ? `<div style="margin-top:10px;"><a href="${escapeHtml(card.source_url)}" style="color:#ff5a3c;">${escapeHtml(card.source_url)}</a></div>` : ''}
        </div>
        ${body.recipient_signature ? `<p>Signed: <strong>${escapeHtml(body.recipient_signature)}</strong></p>` : ''}
        ${body.recipient_note ? `<p>Their note: <em>"${escapeHtml(body.recipient_note)}"</em></p>` : ''}
        ${body.beg_message ? `<p>They begged: <em>"${escapeHtml(body.beg_message)}"</em></p>` : ''}
        <p style="color:#aaa;margin-top:32px;font-size:12px;">peek.gift</p>
      </div>
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
