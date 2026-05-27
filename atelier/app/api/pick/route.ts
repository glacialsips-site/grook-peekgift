import 'server-only';
import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSupabaseService } from '@/lib/supabase/service';
import { trackFireAndForget } from '@/lib/analytics/facade';
import { readRecipientSessionFromCookies } from '@/lib/security/recipient';
import {
  enforceRateLimit,
  limiters,
  rateLimitResponse,
} from '@/lib/rate-limit/redis';
import { isOriginAllowed, originRejectionResponse } from '@/lib/security/origin';
import { notifyCuratorOfPicksFireAndForget } from '@/lib/email/notify-curator-picks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PickBody = z
  .object({
    peekId: z.string().uuid(),
    cardId: z.string().uuid(),
    begMessage: z.string().max(2000).optional(),
    recipientNote: z.string().max(2000).optional(),
  })
  .strict();

const DeleteBody = z
  .object({
    peekId: z.string().uuid(),
    cardId: z.string().uuid(),
  })
  .strict();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

type CardRow = {
  id: string;
  peek_id: string;
  variant_group_id: string | null;
  is_taunt: boolean;
  is_locked: boolean;
  unlock_rule: unknown;
};

type UnlockRule =
  | { kind: 'beg'; beg_prompt?: string }
  | { kind: 'date_after'; unlock_after: string }
  | { kind: 'event'; unlock_after?: string }
  | { kind: 'requires_picks'; card_ids: string[] }
  | Record<string, never>;

