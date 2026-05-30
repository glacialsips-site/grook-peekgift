/**
 * synthesize — the artist in the loop.
 *
 * Claude composes a complete, valid design (genome + peek) by calling the `create_peek` tool.
 * The tool's input_schema IS the ARMORY: every valid layout, font class, color knob, motif,
 * frame, effect, block, and page type, expressed as the Zod schemas the rest of the system
 * already enforces. The CONTRACT (system prompt) tells the model HOW to wield it with taste.
 *
 * We use tool-use (not a forced output format) so adaptive thinking stays on: the model thinks,
 * forms a thesis, then emits one structured design. We assemble the server-owned fields
 * (ids, seed, schema versions) and re-parse against the canonical schemas — a malformed design
 * throws loudly and the caller falls back to the stub, so the app never renders garbage.
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { genomeSchema, GENOME_SCHEMA_VERSION } from "@peek/vibe-genome";
import type { Genome } from "@peek/vibe-genome";
import { peekSchema, SITE_IR_SCHEMA_VERSION } from "@peek/site-ir";
import type { Peek } from "@peek/site-ir";
import { CONTRACT } from "./contract";

export type Synthesis = { genome: Genome; peek: Peek };

/** Thrown when synthesis can't produce a valid design (no key, no tool call, invalid output). */
export class SynthesisError extends Error {}

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new SynthesisError("ANTHROPIC_API_KEY is not set");
  _client ??= new Anthropic({ apiKey });
  return _client;
}

/* ------------------------- the create_peek tool ------------------------- */
// The model fills the design; the server owns identity + schema versioning + token resolution.
const genomeForModel = genomeSchema.omit({ version: true, seed: true, tokens: true, lineage: true });
const peekForModel = z.object({
  pageType: peekSchema.shape.pageType,
  title: z.string(),
  slug: z.string(),
  seoDescription: z.string().optional(),
  capabilities: peekSchema.shape.capabilities,
  sections: peekSchema.shape.sections,
});
const createPeekInput = z.object({ genome: genomeForModel, peek: peekForModel });

const inputSchema = zodToJsonSchema(createPeekInput, {
  $refStrategy: "none", // inline everything — Anthropic input_schema must be self-contained
  target: "jsonSchema7",
});

const TOOL_DESCRIPTION = `Emit ONE complete design — a \`genome\` (the design DNA) and a \`peek\` (the structured content). This is how you draw; there is no other output.

GENOME (the look):
- brief (optional): your read of the request — thesis (one line, the felt direction), occasion, recipient, mustInclude, antiPatterns.
- meta: the Tier-0 director dials (each 0..1) + era. These set the whole mood; every knob below must AGREE with them.
- knobs: the atomic choices across every domain — layout, type, color, motif, texture, shape, motion, density, imagery, voice, capability. Fill them ALL, coherently. Make bold, specific choices: a moody dark holographic rave and an airy warm garden invite should share almost no knob values.
- color.hueAnchors are **OKLCH hue degrees** (perceptual — NOT RGB/HSL). Pick by this scale, not by RGB intuition:
    ~15 wine/burgundy · ~30 red · ~40 rust · ~46 terracotta · ~65 caramel/honey · ~84 amber/gold/mustard · ~110 chartreuse · ~130 sage/olive · ~150 forest green · ~195 teal/cyan · ~230 sky blue · ~260 navy/indigo · ~300 violet/plum · ~330 magenta/orchid · ~355 crimson.
    So "warm autumn amber" = ~75–90 (NOT ~30, which is red); "terracotta" ≈ 46; "dusty rose" ≈ 12; "sage" ≈ 130; "navy" ≈ 260; "kraft/tan" ≈ 70 at low saturation. Get this right — a wrong anchor turns a cozy amber bundle into a pink one.
- rationale: one sentence, shown to the curator, naming the vibe you built.

PEEK (the content):
- pageType: "gift-bundle" (the CORE — a curated bundle + a personal note + the money button), "invite" (parties/events), or "shop" (a brand drop).
- title + slug (url-safe, lowercase-with-hyphens).
- capabilities: what the page can do.
- sections: an ordered list of blocks (each block kind has its own schema). Choose blocks that fit the occasion and write REAL, specific copy in the chosen voice — real names, real prices, a genuinely warm hand-written note, real item sources (Zappos, Amazon, Homemade, Photo...). Never lorem, never placeholder text.

For a gift-bundle ALWAYS include a \`note\` block (from / to / body / signoff) and a \`gift-grid\` with 3–5 real mixed-source items (each with itemType + source, and price where it applies) and an \`action\` (the money button, e.g. label "Send this to Sam", price "$12").

MEDIA: prefer media.kind "gradient" (premium, fully themeable) or "photo" with a real src. Do not lean on emoji glyphs — they render as gradients anyway.

Everything must cohere into one unmistakable thing. Go.`;

