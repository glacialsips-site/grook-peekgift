import 'server-only';
import React from 'react';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email/send';
import { CuratorPicksNotificationEmail } from '@/lib/email/templates/curator-picks-notification';
import { getSupabaseService } from '@/lib/supabase/service';

const log = logger.child({ component: 'notify-curator-picks' });

const NOTIFICATION_KIND = 'curator_pick_notified';

export type NotifyCuratorPicksArgs = {
  peekId: string;
  recipientSignature: string;
};

export type NotifyCuratorPicksResult =
  | { ok: true; status: 'sent'; id: string }
  | { ok: true; status: 'skipped'; reason: string }
  | { ok: false; error: string };

export async function notifyCuratorOfPicks(
  args: NotifyCuratorPicksArgs,
): Promise<NotifyCuratorPicksResult> {
  const { peekId, recipientSignature } = args;
  const sb = getSupabaseService();

  const existingRes = await sb
    .from('events')
    .select('id', { head: true, count: 'exact' })
    .eq('peek_id', peekId)
    .eq('kind', NOTIFICATION_KIND)
    .eq('session_id', recipientSignature);
  if (existingRes.error) {
    log.error('dedup lookup failed', {
      peek_id: peekId,
      message: existingRes.error.message,
    });
    return { ok: false, error: existingRes.error.message };
  }
  if ((existingRes.count ?? 0) > 0) {
    return { ok: true, status: 'skipped', reason: 'already_notified' };
  }

  const peekRes = await sb
    .from('peeks')
    .select('id, slug, curator_id, recipient_name, share_url')
    .eq('id', peekId)
    .maybeSingle();
  if (peekRes.error) {
    log.error('peek lookup failed', { peek_id: peekId, message: peekRes.error.message });
    return { ok: false, error: peekRes.error.message };
  }
  if (!peekRes.data) {
    return { ok: true, status: 'skipped', reason: 'peek_not_found' };
  }
  const peek = peekRes.data;
  if (!peek.curator_id) {
    return { ok: true, status: 'skipped', reason: 'no_curator' };
  }

  const userRes = await sb
    .from('users')
    .select('email, display_name')
    .eq('clerk_user_id', peek.curator_id)
    .maybeSingle();
  if (userRes.error) {
    log.error('curator lookup failed', {
      peek_id: peekId,
      curator_id: peek.curator_id,
      message: userRes.error.message,
    });
    return { ok: false, error: userRes.error.message };
  }
  const curatorEmail = userRes.data?.email ?? null;
  const curatorName = userRes.data?.display_name ?? null;
  if (!curatorEmail) {
    log.warn('curator email missing', {
      peek_id: peekId,
      curator_id: peek.curator_id,
    });
    return { ok: true, status: 'skipped', reason: 'curator_email_missing' };
  }

  const picksRes = await sb
    .from('picks')
    .select(
      'id, recipient_note, beg_message, picked_at, card:cards(id, title, description, image_url, source_url, affiliate_url)',
    )
    .eq('peek_id', peekId)
    .eq('recipient_signature', recipientSignature)
    .order('picked_at', { ascending: true });
  if (picksRes.error) {
    log.error('picks lookup failed', {
      peek_id: peekId,
      message: picksRes.error.message,
    });
    return { ok: false, error: picksRes.error.message };
  }
  type PickRow = {
    id: string;
    recipient_note: string | null;
    beg_message: string | null;
    card:
      | {
          id: string;
          title: string;
          description: string | null;
          image_url: string | null;
          source_url: string | null;
          affiliate_url: string | null;
        }
      | Array<{
          id: string;
          title: string;
          description: string | null;
          image_url: string | null;
          source_url: string | null;
          affiliate_url: string | null;
        }>
      | null;
  };
  const pickRows = (picksRes.data ?? []) as PickRow[];
  const pickItems = pickRows
    .map((row) => {
      const card = Array.isArray(row.card) ? row.card[0] : row.card;
      if (!card) return null;
      const sourceUrl = card.affiliate_url || card.source_url || null;
      return {
        cardTitle: card.title,
        cardDescription: card.description,
        cardImageUrl: card.image_url,
        sourceUrl,
        recipientNote: row.recipient_note,
        begMessage: row.beg_message,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  if (pickItems.length === 0) {
    return { ok: true, status: 'skipped', reason: 'no_picks' };
  }

  const peekUrl = `${env.APP_URL.replace(/\/+$/, '')}/build/${peek.id}`;
  const recipientName = peek.recipient_name ?? null;
  const subject = recipientName
    ? `${recipientName} picked from your Peek`
    : 'Your Peek got picks';

  const sendRes = await sendEmail({
    to: curatorEmail,
    subject,
    react: React.createElement(CuratorPicksNotificationEmail, {
      curatorName,
      recipientName,
      peekUrl,
      picks: pickItems,
    }),
  });

  const insertPayload: Record<string, unknown> = {
    to: curatorEmail,
    pick_count: pickItems.length,
    outcome: sendRes.ok ? 'sent' : 'failed',
  };
  if (!sendRes.ok) insertPayload['error'] = sendRes.error;
  if (sendRes.ok) insertPayload['resend_id'] = sendRes.id;

  const eventInsert = await sb.from('events').insert({
    peek_id: peekId,
    user_id: peek.curator_id,
    session_id: recipientSignature,
    kind: NOTIFICATION_KIND,
    payload: insertPayload,
  });
  if (eventInsert.error) {
    log.error('event insert failed', {
      peek_id: peekId,
      message: eventInsert.error.message,
    });
  }

  if (!sendRes.ok) {
    return { ok: false, error: sendRes.error };
  }
  return { ok: true, status: 'sent', id: sendRes.id };
}

export function notifyCuratorOfPicksFireAndForget(
  args: NotifyCuratorPicksArgs,
): void {
  void notifyCuratorOfPicks(args).catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    log.error('notify curator fire-and-forget rejected', {
      peek_id: args.peekId,
      message,
    });
  });
}
