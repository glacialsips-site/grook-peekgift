import type { Metadata } from 'next';
import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getSupabaseService } from '@/lib/supabase/service';
import type { DbRow } from '@/lib/supabase/database.types';
import { RecipientView } from '@/components/recipient/recipient-view';
import { AlmostReady } from '@/components/recipient/almost-ready';
import { GuestSecretMissingError, signRecipient } from '@/lib/security/recipient';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'g/[slug]/page' });
import type {
  Card,
  Peek,
  PeekDraft,
  UnlockRule,
  VariantGroup,
  Vibe,
} from '@/lib/peek/types';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'recipient_session';
const COOKIE_TTL_DAYS = 365;

type PeekRow = DbRow<'peeks'>;
type CardRow = DbRow<'cards'>;
type VariantGroupRow = DbRow<'variant_groups'>;
type PickRow = DbRow<'picks'>;

function toPeek(row: PeekRow): Peek {
  return {
    id: row.id,
    slug: row.slug,
    curatorId: row.curator_id,
    recipientName: row.recipient_name,
    relationship: row.relationship,
    occasion: row.occasion,
    vibe: row.vibe,
    heroImageUrl: row.hero_image_url,
    heroImageSource: row.hero_image_source,
    heroPrompt: row.hero_prompt,
    noteMd: row.note_md,
    status: row.status,
    metadata: row.metadata ?? {},
    updatedAt: row.updated_at,
  };
}

function toCard(row: CardRow): Card {
  const unlockRule: UnlockRule = row.unlock_rule;
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
    unlockRule,
    proposedDate: row.proposed_date,
    locationHint: row.location_hint,
    addedByUserId: row.added_by_user_id,
  };
}

function toVariantGroup(row: VariantGroupRow): VariantGroup {
  return {
    id: row.id,
    peekId: row.peek_id,
    title: row.title,
    selection: row.selection,
    position: row.position,
  };
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
    secure: process.env['NODE_ENV'] === 'production',
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
  let peek: Pick<PeekRow, 'recipient_name' | 'occasion'> | null = null;
  try {
    const { data } = await getSupabaseService()
      .from('peeks')
      .select('recipient_name, occasion')
      .eq('slug', slug)
      .maybeSingle();
    peek = data;
  } catch (err) {
    log.warn('generateMetadata lookup failed', {
      slug,
      err: err instanceof Error ? err.message : String(err),
    });
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
  const peek = toPeek(peekRes.data);

  const recipientSessionId = await ensureRecipientSession();

  if (peek.status !== 'published') {
    return <AlmostReady peek={peek} />;
  }

  let recipientSignature: string;
  try {
    recipientSignature = signRecipient(recipientSessionId);
  } catch (err) {
    if (err instanceof GuestSecretMissingError) {
      throw new Error('service_unavailable: GUEST_CLAIM_TOKEN_SECRET missing');
    }
    throw err;
  }

  const [cardsRes, groupsRes, picksRes] = await Promise.all([
    sb.from('cards').select('*').eq('peek_id', peek.id),
    sb.from('variant_groups').select('*').eq('peek_id', peek.id),
    sb
      .from('picks')
      .select('id, card_id, recipient_signature, beg_message, recipient_note')
      .eq('peek_id', peek.id)
      .eq('recipient_signature', recipientSignature),
  ]);

  if (cardsRes.error) {
    throw new Error(`Failed to load cards: ${cardsRes.error.message}`);
  }
  if (groupsRes.error) {
    throw new Error(`Failed to load variant groups: ${groupsRes.error.message}`);
  }
  if (picksRes.error) {
    throw new Error(`Failed to load picks: ${picksRes.error.message}`);
  }

  const cards = (cardsRes.data ?? []).map(toCard);
  const variantGroups = (groupsRes.data ?? []).map(toVariantGroup);
  const pickRows: Pick<
    PickRow,
    'id' | 'card_id' | 'beg_message' | 'recipient_note'
  >[] = picksRes.data ?? [];

  const draft: PeekDraft = {
    peek,
    cards: cards.sort((a, b) => a.position - b.position),
    variantGroups: variantGroups.sort((a, b) => a.position - b.position),
  };

  const myPicks = pickRows.map((p) => ({
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
