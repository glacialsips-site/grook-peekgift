import { PEEK_METHOD, PEEK_CONTRACT } from "./system-prompt";
import { PEEK_PANTRY } from "./pantry";
import { PEEK_FEWSHOT } from "./exemplar";

export interface SystemBlock {
  type: "text";
  text: string;
  cache_control: { type: "ephemeral" };
}

const FEWSHOT_BLOCK = `## ONE WORKED EXAMPLE — the bar and the shape (never a template to copy)
This is the founder's own answer to "my dad's 60th, he's always out with the mower": a hardware-store WORK ORDER. Study how the OBJECT dictates everything — the Oswald + Roboto-Mono type, the kraft palette and paper grain, "The Haul" as a supply checklist with retailer chips and prices, the steak dinner as a perforated ticket, the gruff-tender copy ("He'll say you *shouldn't have*. He'll mean *thank you*."), the running total, the in-world "Send it to Dad" CTA — and how every claimable item is a data-peek-* tagged element you style, never a script. Reach this caliber; your page is YOUR object, never a copy of this concept.

${PEEK_FEWSHOT}`;

const ephemeral = (text: string): SystemBlock => ({
  type: "text",
  text,
  cache_control: { type: "ephemeral" },
});

export function buildCuratorSystem(): SystemBlock[] {
  return [ephemeral(PEEK_METHOD), ephemeral(PEEK_PANTRY), ephemeral(FEWSHOT_BLOCK), ephemeral(PEEK_CONTRACT)];
}
