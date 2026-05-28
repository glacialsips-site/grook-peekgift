# Packet 21 — Progressive vibe engine (palette extraction + tone classifier + auto-evolve)

- **Worker:** cc-on-web
- **Branch:** `claude/packet-21-vibe-progressive`
- **Depends on (sequencing):** `atelier-integration`
- **Imports from siblings:** `@/lib/anthropic/tools` (registry), `@/db/schema/peeks` (Vibe type), `@/lib/supabase/service`, `@/lib/anthropic/client`
- **Validation:** `cd atelier && npm install && npm run typecheck` (cross-packet imports)
- **Target paths:** `atelier/lib/vibe/**`, `atelier/lib/anthropic/tools/set_hero_image.ts` (modify — fold in palette-extract background task), `atelier/lib/anthropic/tools/update_vibe.ts` (modify — accept a `signal_source` for telemetry)

## Context

The product principle is **progressive everywhere** — the vibe (palette / tone / motion / typography) must evolve as new signals arrive, not be set once. STATE.md locks this. Today the chat agent calls `set_vibe` once early; we need automatic re-evaluation as the conversation progresses:

1. **Hero image lands** → extract dominant palette → call `update_vibe` with `{ palette }`. This is the highest-impact signal — a moody beach photo should pull the whole page muted-teal/gold even if the curator originally said "playful."
2. **Cards accumulate** → re-classify by category mix (high-end gag-heavy ⇒ unhinged motion; activity-heavy ⇒ tender soft motion).
3. **Note tone** → cheap LLM call on `note_md` after `set_note` → updates `tone` + `mood_words`.

All three run server-side as background tasks after the originating tool fires. They share a single `evolveVibe(peekId, signal)` entrypoint.

## Inputs

Read `lib/anthropic/tools/set_hero_image.ts`, `set_note.ts`, `add_card.ts`, `update_vibe.ts` to understand existing structure. Vibe type is in `db/schema/peeks.ts`.

## Deliver

### `atelier/lib/vibe/extract-palette.ts` (new)

Extract a 5-color palette from a remote image URL. Use the `colorthief`-style algorithm but implement inline without adding a dep — fetch the image, decode via Node's built-in `Image` API (available in Node 22 / Next runtime) or via `@vercel/og`'s `Resvg` if simpler. Output:

```ts
export interface ExtractedPalette {
  bg: string;        // darkest, for backgrounds
  surface: string;   // mid, for card surfaces
  ink: string;       // lightest, for text
  accent: string;    // most-saturated, for CTAs
  accent2: string;   // secondary saturated
}

export async function extractPalette(imageUrl: string): Promise<ExtractedPalette> {
  // 1. fetch image (with timeout 10s)
  // 2. decode to RGBA bitmap (downsample to 64x64 for speed)
  // 3. k-means cluster into 5 colors
  // 4. sort by luminance for bg/surface/ink; pick top-saturation for accent/accent2
  // 5. return as hex strings
}
```

If the image fetch fails or decoding errors out, return a sensible default palette (warm neutrals) and log a `vibe_extract_failed` event.

### `atelier/lib/vibe/classify-tone.ts` (new)

Cheap LLM call (Haiku, ~300 tokens out) that takes a note's text and returns tone + mood_words.

```ts
import { anthropic, FAST_MODEL } from '@/lib/anthropic/client';
import type { Vibe } from '@/db/schema/peeks';

export async function classifyTone(noteText: string): Promise<{
  tone: NonNullable<Vibe['tone']>;
  mood_words: NonNullable<Vibe['mood_words']>;
  motion: NonNullable<Vibe['motion']>;
}> {
  const res = await anthropic.messages.create({
    model: FAST_MODEL,
    max_tokens: 200,
    system: 'Classify the tone of a gift-giver\'s note. Respond ONLY as JSON: { "tone": one of [playful, romantic, dry, unhinged, tender], "mood_words": 3-5 short evocative words, "motion": one of [still, soft, lively] }. No prose.',
    messages: [{ role: 'user', content: noteText }],
  });
  // parse JSON from res.content[0].text
}
```

### `atelier/lib/vibe/classify-cards.ts` (new)

Pure function — given the current `cards` array, infer motion + mood adjustments based on category mix.

