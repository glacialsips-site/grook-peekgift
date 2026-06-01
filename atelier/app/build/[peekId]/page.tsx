import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseService } from '@/lib/supabase/service';
import { BuildSurface } from '@/components/build/build-surface';
import type { InitialChatMessage } from '@/components/build/chat-pane';
import { loadChatHistory, serializeHistory } from '@/lib/chat/persistence';
import { logger } from '@/lib/logger';
import { rowToCard, rowToPeek, rowToVariantGroup } from '@/lib/peek/from-rows';
import type { PeekDraft } from '@/lib/peek/types';
import { ensureCuratorRow, readAnonSessionId } from '@/lib/auth/server';

const log = logger.child({ component: 'build/page' });

export const dynamic = 'force-dynamic';

export default async function BuildPeekPage({
  params,
}: {
  params: Promise<{ peekId: string }>;
}) {
  const { peekId } = await params;
  const { userId } = await auth();

  const sb = getSupabaseService();

  const { data: peekRow, error: peekErr } = await sb
    .from('peeks')
    .select('*')
    .eq('id', peekId)
    .maybeSingle();

  if (peekErr) {
    throw new Error(`Failed to load peek: ${peekErr.message}`);
  }
  if (!peekRow) notFound();

  const metadata = (peekRow.metadata ?? {}) as Record<string, unknown>;
  const anonSessionRaw = metadata['anonymous_session_id'];
  const anonSessionId =
    typeof anonSessionRaw === 'string' ? anonSessionRaw : null;

  let effectivePeekRow = peekRow;

  if (userId) {
    const ownedByUser =
      peekRow.curator_id !== null && peekRow.curator_id === userId;
    const cookieAnon = await readAnonSessionId();
    const claimable =
      peekRow.curator_id === null &&
      anonSessionId !== null &&
      cookieAnon !== null &&
      cookieAnon === anonSessionId;

    if (!ownedByUser && !claimable) {
      notFound();
    }

    if (!ownedByUser && claimable) {
      await ensureCuratorRow(userId);
      const nextMetadata: Record<string, unknown> = { ...metadata };
      delete nextMetadata['anonymous_session_id'];
      nextMetadata['claimed_from_anon_session_id'] = anonSessionId;
      nextMetadata['claimed_at'] = new Date().toISOString();

      const { data: claimed, error: claimErr } = await sb
        .from('peeks')
        .update({
          curator_id: userId,
          metadata: nextMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', peekId)
        .is('curator_id', null)
        .select('*')
        .maybeSingle();

      if (claimErr) {
        log.error('claim_anon_peek_failed', {
          peekId,
          message: claimErr.message,
        });
        throw new Error(`Failed to claim peek: ${claimErr.message}`);
      }
      if (claimed) {
        effectivePeekRow = claimed;
        log.info('claimed_anon_peek', {
          peekId,
          userId,
          anonSessionId,
        });
      }
    }
  } else {
    // Middleware mints the anon cookie before this Server Component runs.
    const cookieAnon = await readAnonSessionId();
    const ownedByAnon =
      peekRow.curator_id === null &&
      anonSessionId !== null &&
      cookieAnon !== null &&
      anonSessionId === cookieAnon;
    if (!ownedByAnon) {
      notFound();
    }
  }

  const [cardsRes, groupsRes] = await Promise.all([
    sb.from('cards').select('*').eq('peek_id', peekId),
    sb.from('variant_groups').select('*').eq('peek_id', peekId),
  ]);

  if (cardsRes.error) {
    throw new Error(`Failed to load cards: ${cardsRes.error.message}`);
  }
  if (groupsRes.error) {
    throw new Error(`Failed to load variant groups: ${groupsRes.error.message}`);
  }

  const initialDraft: PeekDraft = {
    peek: rowToPeek(effectivePeekRow),
    cards: (cardsRes.data ?? [])
      .map(rowToCard)
      .sort((a, b) => a.position - b.position),
    variantGroups: (groupsRes.data ?? [])
      .map(rowToVariantGroup)
      .sort((a, b) => a.position - b.position),
  };

  let initialHistory: InitialChatMessage[] = [];
  try {
    const persisted = await loadChatHistory(peekId);
    initialHistory = serializeHistory(persisted).map((entry) => ({
      role: entry.role,
      content: entry.content,
      toolCallId: entry.toolCallId,
      createdAt: entry.createdAt,
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('loadChatHistory failed', { peekId, message });
  }

  const finalAnonSessionId = userId ? null : await readAnonSessionId();

  return (
    <BuildSurface
      peekId={peekId}
      initialDraft={initialDraft}
      initialHistory={initialHistory}
      anonSessionId={finalAnonSessionId}
    />
  );
}
