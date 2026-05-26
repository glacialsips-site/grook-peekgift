import 'server-only';
import { createHmac, randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';
import { getSupabaseService } from '@/lib/supabase/service';
import { trackFireAndForget } from '@/lib/analytics/facade';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PickBody = z
  .object({
    peekId: z.string().uuid(),
    cardId: z.string().uuid(),
    recipientSessionId: z.string().min(1).max(200),
    begMessage: z.string().max(2000).optional(),
    recipientNote: z.string().max(2000).optional(),
  })
  .strict();

const DeleteBody = z
  .object({
    peekId: z.string().uuid(),
    cardId: z.string().uuid(),
    recipientSessionId: z.string().min(1).max(200),
  })
  .strict();

function signRecipient(sessionId: string): string {
  const secret = env.GUEST_CLAIM_TOKEN_SECRET;
  if (!secret) {
    return `unsigned:${sessionId}`;
  }
  return createHmac('sha256', secret).update(sessionId).digest('hex');
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  const parsed = PickBody.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse(
      { error: 'invalid_body', issues: parsed.error.flatten().fieldErrors },
      400,
    );
  }
  const { peekId, cardId, recipientSessionId, begMessage, recipientNote } =
    parsed.data;

  const sb = getSupabaseService();
  const signature = signRecipient(recipientSessionId);

  const cardRes = await sb
    .from('cards')
    .select('id, peek_id, variant_group_id, is_taunt')
    .eq('id', cardId)
    .maybeSingle();
  if (cardRes.error) return jsonResponse({ error: cardRes.error.message }, 500);
  if (!cardRes.data) return jsonResponse({ error: 'card_not_found' }, 404);
  const card = cardRes.data;

  if (card.peek_id !== peekId) {
    return jsonResponse({ error: 'card_peek_mismatch' }, 400);
  }
  if (card.is_taunt) {
    return jsonResponse({ error: 'card_is_decorative' }, 400);
  }

  const peekRes = await sb
    .from('peeks')
    .select('id, status')
    .eq('id', peekId)
    .maybeSingle();
  if (peekRes.error) return jsonResponse({ error: peekRes.error.message }, 500);
  if (!peekRes.data) return jsonResponse({ error: 'peek_not_found' }, 404);
  if (peekRes.data.status !== 'published') {
    return jsonResponse({ error: 'peek_not_published' }, 409);
  }

  let groupSelection: 'pick_one' | 'pick_any' | 'pick_all' | null = null;
  let siblingCardIds: string[] = [];
  if (card.variant_group_id) {
    const groupRes = await sb
      .from('variant_groups')
      .select('id, selection')
      .eq('id', card.variant_group_id)
      .maybeSingle();
    if (groupRes.error) return jsonResponse({ error: groupRes.error.message }, 500);
    if (groupRes.data) {
      groupSelection = groupRes.data.selection;
      const siblingsRes = await sb
        .from('cards')
        .select('id')
        .eq('variant_group_id', card.variant_group_id);
      if (siblingsRes.error)
        return jsonResponse({ error: siblingsRes.error.message }, 500);
      siblingCardIds = (siblingsRes.data ?? []).map((r) => r.id);
    }
  }

  if (groupSelection === 'pick_one' && siblingCardIds.length > 0) {
    const delRes = await sb
      .from('picks')
      .delete()
      .eq('peek_id', peekId)
      .eq('recipient_signature', signature)
      .in('card_id', siblingCardIds);
    if (delRes.error) return jsonResponse({ error: delRes.error.message }, 500);
  } else {
    const existingRes = await sb
      .from('picks')
      .select('id')
      .eq('peek_id', peekId)
      .eq('card_id', cardId)
      .eq('recipient_signature', signature)
      .maybeSingle();
    if (existingRes.error)
      return jsonResponse({ error: existingRes.error.message }, 500);
    if (existingRes.data) {
      const pickId = existingRes.data.id;
      const updateRes = await sb
        .from('picks')
        .update({
          beg_message: begMessage ?? null,
          recipient_note: recipientNote ?? null,
        })
        .eq('id', pickId);
      if (updateRes.error)
        return jsonResponse({ error: updateRes.error.message }, 500);
      trackFireAndForget({
        name: 'pick',
        peekId,
        userId: null,
        sessionId: signature,
        payload: {
          card_id: cardId,
          action: 'update',
          pick_id: pickId,
          recipient_signature: signature,
        },
      });
      return jsonResponse({ ok: true, pickId });
    }
  }

  const pickId = randomUUID();
  const insertRes = await sb.from('picks').insert({
    id: pickId,
    peek_id: peekId,
    card_id: cardId,
    recipient_signature: signature,
    beg_message: begMessage ?? null,
    recipient_note: recipientNote ?? null,
  });
  if (insertRes.error) return jsonResponse({ error: insertRes.error.message }, 500);

  trackFireAndForget({
    name: 'pick',
    peekId,
    userId: null,
    sessionId: signature,
    payload: {
      card_id: cardId,
      action: 'insert',
      pick_id: pickId,
      recipient_signature: signature,
    },
  });

  return jsonResponse({ ok: true, pickId });
}

export async function DELETE(req: NextRequest): Promise<Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }
  const parsed = DeleteBody.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse(
      { error: 'invalid_body', issues: parsed.error.flatten().fieldErrors },
      400,
    );
  }
  const { peekId, cardId, recipientSessionId } = parsed.data;
  const sb = getSupabaseService();
  const signature = signRecipient(recipientSessionId);

  const delRes = await sb
    .from('picks')
    .delete()
    .eq('peek_id', peekId)
    .eq('card_id', cardId)
    .eq('recipient_signature', signature)
    .select('id');
  if (delRes.error) return jsonResponse({ error: delRes.error.message }, 500);

  trackFireAndForget({
    name: 'pick',
    peekId,
    userId: null,
    sessionId: signature,
    payload: {
      card_id: cardId,
      action: 'delete',
      recipient_signature: signature,
    },
  });

  return jsonResponse({
    ok: true,
    deleted: (delRes.data ?? []).length,
  });
}
