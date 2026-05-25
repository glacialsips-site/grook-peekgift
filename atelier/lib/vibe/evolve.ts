import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  peeks,
  type Vibe,
  type VibeCore,
  type VibeSignalSource,
  type VibeSignalSourceEntry,
} from '@/db/schema';
import { classifyCards, type CardSignal } from './classify-cards';
import { classifyTone } from './classify-tone';
import { extractPalette } from './extract-palette';

export type VibeSignal =
  | { kind: 'hero_image'; imageUrl: string }
  | { kind: 'note'; text: string }
  | { kind: 'cards'; cards: CardSignal[] };

const HISTORY_LIMIT = 10;

export async function evolveVibe(
  peekId: string,
  signal: VibeSignal,
): Promise<void> {
  try {
    const [row] = await db
      .select({ vibe: peeks.vibe })
      .from(peeks)
      .where(eq(peeks.id, peekId))
      .limit(1);
    if (!row) return;
    const current: Vibe = (row.vibe ?? {}) as Vibe;

    const result = await derivePatch(signal);
    if (!result || isEmptyPatch(result.patch)) return;

    const history = current.signal_source_history ?? [];
    const entry: VibeSignalSourceEntry = {
      source: result.source,
      ts: new Date().toISOString(),
      patch: result.patch,
    };
    const nextHistory = [...history, entry].slice(-HISTORY_LIMIT);

    const next: Vibe = {
      ...current,
      ...result.patch,
      signal_source_history: nextHistory,
    };

    await db
      .update(peeks)
      .set({ vibe: next, updatedAt: new Date() })
      .where(eq(peeks.id, peekId));
  } catch {
    return;
  }
}

interface PatchResult {
  source: VibeSignalSource;
  patch: Partial<VibeCore>;
}

async function derivePatch(signal: VibeSignal): Promise<PatchResult | null> {
  if (signal.kind === 'hero_image') {
    const palette = await extractPalette(signal.imageUrl);
    return { source: 'hero_palette', patch: { palette } };
  }
  if (signal.kind === 'note') {
    const tone = await classifyTone(signal.text);
    if (!tone) return null;
    return {
      source: 'tone_classifier',
      patch: {
        tone: tone.tone,
        mood_words: tone.mood_words,
        motion: tone.motion,
      },
    };
  }
  if (signal.kind === 'cards') {
    const patch = classifyCards(signal.cards);
    return { source: 'card_mix', patch };
  }
  return null;
}

function isEmptyPatch(patch: Partial<VibeCore>): boolean {
  return Object.keys(patch).length === 0;
}

export function scheduleEvolveVibe(peekId: string, signal: VibeSignal): void {
  void evolveVibe(peekId, signal).catch(() => undefined);
}
