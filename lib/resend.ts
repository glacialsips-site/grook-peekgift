// Tiny Resend wrapper. Uses raw fetch so we don't need their SDK.
const RESEND_API = 'https://api.resend.com/emails';

interface SendOpts {
  to: string;
  subject: string;
  html: string;
  from?: string;
  reply_to?: string;
}

export async function sendEmail(opts: SendOpts): Promise<{ id: string } | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[resend] RESEND_API_KEY missing — skipping send', opts.to);
    return null;
  }
  const from = opts.from || process.env.NOTIFICATIONS_FROM || 'peek.gift <info@peek.gift>';
  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html, reply_to: opts.reply_to })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('[resend] send failed', res.status, body);
    return null;
  }
  const data = await res.json();
  return { id: data.id };
}
