import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { env } from '@/lib/env';
import { parseClickCustomId } from '@/lib/affiliate/wrap';
import { getSupabaseService } from '@/lib/supabase/service';

export const runtime = 'nodejs';

interface SkimlinksEvent {
  transaction_id: string;
  click_id?: string;
  sale_amount: number;
  commission_amount: number;
  currency?: string;
  status?: 'pending' | 'confirmed' | 'reversed';
  merchant_name?: string;
  timestamp?: string;
}

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

export async function POST(req: NextRequest) {
  const secret = env.SKIMLINKS_WEBHOOK_SECRET;
  if (!secret) {
    return new Response('not configured', { status: 500 });
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

  let evt: SkimlinksEvent;
  try {
    evt = JSON.parse(body) as SkimlinksEvent;
  } catch {
    return new Response('invalid json', { status: 400 });
  }
  if (!evt.transaction_id) {
    return new Response('missing transaction_id', { status: 400 });
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
    if (pickRow && typeof pickRow.id === 'string') {
      pickId = pickRow.id;
    }
  }

  const row = {
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
    raw_payload: evt as unknown as Record<string, unknown>,
  };

  const { error } = await sb
    .from('affiliate_revenue')
    .upsert(row, { onConflict: 'external_txn_id' });
  if (error) {
    return new Response(`upsert failed: ${error.message}`, { status: 500 });
  }

  return new Response('ok', { status: 200 });
}