const createPeekTool = {
  name: "create_peek",
  description: TOOL_DESCRIPTION,
  input_schema: inputSchema as Anthropic.Tool["input_schema"],
} satisfies Anthropic.Tool;

/* ------------------------------ assembly ------------------------------ */
const rid = (p: string): string => p + globalThis.crypto.randomUUID().slice(0, 8);

function assemble(raw: unknown): Synthesis {
  const out = createPeekInput.parse(raw); // validate the model's design against the armory
  const seed = Math.floor(Math.random() * 2 ** 31);
  const genome = genomeSchema.parse({ ...out.genome, version: GENOME_SCHEMA_VERSION, seed });

  const meta: Record<string, unknown> = {
    id: rid("pk_"),
    curatorId: "cur_self", // single-curator for now; the tenancy seam is already in the schema
    slug: out.peek.slug,
    title: out.peek.title,
  };
  if (out.peek.seoDescription) meta.seo = { description: out.peek.seoDescription };

  const peek = peekSchema.parse({
    version: SITE_IR_SCHEMA_VERSION,
    pageType: out.peek.pageType,
    meta,
    theme: { genomeRef: rid("gen_") },
    capabilities: out.peek.capabilities,
    sections: out.peek.sections,
  });

  return { genome, peek };
}

/* ------------------------------- runner ------------------------------- */
async function runArtist(messages: Anthropic.MessageParam[]): Promise<Synthesis> {
  const client = getClient();
  // Stream server-side (long output + adaptive thinking) and assemble the final message.
  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 24000,
    thinking: { type: "adaptive" },
    system: [{ type: "text", text: CONTRACT, cache_control: { type: "ephemeral" } }],
    tools: [createPeekTool],
    tool_choice: { type: "auto" }, // adaptive thinking forbids forced tool_choice; the prompt insists on the call
    messages,
  });
  const message = await stream.finalMessage();
  const tool = message.content.find((b) => b.type === "tool_use");
  if (!tool || tool.type !== "tool_use") {
    throw new SynthesisError("Claude did not return a peek (no create_peek call).");
  }
  return assemble(tool.input);
}

/** Fresh generation from a free-text brief. */
export async function synthesize(brief: string): Promise<Synthesis> {
  const text = brief.trim();
  if (!text) throw new SynthesisError("empty brief");
  return runArtist([{ role: "user", content: text }]);
}

/** Revise an existing design in place — move only what the change implies, keep it on-vibe. */
export async function tweak(genome: Genome, peek: Peek, change: string): Promise<Synthesis> {
  const c = change.trim();
  if (!c) throw new SynthesisError("empty change");
  return runArtist([
    {
      role: "user",
      content:
        `Here is the current design you produced, as JSON (genome = the design DNA, peek = the content):\n\n` +
        JSON.stringify({ genome, peek }) +
        `\n\nThe curator wants this change:\n"${c}"\n\n` +
        `Apply it. Move only what the change implies and keep everything else coherent and on-vibe — all dials stay in agreement. Return the COMPLETE updated genome + peek by calling create_peek.`,
    },
  ]);
}
