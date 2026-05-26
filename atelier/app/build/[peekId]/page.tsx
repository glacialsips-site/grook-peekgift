import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseService } from '@/lib/supabase/service';
import { BuildSurface } from '@/components/build/build-surface';
import type { InitialChatMessage } from '@/components/build/chat-pane';
import { loadChatHistory, serializeHistory } from '@/lib/chat/persistence';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'build/page' });
import type {
  Card,
  Peek,
  PeekDraft,
  VariantGroup,
  Vibe,
} from '@/lib/peek/types';

export const dynamic = 'force-dynamic';

type RawPeekRow = {
  id: string;
  slug: string;
  curator_id: string | null;
  recipient_name: string | null;
  relationship: string | null;
  occasion: string | null;
  vibe: Vibe | null;
  hero_image_url: string | null;
  hero_image_source: string | null;
  hero_prompt: string | null;
  note_md: string | null;
  status: Peek['status'];
  metadata: Record<string, unknown> | null;
  updated_at: string;
};

type RawCardRow = {
  id: string;
  peek_id: string;
  variant_group_id: string | null;
  position: number;
  type: Card['type'];
  title: string;
  description: string | null;
  image_url: string | null;
  value_cents: number | null;
  reveal_value: boolean;
  is_taunt: boolean;
  taunt_text: string | null;
  is_locked: boolean;
  unlock_rule: Card['unlockRule'] | null;
  proposed_date: string | null;
  location_hint: string | null;
  added_by_user_id: string | null;
};

type RawVariantGroupRow = {
  id: string;
  peek_id: string;
  title: string;
  selection: VariantGroup['selection'];
  position: number;
};

function toPeek(row: RawPeekRow): Peek {
  return {
    id: row.id,
    slug: row.slug,
    curatorId: row.curator_id,
    recipientName: row.recipient_name,
    relationship: row.relationship,
    occasion: row.occasion,
    vibe: row.vibe ?? {},
    heroImageUrl: row.hero_image_url,
    heroImageSource: row.hero_image_source,
    heroPrompt: row.hero_prompt,
    noteMd: row.note_md,
    status: row.status,
    metadata: row.metadata ?? {},
    updatedAt: row.updated_at,
  };
}

function toCard(row: RawCardRow): Card {
  return {
    id: row.id,
    peekId: row.peek_id,
    variantGroupId: row.variant_group_id,
    position: row.position,
    type: row.type,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    valueCents: row.value_cents,
    revealValue: row.reveal_value,
    isTaunt: row.is_taunt,
    tauntText: row.taunt_text,
    isLocked: row.is_locked,
    unlockRule: (row.unlock_rule ?? {}) as Card['unlockRule'],
    proposedDate: row.proposed_date,
    locationHint: row.location_hint,
    addedByUserId: row.added_by_user_id,
  };
}

function toVariantGroup(row: RawVariantGroupRow): VariantGroup {
  return {
    id: row.id,
    peekId: row.peek_id,
    title: row.title,
    selection: row.selection,
    position: row.position,
  };
}

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

  const row = peekRow as RawPeekRow;
  const anonSessionId =
    (row.metadata as { anonymous_session_id?: string } | null)?.anonymous_session_id ??
    null;
  const ownedByUser = row.curator_id && row.curator_id === userId;
  const ownedByAnon = !row.curator_id && Boolean(anonSessionId);
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

  const cards = (cardsRes.data as RawCardRow[] | null) ?? [];
  const groups = (groupsRes.data as RawVariantGroupRow[] | null) ?? [];

  const initialDraft: PeekDraft = {
    peek: toPeek(row),
    cards: cards
      .map(toCard)
      .sort((a, b) => a.position - b.position),
    variantGroups: groups
      .map(toVariantGroup)
      .sort((a, b) => a.position - b.position),
  };

  let initialHistory: InitialChatMessage[] = [];
  try {
    const persisted = await loadChatHistory(peekId);
    initialHistory = serializeHistory(persisted) as InitialChatMessage[];
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
