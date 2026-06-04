// Assembles the curator turn's cached system prefix as four byte-stable blocks —
// METHOD · PANTRY · FEW-SHOT · CONTRACT — each its own ephemeral cache breakpoint.
// Anthropic caches the longest matching prefix; four breakpoints let an edit to one
// block still reuse the cache of the blocks before it. The large, stable blocks
// (pantry, few-shot) sit early so tuning the method/contract keeps hitting their cache.
//
// The method block is deliberately vocabulary-free: the pantry supplies the RANGE
// (fonts/type-art/palettes/worlds the model would otherwise default away from), and
// the few-shot supplies the SHAPE (one finished, tag-driven page at the caliber bar).

import { PEEK_METHOD, PEEK_CONTRACT } from "./system-prompt";
import { PEEK_PANTRY } from "./pantry";
import { PEEK_FEWSHOT } from "./exemplar";

export interface SystemBlock {
  type: "text";
  text: string;
  cache_control: { type: "ephemeral" };
}

// The few-shot is raw HTML; this frames it for the model so it reads as the BAR and
// the SHAPE, not a concept to copy.
const FEWSHOT_BLOCK = `## ONE WORKED EXAMPLE — the bar and the shape (never a template to copy)
This is the founder's own answer to "my dad's 60th, he's always out with the mower": a hardware-store WORK ORDER. Study how the OBJECT dictates everything — the Oswald + Roboto-Mono type, the kraft palette and paper grain, "The Haul" as a supply checklist with retailer chips and prices, the steak dinner as a perforated ticket, the gruff-tender copy ("He'll say you *shouldn't have*. He'll mean *thank you*."), the running total, the in-world "Send it to Dad" CTA — and how every claimable item is a data-peek-* tagged element you style, never a script. Reach this caliber; your page is YOUR object, never a copy of this concept.

${PEEK_FEWSHOT}`;

const ephemeral = (text: string): SystemBlock => ({
  type: "text",
  text,
  cache_control: { type: "ephemeral" },
});

/** The cached system prefix for a curator turn: [method, pantry, few-shot, contract]. */
export function buildCuratorSystem(): SystemBlock[] {
  return [ephemeral(PEEK_METHOD), ephemeral(PEEK_PANTRY), ephemeral(FEWSHOT_BLOCK), ephemeral(PEEK_CONTRACT)];
}
