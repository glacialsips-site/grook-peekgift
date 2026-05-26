import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseService } from '@/lib/supabase/service';
import { BuildSurface } from '@/components/build/build-surface';
import type { InitialChatMessage } from '@/components/build/chat-pane';
import { loadChatHistory, serializeHistory } from '@/lib/chat/persistence';
import { logger } from '@/lib/logger';
import { rowToCard, rowToPeek, rowToVariantGroup } from '@/lib/peek/from-rows';
import type { PeekDraft } from '@/lib/peek/types';

const log = logger.child({ component: 'build/page' });

export const dynamic = 'force-dynamic';

export default async function BuildPeekPage({
  params,
}: {
  params: Promise<{ peekId: string }>;
}) {
  const { peekId } = await params;
  const { userId } = await auth();
  if (!userId) {
    redirect(`/sign-in?returnTo=/build/${peekId}`);
  }

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

  const metadata = peekRow.metadata ?? {};
  const anonSessionRaw = metadata['anonymous_session_id'];
  const anonSessionId = typeof anonSessionRaw === 'string' ? anonSessionRaw : null;
  const ownedByUser = peekRow.curator_id && peekRow.curator_id === userId;
  const ownedByAnon = !peekRow.curator_id && Boolean(anonSessionId);
  if (!ownedByUser && !ownedByAnon) {
    notFound();
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
    peek: rowToPeek(peekRow),
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

  return (
    <BuildSurface
      peekId={peekId}
      initialDraft={initialDraft}
      initialHistory={initialHistory}
    />
  );
}
