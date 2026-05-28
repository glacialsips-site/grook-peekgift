import { NextRequest } from 'next/server';
import { safeAuth as auth } from '@/lib/clerk-safe';
import { q, q1, q1opt } from '@/lib/db';
import { sendEmail } from '@/lib/resend';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response('unauthorized', { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    peek_id?: string;
    email?: string;
    message?: string;
  };
  if (!body.peek_id) return Response.json({ ok: false, error: 'missing_peek_id' }, { status: 400 });

  const peek = await q1opt<{ id: string; recipient_name: string | null; occasion: string | null }>(
    `SELECT id, recipient_name, occasion FROM peeks WHERE id = $1 AND curator_id = $2`,
    [body.peek_id, userId]
  );
  if (!peek) return Response.json({ ok: false, error: 'not_found' }, { status: 404 });

  const invite = await q1<{ token: string }>(
    `INSERT INTO invites (peek_id, email, message, invited_by)
     VALUES ($1,$2,$3,$4) RETURNING token`,
    [peek.id, body.email || null, body.message || null, userId]
  );

  const base = process.env.APP_URL || '';
  const url = `${base}/build/join/${invite.token}`;

  if (body.email) {
    await sendEmail({
      to: body.email,
      subject: `you got invited to co-curate a peek for ${peek.recipient_name || 'someone'}`,
      html: `
        <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:24px;">
          <h2>you're in on a gift.</h2>
          ${body.message ? `<p style="color:#444;">"${escapeHtml(body.message)}"</p>` : ''}
          <p>${peek.recipient_name ? `it's for ${escapeHtml(peek.recipient_name)}` : ''}${peek.occasion ? ` — ${escapeHtml(peek.occasion)}` : ''}.</p>
          <p style="margin:24px 0;">
            <a href="${url}" style="background:#ff5a3c;color:#000;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:500;">
              add to the peek →
            </a>
          </p>
          <p style="color:#aaa;font-size:12px;">peek.gift</p>
        </div>
      `
    }).catch((e) => console.error('invite_email_failed', e));
  }

  await q(`INSERT INTO events (peek_id, kind, payload) VALUES ($1,'invite_sent',$2::jsonb)`, [
    peek.id,
    JSON.stringify({ email: body.email || null })
  ]);

  return Response.json({ ok: true, token: invite.token, invite_url: url });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
