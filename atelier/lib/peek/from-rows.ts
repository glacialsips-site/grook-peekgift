import type { DbRow } from '@/lib/supabase/database.types';
import type {
  Card,
  Peek,
  UnlockRule,
  VariantGroup,
} from './types';

type PeekRow = DbRow<'peeks'>;
type CardRow = DbRow<'cards'>;
type VariantGroupRow = DbRow<'variant_groups'>;

export function rowToPeek(row: PeekRow): Peek {
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

export function rowToCard(row: CardRow): Card {
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

export function rowToVariantGroup(row: VariantGroupRow): VariantGroup {
  return {
    id: row.id,
    peekId: row.peek_id,
    title: row.title,
    selection: row.selection,
    position: row.position,
  };
}
