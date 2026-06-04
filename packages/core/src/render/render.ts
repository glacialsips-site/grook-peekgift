import type {
  PeekIR,
  ThemeSpec,
  MediaSlot,
  Card,
  VariantGroup,
  Section,
  Concept,
  PageType,
  PeekStatus,
  UnlockRule,
  CardType,
  SectionKind,
} from "../document/contract";
import { themeToCSSVars } from "../theme/tokens";

export interface CardView {
  id: string;
  type: CardType;
  title: string;
  description: string | null;
  media: MediaSlot | null;
  valueText: string | null;
  valueCents: number | null;
  isTaunt: boolean;
  tauntText: string | null;
  isLocked: boolean;
  unlockRule: UnlockRule | null;
  proposedDate: string | null;
  locationHint: string | null;
  position: number;
}

export interface CardGroupView {
  group: VariantGroup | null;
  selection: VariantGroup["selection"] | null;
  cards: CardView[];
}

export interface ItineraryStepView {
  cardId: string;
  title: string;
  description: string | null;
  date: string | null;
  place: string | null;
}

export interface SectionView {
  id: string;
  kind: SectionKind;
  title: string | null;
  data: Record<string, unknown>;
  media: MediaSlot | null;
  bearsCards: boolean;
}

export interface RenderModel {
  pageType: PageType;
  status: PeekStatus;
  recipientName: string | null;
  relationship: string | null;
  occasion: string | null;
  concept: Concept;
  ctaLabel: string | null;
  noteMd: string | null;
  hero: MediaSlot | null;
  mode: "light" | "dark";
  cssVars: Record<string, string>;
  sections: SectionView[];
  cardGroups: CardGroupView[];
  itinerary: ItineraryStepView[];
  totalValueCents: number;
}

const CARD_BEARING: ReadonlySet<SectionKind> = new Set<SectionKind>([
  "giftgrid",
  "rail",
  "lookbook",
  "tracklist",
  "courses",
  "tiers",
  "stubs",
  "flightplan",
]);

function formatCents(c: number): string {
  return c % 100 === 0 ? `$${c / 100}` : `$${(c / 100).toFixed(2)}`;
}

function toCardView(card: Card): CardView {
  const unlock = card.unlock_rule && "kind" in card.unlock_rule ? (card.unlock_rule as UnlockRule) : null;
  const valueText =
    card.value_display ??
    (card.reveal_value && typeof card.value_cents === "number" ? formatCents(card.value_cents) : null);
  return {
    id: card.id,
    type: card.type,
    title: card.title,
    description: card.description,
    media: card.media,
    valueText,
    valueCents: card.value_cents,
    isTaunt: card.is_taunt,
    tauntText: card.taunt_text,
    isLocked: card.is_locked,
    unlockRule: unlock,
    proposedDate: card.proposed_date,
    locationHint: card.location_hint,
    position: card.position,
  };
}

function groupCards(cards: readonly Card[], variantGroups: readonly VariantGroup[]): CardGroupView[] {
  const byId = new Map(variantGroups.map((g) => [g.id, g] as const));
  const ordered = [...cards].sort((a, b) => a.position - b.position);
  const groups: CardGroupView[] = [];
  const indexByGroup = new Map<string, number>();
  for (const card of ordered) {
    const cv = toCardView(card);
    const vgId = card.variant_group_id;
    const vg = vgId ? byId.get(vgId) : undefined;
    if (vg) {
      let idx = indexByGroup.get(vg.id);
      if (idx === undefined) {
        idx = groups.length;
        groups.push({ group: vg, selection: vg.selection, cards: [] });
        indexByGroup.set(vg.id, idx);
      }
      groups[idx]!.cards.push(cv);
    } else {
      groups.push({ group: null, selection: null, cards: [cv] });
    }
  }
  return groups;
}

function buildItinerary(cards: readonly Card[]): ItineraryStepView[] {
  return cards
    .filter((c) => c.type === "activity")
    .map((c) => ({
      cardId: c.id,
      title: c.title,
      description: c.description,
      date: c.proposed_date,
      place: c.location_hint,
    }))
    .sort((a, b) => {
      const x = a.date ?? "";
      const y = b.date ?? "";
      return x < y ? -1 : x > y ? 1 : 0;
    });
}

export function render(doc: PeekIR, theme: ThemeSpec = doc.peek.theme): RenderModel {
  const sections: SectionView[] = doc.sections.map((s: Section) => ({
    id: s.id,
    kind: s.kind,
    title: s.title ?? null,
    data: s.data,
    media: s.media ?? null,
    bearsCards: CARD_BEARING.has(s.kind),
  }));

  return {
    pageType: doc.peek.page_type,
    status: doc.peek.status,
    recipientName: doc.peek.recipient_name,
    relationship: doc.peek.relationship,
    occasion: doc.peek.occasion,
    concept: doc.peek.concept,
    ctaLabel: doc.peek.cta_label,
    noteMd: doc.peek.note_md,
    hero: doc.peek.hero,
    mode: theme.palette.mode,
    cssVars: themeToCSSVars(theme),
    sections,
    cardGroups: groupCards(doc.cards, doc.variant_groups),
    itinerary: buildItinerary(doc.cards),
    totalValueCents: doc.cards.reduce((sum, c) => sum + (typeof c.value_cents === "number" ? c.value_cents : 0), 0),
  };
}
