import type { PeekIR } from "../document/contract";
import type { PeekEvent } from "./events";
import { repackPositions, reorderById } from "./inputs";

/**
 * The pure reducer: fold one event onto the document. No IO, no id-gen, no clock —
 * every value it needs is already resolved inside the event. This is what makes the
 * document the deterministic fold of its event log.
 */
export function apply(doc: PeekIR, event: PeekEvent): PeekIR {
  switch (event.type) {
    case "concept_set":
      return { ...doc, peek: { ...doc.peek, concept: event.concept } };
    case "theme_set":
      return { ...doc, peek: { ...doc.peek, theme: event.theme } };
    case "note_set":
      return { ...doc, peek: { ...doc.peek, note_md: event.note_md } };
    case "hero_set":
      return { ...doc, peek: { ...doc.peek, hero: event.hero } };

    case "section_inserted": {
      const sections = [...doc.sections];
      const i = Math.max(0, Math.min(event.index, sections.length));
      sections.splice(i, 0, event.section);
      return { ...doc, sections };
    }
    case "section_patched":
      return {
        ...doc,
        sections: doc.sections.map((s) => (s.id === event.id ? event.section : s)),
      };
    case "section_removed":
      return { ...doc, sections: doc.sections.filter((s) => s.id !== event.id) };
    case "sections_reordered":
      return { ...doc, sections: reorderById(doc.sections, event.order) };

    case "card_added":
      return { ...doc, cards: [...doc.cards, event.card] };
    case "card_updated":
    case "card_rule_set":
      return {
        ...doc,
        cards: doc.cards.map((c) => (c.id === event.card.id ? event.card : c)),
      };
    case "card_removed":
      return { ...doc, cards: repackPositions(doc.cards.filter((c) => c.id !== event.id)) };
    case "cards_reordered":
      return { ...doc, cards: repackPositions(reorderById(doc.cards, event.order)) };

    case "variant_group_added":
      return { ...doc, variant_groups: [...doc.variant_groups, event.group] };

    case "ready_marked":
      return doc;

    default: {
      const _exhaustive: never = event;
      void _exhaustive;
      return doc;
    }
  }
}
