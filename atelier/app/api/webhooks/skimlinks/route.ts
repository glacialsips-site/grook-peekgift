import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { env } from '@/lib/env';
import { parseClickCustomId } from '@/lib/affiliate/wrap';
import { getSupabaseService } from '@/lib/supabase/service';
import { checkIdempotency } from '@/lib/security/idempotency';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'api/webhooks/skimlinks' });

export const runtime = 'nodejs';

const SkimlinksEventSchema = z
  .object({
    transaction_id: z.string().min(1),
    click_id: z.string().optional(),
    sale_amount: z.number(),
    commission_amount: z.number(),
    currency: z.string().optional(),
    status: z.enum(['pending', 'confirmed', 'reversed']).optional(),
    merchant_name: z.string().optional(),
    timestamp: z.string().optional(),
  })
  .passthrough();

type SkimlinksEvent = z.infer<typeof SkimlinksEventSchema>;

function toCents(amount: unknown): number | null {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function toRawPayload(evt: SkimlinksEvent): Record<string, unknown> {
  return { ...evt };
}

export async function POST(req: NextRequest) {
  const secret = env.SKIMLINKS_WEBHOOK_SECRET;
  if (!secret) {
    // No secret configured: gracefully no-op so unkeyed deliveries don't pile
    // up as failed retries on Skimlinks' side. Log so we know if events arrive
    // before the integration is provisioned.
    log.warn('webhook_unconfigured', {
      reason: 'SKIMLINKS_WEBHOOK_SECRET unset',
    });
    return Response.json(
      { received: true, skipped: 'service_not_configured' },
      { status: 200 },
    );
  }
  const sig = req.headers.get('x-skimlinks-signature');
  if (!sig) {
    return new Response('missing signature', { status: 400 });
  }
  const body = await req.text();
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  if (!safeEqual(sig, expected)) {
    return new Response('invalid signature', { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return new Response('invalid json', { status: 400 });
  }
  const evtResult = SkimlinksEventSchema.safeParse(parsed);
  if (!evtResult.success) {
    return new Response('invalid_payload', { status: 400 });
  }
  const evt = evtResult.data;

  const idemp = await checkIdempotency({
    source: 'skimlinks',
    eventId: evt.transaction_id,
  });
  if (!idemp.firstSeen) {
    return new Response('ok', { status: 200 });
  }

  const sb = getSupabaseService();
  const parsedClick = parseClickCustomId(evt.click_id);

  let pickId: string | null = null;
  if (parsedClick?.cardId) {
    const { data: pickRow } = await sb
      .from('picks')
      .select('id')
      .eq('card_id', parsedClick.cardId)
      .order('picked_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pickRow) {
      pickId = pickRow.id;
    }
  }

  const { error } = await sb
    .from('affiliate_revenue')
    .upsert(
      {
        network: 'skimlinks',
        external_txn_id: evt.transaction_id,
        card_id: parsedClick?.cardId ?? null,
        pick_id: pickId,
        peek_id: parsedClick?.peekId ?? null,
        reported_at: evt.timestamp ?? new Date().toISOString(),
        amount_cents: toCents(evt.sale_amount),
        commission_cents: toCents(evt.commission_amount),
        currency: evt.currency ?? 'USD',
        status: evt.status ?? 'pending',
        raw_payload: toRawPayload(evt),
      },
      { onConflict: 'external_txn_id' },
    );
  if (error) {
    return new Response(`upsert failed: ${error.message}`, { status: 500 });
  }

  return new Response('ok', { status: 200 });
}
