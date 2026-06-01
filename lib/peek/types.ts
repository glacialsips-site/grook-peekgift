// Core domain for the Peek chat builder. This is the state Peek mutates, live,
// as the curator chats. Aesthetic-independent: the page renders from this shape
// regardless of skin.

export type CardType = "product" | "activity" | "aspirational" | "digital";

export type CardRule =
  | { kind: "none" }
  | { kind: "pick_one_of"; group: string }
  | { kind: "beg_to_unlock"; hint?: string }
  | { kind: "decorative_taunt"; message?: string };

export interface GiftCard {
  id: string;
  type: CardType;
  title: string;
  description?: string;
  price?: string;
  imageUrl?: string;
  rule: CardRule;
}

export interface Theme {
  name: string;
  vibe?: string;
  bg: string;
  surface: string;
  text: string;
  accent: string;
}

export interface Recipient {
  name?: string;
  relationship?: string;
  occasion?: string;
  notes?: string;
}

export interface GiftPage {
  recipient: Recipient;
  theme: Theme;
  cards: GiftCard[];
}

export const DEFAULT_THEME: Theme = {
  name: "Warm Linen",
  vibe: "warm, editorial, generous",
  bg: "#F4F1EA",
  surface: "#FFFFFF",
  text: "#2A2622",
  accent: "#C2683F",
};

export function emptyPage(): GiftPage {
  return { recipient: {}, theme: { ...DEFAULT_THEME }, cards: [] };
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

// Server -> client stream protocol (SSE `data:` payloads).
export type PeekEvent =
  | { type: "text"; text: string }
  | { type: "page"; page: GiftPage }
  | { type: "notice"; text: string }
  | { type: "done"; message: string }
  | { type: "error"; message: string };
