import type {
  Concept,
  ThemeSpec,
  Section,
  Card,
  VariantGroup,
  MediaSlot,
} from "../document/contract";

// Events are FACTS: each carries the fully-resolved result (ids/positions already
// assigned by `decide`), so `apply` and replay are pure and deterministic. The
// document is the fold of its events.
export type PeekEvent =
  | { type: "concept_set"; concept: Concept }
  | { type: "theme_set"; theme: ThemeSpec }
  | { type: "note_set"; note_md: string }
  | { type: "hero_set"; hero: MediaSlot }
  | { type: "section_inserted"; section: Section; index: number }
  | { type: "section_patched"; id: string; section: Section }
  | { type: "section_removed"; id: string }
  | { type: "sections_reordered"; order: string[] }
  | { type: "card_added"; card: Card }
  | { type: "card_updated"; card: Card }
  | { type: "card_rule_set"; card: Card }
  | { type: "card_removed"; id: string }
  | { type: "cards_reordered"; order: string[] }
  | { type: "variant_group_added"; group: VariantGroup }
  | { type: "ready_marked" };

export type PeekEventType = PeekEvent["type"];