```ts
export function classifyCards(cards: { type: string; is_taunt: boolean }[]): Partial<Vibe> {
  const tauntRatio = cards.filter(c => c.is_taunt).length / Math.max(cards.length, 1);
  const activityRatio = cards.filter(c => c.type === 'activity').length / Math.max(cards.length, 1);
  // ... rules
  return { motion: tauntRatio > 0.3 ? 'lively' : activityRatio > 0.4 ? 'soft' : undefined };
}
```

### `atelier/lib/vibe/evolve.ts` (new)

Orchestrator. Loads the current peek, runs the appropriate signal, merges into vibe, persists via `update_vibe` tool (or directly via DB if calling tools server-side adds friction). Fire-and-forget from the tool handlers — never blocks the user-visible response.

```ts
import 'server-only';
import { db } from '@/db/client';
import { peeks } from '@/db/schema/peeks';
import { eq } from 'drizzle-orm';
import { extractPalette } from './extract-palette';
import { classifyTone } from './classify-tone';
import { classifyCards } from './classify-cards';
import type { Vibe } from '@/db/schema/peeks';

export type VibeSignal =
  | { kind: 'hero_image'; imageUrl: string }
  | { kind: 'note'; text: string }
  | { kind: 'cards'; cards: { type: string; is_taunt: boolean }[] };

export async function evolveVibe(peekId: string, signal: VibeSignal): Promise<void> {
  const [row] = await db.select({ vibe: peeks.vibe }).from(peeks).where(eq(peeks.id, peekId));
  const current: Vibe = row?.vibe ?? {};

  let patch: Partial<Vibe> = {};
  try {
    if (signal.kind === 'hero_image') patch.palette = await extractPalette(signal.imageUrl);
    if (signal.kind === 'note') patch = { ...patch, ...(await classifyTone(signal.text)) };
    if (signal.kind === 'cards') patch = { ...patch, ...classifyCards(signal.cards) };
  } catch (e) {
    // log; don't throw — vibe evolution is best-effort
    return;
  }

  const next: Vibe = { ...current, ...patch };
  await db.update(peeks).set({ vibe: next, updatedAt: new Date() }).where(eq(peeks.id, peekId));
}
```

### `atelier/lib/anthropic/tools/set_hero_image.ts` (modify)

After updating `peeks.hero_image_url`, fire `evolveVibe(peekId, { kind: 'hero_image', imageUrl })` as a background task (use `void` or `setImmediate` — fire-and-forget, don't await).

### `atelier/lib/anthropic/tools/set_note.ts` (modify)

Same pattern: after persisting `note_md`, fire `evolveVibe(peekId, { kind: 'note', text: input.note_md })`.

### `atelier/lib/anthropic/tools/add_card.ts` (modify)

After insert, load the current cards (limit 20 recent), fire `evolveVibe(peekId, { kind: 'cards', cards })`.

### `atelier/lib/anthropic/tools/update_vibe.ts` (modify)

Add an optional `signal_source` input field (`'hero_palette' | 'tone_classifier' | 'card_mix' | 'curator'`). When the tool is called directly by Claude it defaults to `'curator'`. When called from `evolveVibe`, pass the appropriate source. Persist as part of the `vibe.signal_source_history` jsonb array (capped at last 10 entries with ISO timestamps) so we can audit which signals drove which palette over time.

### `atelier/db/schema/peeks.ts` (no migration needed — using existing `vibe` jsonb)

Add an exported sub-type to the `Vibe` type:

```ts
export type Vibe = {
  // ... existing fields
  signal_source_history?: { source: string; ts: string; patch: Partial<Vibe> }[];
};
```

## Constraints

- TS strict. No `any`.
- `evolveVibe` calls are fire-and-forget — they must never block, throw, or slow the originating tool.
- `extractPalette` must not pull in heavy image libs (`sharp`, `jimp`, etc.); use Node built-ins or `@vercel/og`'s already-installed primitives.
- `classifyTone` uses `FAST_MODEL` (Haiku) for cost. If `ANTHROPIC_API_KEY` missing, gracefully return early.
- Do not modify `package.json`. If you genuinely need a new dep (likely not), surface in NOTES.md and the orchestrator will write a deps-bump packet.
- No narrative comments.

## Reply format

Branch `claude/packet-21-vibe-progressive`, commit `packet 21: progressive vibe (palette + tone + cards)`, push. NOTES.md.

Worker briefing (always apply): workspace check, code only, ambiguities in NOTES.md, minimal reply.
