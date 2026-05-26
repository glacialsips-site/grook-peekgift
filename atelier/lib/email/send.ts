import 'server-only';
import type { ReactElement } from 'react';
import { Resend } from 'resend';
import { env } from '@/lib/env';
import { withRetry } from '@/lib/retry';

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  react: ReactElement;
  from?: string;
  replyTo?: string;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

let _client: Resend | null = null;

function getClient(): Resend | null {
  if (_client) return _client;
  if (!env.RESEND_API_KEY) return null;
  _client = new Resend(env.RESEND_API_KEY);
  return _client;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const client = getClient();
  if (!client) {
    return { ok: false, error: 'email_not_configured' };
  }
  const from = input.from ?? env.NOTIFICATIONS_FROM;
  if (!from) {
    return { ok: false, error: 'email_from_not_configured' };
  }
  try {
    const id = await withRetry(
      async () => {
        const { data, error } = await client.emails.send({
          from,
          to: input.to,
          subject: input.subject,
          react: input.react,
          replyTo: input.replyTo,
        });
        if (error) {
          const wrapped = new Error(error.message);
          (wrapped as { status?: number }).status =
            (error as { statusCode?: number }).statusCode ?? 500;
          throw wrapped;
        }
        if (!data?.id) {
          throw new Error('no_id_returned');
        }
        return data.id;
      },
      { label: 'resend.send', attempts: 5 },
    );
    return { ok: true, id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
