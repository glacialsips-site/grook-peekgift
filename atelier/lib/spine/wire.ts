import type { Vibe } from '@/db/schema/peeks';
import type { Card } from '@/db/schema';
import type { SpineState, SpineWireCard, SpineWirePeek } from './types';

export const PEEK_COLUMNS =
  'id, slug, recipient_name, occasion, hero_image_url, note_md, giver_names, vibe, status';

export const CARD_COLUMNS =
  'id, position, type, title, description, image_url, value_cents, reveal_value, is_taunt, taunt_text, variant_group_id';

export type SpinePeekRow = {
  id: string;
  slug: string;
  recipient_name: string | null;
  occasion: string | null;
  hero_image_url: string | null;
  note_md: string | null;
  giver_names: string[] | null;
  vibe: Vibe | null;
  status: string;
};

export type SpineCardRow = {
  id: string;
  position: number;
  type: Card['type'];
  title: string;
  description: string | null;
  image_url: string | null;
  value_cents: number | null;
  reveal_value: boolean | null;
  is_taunt: boolean | null;
  taunt_text: string | null;
  variant_group_id: string | null;
};

export function rowToWirePeek(row: SpinePeekRow): SpineWirePeek {
  return {
    id: row.id,
    slug: row.slug,
    recipientName: row.recipient_name,
    occasion: row.occasion,
    heroImageUrl: row.hero_image_url,
    noteMd: row.note_md,
    giverNames: row.giver_names ?? [],
    vibe: (row.vibe ?? {}) as Vibe,
    status: row.status,
  };
}

export function rowToWireCard(row: SpineCardRow): SpineWireCard {
  return {
    id: row.id,
    position: row.position,
    type: row.type,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    valueCents: row.value_cents,
    revealValue: row.reveal_value ?? false,
    isTaunt: row.is_taunt ?? false,
    tauntText: row.taunt_text,
    variantGroupId: row.variant_group_id,
  };
}

export function rowsToState(peek: SpinePeekRow, cards: SpineCardRow[]): SpineState {
  return {
    peek: rowToWirePeek(peek),
    cards: cards.map(rowToWireCard).sort((a, b) => a.position - b.position),
  };
}
