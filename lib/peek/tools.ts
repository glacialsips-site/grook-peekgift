// Peek's tools: how the model builds the gift page. Each call is a pure state
// mutation applied by `applyTool`, which is the single source of truth for page
// state both in live mode (server applies, streams snapshots) and preview mode
// (the scripted driver reuses it). Descriptions are prescriptive about *when* to
// call — recent Opus models reach for tools conservatively, so trigger
// conditions in the description earn their keep.

import type Anthropic from "@anthropic-ai/sdk";
import type { CardRule, CardType, GiftPage } from "./types";

export const PEEK_TOOLS: Anthropic.Tool[] = [
  {
    name: "set_recipient",
    description:
      "Set or update who this gift page is for. Call this as soon as you learn the recipient's name, your relationship to them, the occasion, or notes about their taste. Fields merge with what's already set.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Recipient's name" },
        relationship: { type: "string", description: "Curator's relationship to them, e.g. 'my sister'" },
        occasion: { type: "string", description: "e.g. 'birthday', 'just because'" },
        notes: { type: "string", description: "Taste, interests, constraints" },
      },
    },
  },
  {
    name: "set_theme",
    description:
      "Set the page's visual theme to fit the recipient and occasion. Call once you have a sense of the vibe (and again if it should shift). Give a short theme name and a cohesive palette as hex values.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Short theme name, e.g. 'Midnight Botanical'" },
        vibe: { type: "string", description: "One phrase describing the feel" },
        bg: { type: "string", description: "Page background hex, e.g. #F4F1EA" },
        surface: { type: "string", description: "Card surface hex" },
        text: { type: "string", description: "Primary text hex" },
        accent: { type: "string", description: "Accent hex for highlights" },
      },
      required: ["name"],
    },
  },
  {
    name: "add_card",
    description:
      "Add one gift to the page — call this each time you and the curator settle on an idea (one card per gift). Pick the type that fits: product (a buyable item), activity (an experience), aspirational (a dream/stretch gift), digital (a digital good or gift card). Returns the new card's id, which you need to update it, remove it, or attach a rule.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["product", "activity", "aspirational", "digital"] },
        title: { type: "string" },
        description: { type: "string" },
        price: { type: "string", description: "Display price, e.g. '$48'" },
        image_url: { type: "string" },
      },
      required: ["type", "title"],
    },
  },
  {
    name: "update_card",
    description: "Edit an existing card by id. Only provided fields change.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { type: "string", enum: ["product", "activity", "aspirational", "digital"] },
        title: { type: "string" },
        description: { type: "string" },
        price: { type: "string" },
        image_url: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "remove_card",
    description: "Remove a card from the page by id.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "set_card_rule",
    description:
      "Attach an interaction rule to a card. pick_one_of forces a choice within a named group (recipient picks one card from that group); beg_to_unlock hides the gift until the recipient asks to unlock it; decorative_taunt shows the gift as a playful tease they can't pick. Use 'none' to clear.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        rule_type: { type: "string", enum: ["none", "pick_one_of", "beg_to_unlock", "decorative_taunt"] },
        group: { type: "string", description: "Group name (pick_one_of only)" },
        hint: { type: "string", description: "Unlock hint (beg_to_unlock only)" },
        message: { type: "string", description: "Taunt message (decorative_taunt only)" },
      },
      required: ["id", "rule_type"],
    },
  },
];

let counter = 0;
function newId(): string {
  return `c_${Date.now().toString(36)}${(counter++).toString(36)}`;
}

function ruleFromInput(input: Record<string, any>): CardRule {
  switch (input.rule_type) {
    case "pick_one_of":
      return { kind: "pick_one_of", group: String(input.group ?? "choices") };
    case "beg_to_unlock":
      return { kind: "beg_to_unlock", hint: input.hint };
    case "decorative_taunt":
      return { kind: "decorative_taunt", message: input.message };
    default:
      return { kind: "none" };
  }
}

// Apply a tool call to the page. Returns the next page and a short result string
// fed back to the model (so it knows ids and current counts).
export function applyTool(
  page: GiftPage,
  name: string,
  rawInput: unknown,
): { page: GiftPage; result: string } {
  const input = (rawInput ?? {}) as Record<string, any>;
  const next: GiftPage = {
    recipient: { ...page.recipient },
    theme: { ...page.theme },
    cards: page.cards.map((c) => ({ ...c })),
  };

  switch (name) {
    case "set_recipient": {
      for (const k of ["name", "relationship", "occasion", "notes"] as const) {
        if (typeof input[k] === "string" && input[k].length) next.recipient[k] = input[k];
      }
      const who = next.recipient.name ?? "the recipient";
      return { page: next, result: `Recipient updated (${who}).` };
    }
    case "set_theme": {
      next.theme.name = String(input.name ?? next.theme.name);
      for (const k of ["vibe", "bg", "surface", "text", "accent"] as const) {
        if (typeof input[k] === "string" && input[k].length) (next.theme as any)[k] = input[k];
      }
      return { page: next, result: `Theme set to "${next.theme.name}".` };
    }
    case "add_card": {
      const id = newId();
      next.cards.push({
        id,
        type: (input.type as CardType) ?? "product",
        title: String(input.title ?? "Untitled"),
        description: input.description,
        price: input.price,
        imageUrl: input.image_url,
        rule: { kind: "none" },
      });
      return {
        page: next,
        result: `Added ${input.type} card "${input.title}" (id: ${id}). The page now has ${next.cards.length} card(s).`,
      };
    }
    case "update_card": {
      const card = next.cards.find((c) => c.id === input.id);
      if (!card) return { page, result: `No card with id ${input.id}.` };
      if (input.type) card.type = input.type;
      if (typeof input.title === "string") card.title = input.title;
      if (typeof input.description === "string") card.description = input.description;
      if (typeof input.price === "string") card.price = input.price;
      if (typeof input.image_url === "string") card.imageUrl = input.image_url;
      return { page: next, result: `Updated card ${input.id}.` };
    }
    case "remove_card": {
      const before = next.cards.length;
      next.cards = next.cards.filter((c) => c.id !== input.id);
      return {
        page: next,
        result: before === next.cards.length ? `No card with id ${input.id}.` : `Removed card ${input.id}.`,
      };
    }
    case "set_card_rule": {
      const card = next.cards.find((c) => c.id === input.id);
      if (!card) return { page, result: `No card with id ${input.id}.` };
      card.rule = ruleFromInput(input);
      return { page: next, result: `Rule "${card.rule.kind}" set on card ${input.id}.` };
    }
    default:
      return { page, result: `Unknown tool: ${name}` };
  }
}