function asUnlockRule(value: unknown): UnlockRule {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const obj = value as Record<string, unknown>;
  const kind = obj['kind'];
  if (kind === 'beg') {
    const prompt = typeof obj['beg_prompt'] === 'string' ? obj['beg_prompt'] : undefined;
    return prompt ? { kind: 'beg', beg_prompt: prompt } : { kind: 'beg' };
  }
  if (kind === 'date_after') {
    const after = typeof obj['unlock_after'] === 'string' ? obj['unlock_after'] : '';
    return { kind: 'date_after', unlock_after: after };
  }
  if (kind === 'event') {
    const after = typeof obj['unlock_after'] === 'string' ? obj['unlock_after'] : undefined;
    return after ? { kind: 'event', unlock_after: after } : { kind: 'event' };
  }
  if (kind === 'requires_picks') {
    const raw = obj['card_ids'];
    const ids = Array.isArray(raw)
      ? raw.filter((v): v is string => typeof v === 'string')
      : [];
    return { kind: 'requires_picks', card_ids: ids };
  }
  return {};
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!isOriginAllowed(req)) {
    return originRejectionResponse();
  }

  const session = await readRecipientSessionFromCookies();
  if (!session) {
    return jsonResponse({ error: 'recipient_session_missing' }, 401);
  }
  const signature = session.signature;

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
  const { peekId, cardId, begMessage, recipientNote } = parsed.data;

  const verdict = await enforceRateLimit(limiters.picksPerSession(), signature);
  if (!verdict.ok) return rateLimitResponse(verdict);

  const sb = getSupabaseService();

  const cardRes = await sb
    .from('cards')
    .select('id, peek_id, variant_group_id, is_taunt, is_locked, unlock_rule')
    .eq('id', cardId)
    .maybeSingle();
  if (cardRes.error) return jsonResponse({ error: cardRes.error.message }, 500);
  if (!cardRes.data) return jsonResponse({ error: 'card_not_found' }, 404);
  const card = cardRes.data as CardRow;

  if (card.peek_id !== peekId) {
    return jsonResponse({ error: 'card_peek_mismatch' }, 400);
  }
  if (card.is_taunt) {
    return jsonResponse({ error: 'card_is_decorative' }, 400);
  }

  const unlockRule = asUnlockRule(card.unlock_rule);
  if (card.is_locked) {
    if (unlockRule.kind === 'beg') {
      const msg = (begMessage ?? '').trim();
      if (msg.length === 0) {
        return jsonResponse({ error: 'beg_message_required' }, 400);
      }
    } else if (unlockRule.kind === 'requires_picks') {
      const required = unlockRule.card_ids ?? [];
      if (required.length === 0) {
        return jsonResponse({ error: 'unlock_rule_invalid' }, 500);
      }
      const reqRes = await sb
        .from('picks')
        .select('card_id')
        .eq('peek_id', peekId)
        .eq('recipient_signature', signature)
        .in('card_id', required);
      if (reqRes.error) return jsonResponse({ error: reqRes.error.message }, 500);
      const have = new Set((reqRes.data ?? []).map((r) => r.card_id));
      const missing = required.filter((id) => !have.has(id));
      if (missing.length > 0) {
        return jsonResponse(
          { error: 'unlock_requires_picks', missing },
          409,
        );
      }
    } else if (unlockRule.kind === 'date_after') {
      const after = Date.parse(unlockRule.unlock_after);
      if (Number.isFinite(after) && Date.now() < after) {
        return jsonResponse({ error: 'unlock_too_early' }, 409);
      }
    } else if (unlockRule.kind === 'event') {
      return jsonResponse({ error: 'unlock_event_pending' }, 409);
    } else {
      return jsonResponse({ error: 'card_locked' }, 409);
    }
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
    const otherSiblings = siblingCardIds.filter((id) => id !== cardId);
    if (otherSiblings.length > 0) {
      const delRes = await sb
        .from('picks')
        .delete()
        .eq('peek_id', peekId)
        .eq('recipient_signature', signature)
        .in('card_id', otherSiblings);
      if (delRes.error) return jsonResponse({ error: delRes.error.message }, 500);
    }
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
      notifyCuratorOfPicksFireAndForget({
        peekId,
        recipientSignature: signature,
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

  if (groupSelection === 'pick_all' && siblingCardIds.length > 0) {
    const otherSiblings = siblingCardIds.filter((id) => id !== cardId);
    if (otherSiblings.length > 0) {
      const existingSiblingPicks = await sb
        .from('picks')
        .select('card_id')
        .eq('peek_id', peekId)
        .eq('recipient_signature', signature)
        .in('card_id', otherSiblings);
      if (existingSiblingPicks.error)
        return jsonResponse({ error: existingSiblingPicks.error.message }, 500);
      const alreadyPicked = new Set(
        (existingSiblingPicks.data ?? []).map((r) => r.card_id),
      );
      const toInsert = otherSiblings
        .filter((id) => !alreadyPicked.has(id))
        .map((id) => ({
          id: randomUUID(),
          peek_id: peekId,
          card_id: id,
          recipient_signature: signature,
        }));
      if (toInsert.length > 0) {
        const siblingInsertRes = await sb.from('picks').insert(toInsert);
        if (siblingInsertRes.error)
          return jsonResponse({ error: siblingInsertRes.error.message }, 500);
      }
    }
  }

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

  notifyCuratorOfPicksFireAndForget({
    peekId,
    recipientSignature: signature,
  });

  return jsonResponse({ ok: true, pickId });
}

export async function DELETE(req: NextRequest): Promise<Response> {
  if (!isOriginAllowed(req)) {
    return originRejectionResponse();
  }

  const session = await readRecipientSessionFromCookies();
  if (!session) {
    return jsonResponse({ error: 'recipient_session_missing' }, 401);
  }
  const signature = session.signature;

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
  const { peekId, cardId } = parsed.data;

  const verdict = await enforceRateLimit(limiters.picksPerSession(), signature);
  if (!verdict.ok) return rateLimitResponse(verdict);

  const sb = getSupabaseService();

  const cardRes = await sb
    .from('cards')
    .select('id, variant_group_id')
    .eq('id', cardId)
    .eq('peek_id', peekId)
    .maybeSingle();
  if (cardRes.error) return jsonResponse({ error: cardRes.error.message }, 500);

  let groupSelection: 'pick_one' | 'pick_any' | 'pick_all' | null = null;
  let siblingCardIds: string[] = [];
  if (cardRes.data?.variant_group_id) {
    const groupRes = await sb
      .from('variant_groups')
      .select('selection')
      .eq('id', cardRes.data.variant_group_id)
      .maybeSingle();
    if (!groupRes.error && groupRes.data) {
      groupSelection = groupRes.data.selection;
      const siblings = await sb
        .from('cards')
        .select('id')
        .eq('variant_group_id', cardRes.data.variant_group_id);
      if (!siblings.error) {
        siblingCardIds = (siblings.data ?? []).map((r) => r.id);
      }
    }
  }

  const idsToDelete =
    groupSelection === 'pick_all' && siblingCardIds.length > 0
      ? siblingCardIds
      : [cardId];

  const delRes = await sb
    .from('picks')
    .delete()
    .eq('peek_id', peekId)
    .eq('recipient_signature', signature)
    .in('card_id', idsToDelete)
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
