// Preview-mode driver: a scripted Peek used when no ANTHROPIC_API_KEY is set, so
// the chat is demoable with zero secrets. It reuses applyTool — the exact same
// reducer the live path uses — so the page builds identically. Flip to live by
// setting the key; nothing else changes.

import { applyTool } from "./tools";
import type { ChatMessage, GiftPage, PeekEvent } from "./types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function say(text: string, send: (e: PeekEvent) => void) {
  for (const token of text.split(/(\s+)/)) {
    send({ type: "text", text: token });
    if (token.trim()) await sleep(22);
  }
}

function guessName(messages: ChatMessage[]): string | undefined {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const m = lastUser.match(/\bfor\s+([A-Z][a-zA-Z]+)/) || lastUser.match(/\b(?:my|our)\s+\w+\s+([A-Z][a-zA-Z]+)/);
  return m?.[1];
}

type Step = { text?: string; tool?: { name: string; input: Record<string, unknown> } };

export async function runPreview(
  messages: ChatMessage[],
  startPage: GiftPage,
  send: (e: PeekEvent) => void,
): Promise<void> {
  send({
    type: "notice",
    text: "Preview mode — Peek is scripted until ANTHROPIC_API_KEY is set. The engine is live.",
  });

  let page = startPage;
  const name = guessName(messages);
  const who = name ?? "them";

  const script: Step[] = [
    { text: `Love it.${name ? ` Let's build something for ${name}.` : " Let's build something special."} First, the feel of the page.` },
    { tool: { name: "set_recipient", input: { name, occasion: "just because", notes: "warm, design-minded, loves a small ritual" } } },
    { tool: { name: "set_theme", input: { name: "Dusk Citrus", vibe: "warm, editorial, a little playful", bg: "#1C1A24", surface: "#262232", text: "#F3EFE7", accent: "#E5944B" } } },
    { text: ` There — a dusky, citrus-warm theme. Now a few gifts I think ${who} would actually love.` },
    { tool: { name: "add_card", input: { type: "product", title: "Hand-thrown ceramic pour-over", description: "A slow-coffee ritual, one cup at a time.", price: "$68" } } },
    { tool: { name: "add_card", input: { type: "activity", title: "Twilight pottery class for two", description: "Make the next mug yourselves.", price: "$140" } } },
    { text: ` I'd let ${who} pick between those two — one ritual, their choice.` },
    { tool: { name: "set_card_rule", input: { id: "PICK_A", rule_type: "pick_one_of", group: "the-ritual" } } },
    { tool: { name: "set_card_rule", input: { id: "PICK_B", rule_type: "pick_one_of", group: "the-ritual" } } },
    { tool: { name: "add_card", input: { type: "aspirational", title: "A week in a Kyoto machiya", description: "The someday trip. Pinned here as a wish.", price: "—" } } },
    { tool: { name: "set_card_rule", input: { id: "TAUNT", rule_type: "decorative_taunt", message: "Not this year. But I see you." } } },
    { text: ` And a dream pinned at the bottom as a wink. Want it warmer, or should we add something they'd never buy themselves?` },
  ];

  // Track the ids of the two ritual cards + the taunt so the scripted rules land
  // on the right cards (add_card mints real ids via applyTool).
  const ids: string[] = [];

  for (const step of script) {
    if (step.text) await say(step.text, send);
    if (step.tool) {
      let input = step.tool.input;
      if (step.tool.name === "set_card_rule") {
        const placeholder = input.id as string;
        const map: Record<string, number> = { PICK_A: 0, PICK_B: 1, TAUNT: 2 };
        input = { ...input, id: ids[map[placeholder]] ?? ids[ids.length - 1] };
      }
      const { page: nextPage, result } = applyTool(page, step.tool.name, input);
      page = nextPage;
      if (step.tool.name === "add_card") {
        const m = result.match(/id:\s([^)]+)\)/);
        if (m) ids.push(m[1]);
      }
      send({ type: "page", page });
      await sleep(140);
    }
  }

  send({ type: "done", message: "" });
}
