// The Anthropic tool surface the curator model authors against. The input schemas are
// GENERATED from core's command Inputs (z.toJSONSchema), so they can never drift from what
// decide() will accept — one source of truth. The tool-level descriptions (the "when to
// call" steering that earns its keep) are kept here. resolve_card is included for the model
// even though it is app-orchestration, not a core command (the turn handles it specially).

import { z } from "zod";
import { Inputs } from "@peek/core";

export interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

const DESCRIPTIONS: Record<string, string> = {
  set_concept:
    "Author the design CONCEPT — the anti-generic lock. Call this FIRST/EARLY, before theming. oneLiner must be specific enough to EXCLUDE other pages; boldMove names the single signature gesture. Replaces the whole concept.",
  set_theme:
    "Set the THEME as data (deep-merges, so partial updates refine). You MUST vary type.display per concept — never a default Fraunces+Inter. palette (mode + bg/surface/ink/muted/line/accent[+accent2]), scene, motifs (1–4), frame, radius, space, motion.",
  upsert_section:
    "Add or patch an ordered SECTION by kind (hero/note/giftgrid/gallery/details/steps/countdown/claim/stats/lede/rail/lookbook/tracklist/courses/tiers/stubs/flightplan/custom). Pass kind-specific data. custom{html} is the escape hatch for a signature move — reach for it when no archetype fits, not by reflex.",
  remove_section: "Drop the section with this id.",
  reorder_sections: "Reorder the page sections to match this list of ids (front to back).",
  set_note: "Set the personal note the recipient reads (markdown). Polish the curator's voice; never rewrite from scratch.",
  add_card:
    "Add one gift CARD (auto id, appended). type is product/activity/aspirational/digital. value_cents is for math; value_display is the human string the recipient reads. For variant bundles, add_variant_group first and pass variant_group_id. Don't ask permission for a card they just described — add it.",
  update_card: "Patch an existing card by id. Only provided fields change.",
  set_card_rule:
    "Set the lock / unlock / reveal mechanic on a card — the beg/unlock/off-limits-but-funny move. unlock_rule.kind is beg (with beg_prompt), date_after (with unlock_after), or event.",
  remove_card: "Delete a card by id; remaining positions re-pack.",
  reorder_cards: "Set card display order to match this list of card ids.",
  add_variant_group:
    "Create a 'pick N of these' bundle and get back a variant_group_id. Then add_card N times with that id. selection is pick_one / pick_any / pick_all.",
  generate_hero_image:
    "Generate a custom hero image from a VIVID, specific prompt that honors the concept (describe scene, palette, medium, mood). Sets peek.hero to a pending ai_generated slot the host fulfils.",
  set_hero_media: "Set the hero media directly — when the curator pastes a url / uploads a photo, or to leave a pending directive.",
  resolve_card:
    "Resolve a gift from a pasted URL OR a fuzzy description ('a barrel cactus under $40 shipped to 90210') into product data, then add_card with the result. Use whenever a url appears or the curator describes a specific buyable thing.",
  mark_ready: "Flag the draft ready → triggers the paywall / publish step. Call when the curator says 'done' / 'ready' / 'publish it'.",
};

function schemaFor(name: keyof typeof Inputs): Record<string, unknown> {
  try {
    return z.toJSONSchema(Inputs[name] as z.ZodType) as Record<string, unknown>;
  } catch {
    return { type: "object" };
  }
}

const generated: ToolDef[] = (Object.keys(Inputs) as (keyof typeof Inputs)[]).map((name) => ({
  name: name as string,
  description: DESCRIPTIONS[name as string] ?? (name as string),
  input_schema: schemaFor(name),
}));

// resolve_card is not a core command (it's orchestration → add_card); declare it for the model.
const resolveCard: ToolDef = {
  name: "resolve_card",
  description: DESCRIPTIONS.resolve_card!,
  input_schema: {
    type: "object",
    properties: {
      text: { type: "string", description: "The curator's fuzzy ask OR a pasted URL." },
      constraints: {
        type: "object",
        properties: {
          maxPriceCents: { type: "integer" },
          shipTo: { type: "string" },
          sizeHint: { type: "string" },
        },
      },
      images: { type: "array", items: { type: "string" } },
      screenshot: { type: "string" },
    },
    required: ["text"],
  },
};

export const PEEK_STUDIO_TOOLS: ToolDef[] = [...generated, resolveCard];
