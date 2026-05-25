import type { Metadata } from 'next';
import { createHmac, randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { env } from '@/lib/env';
import { getSupabaseService } from '@/lib/supabase/service';
import { RecipientView } from '@/components/recipient/recipient-view';
import { AlmostReady } from '@/components/recipient/almost-ready';
import type {
  Card,
  Peek,
  PeekDraft,
  VariantGroup,
  Vibe,
} from '@/lib/peek/types';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'recipient_session';
const COOKIE_TTL_DAYS = 365;

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

type RawPickRow = {
  id: string;
  card_id: string;
  recipient_signature: string;
  beg_message: string | null;
  recipient_note: string | null;
};

type PeekMetaRow = {
  recipient_name: string | null;
  occasion: string | null;
};

function toPeek(row: RawPeekRow): Peek {
  return {
    id: row.id,
    slug: row.slug,
    curatorId: row.curator_id,
    recipientName: row.recipient_name,
    relationship: row.relationship,
    occasion: row.occasion,
    vibe: (row.vibe ?? {}) as Vibe,
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

function signRecipient(sessionId: string): string {
  const secret = env.GUEST_CLAIM_TOKEN_SECRET;
  if (!secret) {
    return `unsigned:${sessionId}`;
  }
  return createHmac('sha256', secret).update(sessionId).digest('hex');
}

async function ensureRecipientSession(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  if (existing && existing.length > 0) return existing;
  const fresh = randomUUID();
  jar.set({
    name: COOKIE_NAME,
    value: fresh,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_TTL_DAYS * 24 * 60 * 60,
  });
  return fresh;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let peek: PeekMetaRow | null = null;
  try {
    const { data } = await getSupabaseService()
      .from('peeks')
      .select('recipient_name, occasion')
      .eq('slug', slug)
      .maybeSingle();
    peek = (data as PeekMetaRow | null) ?? null;
  } catch {
    peek = null;
  }

  const recipientName = peek?.recipient_name ?? null;
  const occasion = peek?.occasion ?? null;
  const title = recipientName
    ? `A Peek for ${recipientName}${occasion ? ` — ${occasion}` : ''}`
    : 'peek.gift';
  const description = recipientName
    ? `Open ${recipientName}'s Peek.`
    : 'Open your Peek.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `/g/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function RecipientPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sb = getSupabaseService();

  const peekRes = await sb
    .from('peeks')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (peekRes.error) {
    throw new Error(`Failed to load peek: ${peekRes.error.message}`);
  }
  if (!peekRes.data) notFound();
  const peekRow = peekRes.data as RawPeekRow;
  const peek = toPeek(peekRow);

  const recipientSessionId = await ensureRecipientSession();

  if (peek.status !== 'published') {
    return <AlmostReady peek={peek} />;
  }

  const [cardsRes, groupsRes, picksRes] = await Promise.all([
    sb.from('cards').select('*').eq('peek_id', peek.id),
    sb.from('variant_groups').select('*').eq('peek_id', peek.id),
    sb
      .from('picks')
      .select('id, card_id, recipient_signature, beg_message, recipient_note')
      .eq('peek_id', peek.id)
      .eq('recipient_signature', signRecipient(recipientSessionId)),
  ]);

  if (cardsRes.error) {
    throw new Error(`Failed to load cards: ${cardsRes.error.message}`);
  }
  if (groupsRes.error) {
    throw new Error(`Failed to load variant groups: ${groupsRes.error.message}`);
  }

  const cards = ((cardsRes.data as RawCardRow[] | null) ?? []).map(toCard);
  const variantGroups = (
    (groupsRes.data as RawVariantGroupRow[] | null) ?? []
  ).map(toVariantGroup);

  const draft: PeekDraft = {
    peek,
    cards: cards.sort((a, b) => a.position - b.position),
    variantGroups: variantGroups.sort((a, b) => a.position - b.position),
  };

  const myPicks = ((picksRes.data as RawPickRow[] | null) ?? []).map((p) => ({
    pickId: p.id,
    cardId: p.card_id,
    begMessage: p.beg_message,
    recipientNote: p.recipient_note,
  }));

  return (
    <RecipientView
      draft={draft}
      recipientSessionId={recipientSessionId}
      initialPicks={myPicks}
    />
  );
}
