import type { NextRequest } from 'next/server';
import { z } from 'zod';
import twilio from 'twilio';
import { env } from '@/lib/env';
import { requireUserId } from '@/lib/auth/server';
import { getSupabaseService } from '@/lib/supabase/service';
import { sendEmail } from '@/lib/email/send';
import { PeekShareMessageEmail } from '@/lib/email/templates/peek-share-message';
import { trackFireAndForget } from '@/lib/analytics/facade';
import {
  enforceRateLimit,
  limiters,
  rateLimitResponse,
} from '@/lib/rate-limit/redis';
import { isOriginAllowed, originRejectionResponse } from '@/lib/security/origin';
import { logger } from '@/lib/logger';
import { withRetry } from '@/lib/retry';

const log = logger.child({ component: 'api/share/send' });

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z
  .object({
    peekId: z.string().uuid(),
    channel: z.enum(['sms', 'email']),
    destination: z.string().min(3).max(320),
    message: z.string().max(2000).default(''),
    senderName: z.string().max(120).optional(),
  })
  .strict();

function buildShareUrl(slug: string): string {
  const base = env.APP_URL.replace(/\/+$/, '');
  return `${base}/g/${slug}`;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function recordShareSend(args: {
  peekId: string;
  userId: string;
  channel: 'sms' | 'email';
  destination: string;
  outcome: 'sent' | 'failed' | 'not_configured';
  error?: string;
}): void {
  trackFireAndForget({
    name: 'share_send',
    peekId: args.peekId,
    userId: args.userId,
    payload: {
      channel: args.channel,
      destination: args.destination,
      outcome: args.outcome,
      error: args.error ?? null,
    },
  });
  trackFireAndForget({
    name: 'share_initiated',
    peekId: args.peekId,
    userId: args.userId,
    payload: { channel: args.channel },
  });
}

async function sendSms(args: {
  to: string;
  body: string;
}): Promise<{ ok: true; sid: string } | { ok: false; error: string }> {
  if (
    !env.TWILIO_ACCOUNT_SID ||
    !env.TWILIO_AUTH_TOKEN ||
    !env.TWILIO_FROM_NUMBER
  ) {
    return { ok: false, error: 'sms_not_configured' };
  }
  try {
    const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    const msg = await withRetry(
      () =>
        client.messages.create({
          from: env.TWILIO_FROM_NUMBER,
          to: args.to,
          body: args.body,
        }),
      {
        label: 'twilio.send',
        attempts: 3,
        retryOn: (err) => {
          const status = (err as { status?: number; code?: number }).status;
          if (status && status >= 400 && status < 500) return false;
          return true;
        },
      },
    );
    return { ok: true, sid: msg.sid };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn('twilio_send_failed', { to: args.to, err: message });
    return { ok: false, error: message };
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!isOriginAllowed(req)) {
    return originRejectionResponse();
  }

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const verdict = await enforceRateLimit(limiters.shareSendPerUser(), userId);
  if (!verdict.ok) return rateLimitResponse(verdict);

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  const parsed = BodySchema.safeParse(payload);
  if (!parsed.success) {
    return jsonResponse(
      { error: 'invalid_input', issues: parsed.error.flatten().fieldErrors },
      400,
    );
  }
  const input = parsed.data;

  const db = getSupabaseService();
  const { data: peek, error: peekErr } = await db
    .from('peeks')
    .select('id, slug, curator_id, recipient_name, status')
    .eq('id', input.peekId)
    .maybeSingle();
  if (peekErr) {
    return jsonResponse({ error: 'lookup_failed' }, 500);
  }
  if (!peek) {
    return jsonResponse({ error: 'peek_not_found' }, 404);
  }
  if (peek.curator_id !== userId) {
    return jsonResponse({ error: 'forbidden' }, 403);
  }

  const shareUrl = buildShareUrl(peek.slug);
  const trimmedMessage = input.message.trim();

  if (input.channel === 'sms') {
    const lines = [
      trimmedMessage,
      trimmedMessage ? '' : null,
      `A Peek for you: ${shareUrl}`,
    ].filter((line): line is string => line !== null);
    const body = lines.join('\n').trim();
    const result = await sendSms({ to: input.destination, body });
    if (!result.ok) {
      recordShareSend({
        peekId: peek.id,
        userId,
        channel: 'sms',
        destination: input.destination,
        outcome: result.error === 'sms_not_configured' ? 'not_configured' : 'failed',
        error: result.error,
      });
      return jsonResponse(
        { error: result.error },
        result.error === 'sms_not_configured' ? 503 : 502,
      );
    }
    recordShareSend({
      peekId: peek.id,
      userId,
      channel: 'sms',
      destination: input.destination,
      outcome: 'sent',
    });
    return jsonResponse({ ok: true, sid: result.sid }, 200);
  }

  const subject = peek.recipient_name
    ? `${input.senderName ?? 'A friend'} sent you a Peek`
    : 'A Peek for you';
  const result = await sendEmail({
    to: input.destination,
    subject,
    react: (
      <PeekShareMessageEmail
        fromName={input.senderName ?? null}
        message={trimmedMessage}
        shareUrl={shareUrl}
        recipientName={peek.recipient_name}
      />
    ),
  });
  if (!result.ok) {
    recordShareSend({
      peekId: peek.id,
      userId,
      channel: 'email',
      destination: input.destination,
      outcome: result.error === 'email_not_configured' ? 'not_configured' : 'failed',
      error: result.error,
    });
    return jsonResponse(
      { error: result.error },
      result.error === 'email_not_configured' ? 503 : 502,
    );
  }
  recordShareSend({
    peekId: peek.id,
    userId,
    channel: 'email',
    destination: input.destination,
    outcome: 'sent',
  });
  return jsonResponse({ ok: true, id: result.id }, 200);
}
