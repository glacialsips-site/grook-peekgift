export type Hex = string;
export type ISODate = string;
export type URLString = string;
export type Markdown = string;

export type PageType = 'gift' | 'invite';
export type PeekStatus = 'draft' | 'published' | 'claimed' | 'archived';

export interface Concept {
  oneLiner: string;
  boldMove: string;
  voice: string;
  emotionalCore: string;
  antiPattern?: string;
}

export interface FontSpec {
  family: string;
  source?: 'google' | 'fontsource' | 'self';
  weights?: number[];
  axis?: string;
}

export interface TypeSystem {
  display: FontSpec;
  body: FontSpec;
  accent?: FontSpec;
  scaleRatio: number;
  displayTracking?: string;
  eyebrowTracking?: string;
  displayCase?: 'none' | 'upper';
}

export interface Palette {
  mode: 'light' | 'dark';
  bg: Hex; surface: Hex; ink: Hex; muted: Hex; line: Hex;
  accent: Hex; accent2?: Hex;
  glow?: boolean;
  texture?: boolean;
}

export type SceneKind =
  | 'none' | 'grain' | 'rayfan' | 'sunburst' | 'starfield' | 'gridfloor'
  | 'mirrorball' | 'confetti' | 'bubbles' | 'halftone' | 'blueprint' | 'topo' | 'mesh' | 'scanlines';
export type MotifKind =
  | 'sparkle' | 'star' | 'crown' | 'suit' | 'leaf' | 'zigzag' | 'rule'
  | 'dots' | 'sunburst' | 'hanko' | 'chrome' | 'stamp';
export type FrameKind =
  | 'plain' | 'arch' | 'locket' | 'vinyl' | 'porthole' | 'polaroid' | 'idcard' | 'stamp' | 'ticket';

export interface SpaceSpec {
  sectionY: number;
  gutter: number;
  stack?: number;
}

export interface RadiusSpec {
  card: number;
  pill: number;
}

export interface LoudSpec {
  displayShadow?: string;
  cardShadow?: { x: number; y: number; blur?: number; spread?: number; color?: string };
  borderWeight?: number;
  textureStrength?: number;
}

export interface MotionSpec {
  intensity: number;
  reduceMotionOK: true;
  easePanel?: string;
  easeSheet?: string;
}

export interface ThemeSpec {
  type: TypeSystem;
  palette: Palette;
  scene: SceneKind;
  motifs: MotifKind[];
  frame: FrameKind;
  radius: RadiusSpec;
  space: SpaceSpec;
  motion: MotionSpec;
  loud?: LoudSpec;
  cssVars?: Record<string, string>;
}

export type ImageSource = 'user_upload' | 'stock' | 'ai_generated' | 'external' | 'pending';

export interface MediaSlot {
  url: URLString | null;
  source: ImageSource;
  alt?: string;
  directive?: {
    op: 'generate' | 'search' | 'edit' | 'upscale' | 'removeBg' | 'relight';
    prompt?: string;
    from?: URLString;
    aspect?: '16:9' | '4:3' | '1:1' | '9:16' | '3:4';
  };
  frame?: FrameKind;
  status?: 'pending' | 'ready' | 'flagged';
}

export type CardType = 'product' | 'activity' | 'aspirational' | 'digital';
export type VariantSelection = 'pick_one' | 'pick_any' | 'pick_all';

export interface UnlockRule {
  kind: 'beg' | 'date_after' | 'event';
  beg_prompt?: string;
  unlock_after?: ISODate;
}

export interface Card {
  id: string;
  variant_group_id: string | null;
  position: number;
  type: CardType;
  title: string;
  description: string | null;
  media: MediaSlot | null;
  source_url: URLString | null;
  source_retailer: string | null;
  value_cents: number | null;
  value_display: string | null;
  reveal_value: boolean;
  is_taunt: boolean;
  taunt_text: string | null;
  is_locked: boolean;
  unlock_rule: UnlockRule | Record<string, never>;
  proposed_date: ISODate | null;
  location_hint: string | null;
  metadata: Record<string, unknown>;
}

export interface VariantGroup {
  id: string;
  title: string;
  selection: VariantSelection;
}

export type SectionKind =
  | 'hero'
  | 'note'
  | 'giftgrid'
  | 'rail'
  | 'lookbook'
  | 'gallery'
  | 'details'
  | 'stats'
  | 'lede'
  | 'steps'
  | 'countdown'
  | 'claim'
  | 'tracklist' | 'courses' | 'tiers' | 'stubs' | 'flightplan'
  | 'custom';

export interface Section {
  id: string;
  kind: SectionKind;
  title?: string;
  data: Record<string, unknown>;
  media?: MediaSlot;
}

export interface Peek {
  id: string;
  slug: string;
  curator_id: string;
  page_type: PageType;
  recipient_name: string | null;
  relationship: string | null;
  occasion: string | null;

  concept: Concept;
  theme: ThemeSpec;
  hero: MediaSlot | null;

  note_md: Markdown | null;
  cta_label: string | null;

  status: PeekStatus;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  published_at: ISODate | null;
  expires_at: ISODate | null;
  share_url: URLString | null;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface PeekIR {
  schema_version: 1;
  peek: Peek;
  sections: Section[];
  variant_groups: VariantGroup[];
  cards: Card[];
}

export interface Presentation {
  html: string;
  html_hash: string;
  runtime_version: string;
  authored_at: ISODate;
}

export interface PeekDocument {
  schema_version: 2;
  spine: PeekIR;
  presentation: Presentation | null;
}

export interface Pick {
  id: string;
  peek_id: string;
  card_id: string;
  picked_at: ISODate;
  recipient_signature: string | null;
  recipient_note: string | null;
  beg_message: string | null;
}

