// Shared types for peek-gift vNext

export type CardType = 'product' | 'activity' | 'aspirational' | 'digital';
export type PeekStatus = 'draft' | 'published' | 'claimed' | 'archived';
export type VariantSelection = 'pick_one' | 'pick_any' | 'pick_all';

export interface Vibe {
  tone?: string;            // 'playful' | 'romantic' | 'dry' | 'tender' | 'unhinged' ...
  palette?: {
    bg: string;             // hex
    surface: string;
    ink: string;
    accent: string;
    accent2?: string;
  };
  mood_words?: string[];
  motion?: 'still' | 'soft' | 'lively';
  font_pairing?: { display: string; body: string };
}

export interface Peek {
  id: string;
  slug: string;
  curator_id: string;
  recipient_name: string | null;
  relationship: string | null;
  occasion: string | null;
  vibe: Vibe;
  hero_image_url: string | null;
  hero_image_source: string | null;
  note_md: string | null;
  status: PeekStatus;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  published_at: string | null;
  expires_at: string | null;
  share_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  peek_id: string;
  variant_group_id: string | null;
  position: number;
  type: CardType;
  title: string;
  description: string | null;
  image_url: string | null;
  source_url: string | null;
  source_retailer: string | null;
  value_cents: number | null;
  reveal_value: boolean;
  is_taunt: boolean;
  taunt_text: string | null;
  is_locked: boolean;
  unlock_rule: Record<string, unknown>;
  proposed_date: string | null;
  location_hint: string | null;
  metadata: Record<string, unknown>;
}

export interface VariantGroup {
  id: string;
  peek_id: string;
  title: string;
  selection: VariantSelection;
}

export interface PeekDraft {
  peek: Peek;
  variant_groups: VariantGroup[];
  cards: Card[];
}

export interface Pick {
  id: string;
  peek_id: string;
  card_id: string;
  picked_at: string;
  recipient_signature: string | null;
  recipient_note: string | null;
  beg_message: string | null;
}
