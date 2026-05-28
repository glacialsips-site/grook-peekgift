import type { VibeMotion } from '@/lib/peek/types';

export type RevealPhase =
  | 'hero'
  | 'name'
  | 'occasion'
  | 'note'
  | 'cards'
  | 'done';

export const REVEAL_PHASES: readonly RevealPhase[] = [
  'hero',
  'name',
  'occasion',
  'note',
  'cards',
  'done',
] as const;

export const MOTION_SCALE: Record<VibeMotion, number> = {
  still: 0.6,
  soft: 1,
  lively: 1.25,
};

// Base durations at soft (1x); MOTION_SCALE multiplies them.
const HERO_BASE_MS = 1800;
const NAME_FADE_BASE_MS = 900;
const OCCASION_BASE_MS = 400;
const NOTE_BASE_MS = 800;
const NOTE_CAP_MS = 2400;
const GAP_BASE_MS = 200;
const CARD_STAGGER_BASE_MS = 100;
const CARDS_TEASER_FLOOR_MS = 400;
const REVEAL_CARDS_CAP = 6;

const NAME_TYPEWRITER_MS_PER_CHAR = 50;
const NAME_TYPEWRITER_MAX_CHARS = 20;
const NOTE_WORD_MS = 80;
const NOTE_BATCH_THRESHOLD_WORDS = 50;
const NOTE_BATCH_WORDS_PER_LINE = 7;

export type PhasePlanInput = {
  motion: VibeMotion;
  hasNote: boolean;
  noteWordCount: number;
  nameLength: number;
  hasOccasion: boolean;
  cardCount: number;
};

export type PhasePlan = {
  scale: number;
  hero: { startMs: number; durationMs: number };
  name: {
    startMs: number;
    durationMs: number;
    style: 'typewriter' | 'fade';
    msPerChar: number;
  };
  occasion: { startMs: number; durationMs: number; visible: boolean };
  note: {
    startMs: number;
    durationMs: number;
    visible: boolean;
    style: 'word' | 'line';
    perStepMs: number;
  };
  cards: {
    startMs: number;
    durationMs: number;
    staggerMs: number;
    visibleCount: number;
  };
  totalMs: number;
};

/**
 * Pure phase planner. Phase order: hero → name → occasion → note → cards → done.
 * Each phase's start cascades from prev start + duration + gap.
 * `motion` multiplies all durations and the stagger.
 */
export function planPhases(input: PhasePlanInput): PhasePlan {
  const {
    motion,
    hasNote,
    noteWordCount,
    nameLength,
    hasOccasion,
    cardCount,
  } = input;
  const scale = MOTION_SCALE[motion];
  const gap = Math.round(GAP_BASE_MS * scale);

  const heroDuration = Math.round(HERO_BASE_MS * scale);
  const heroStart = 0;

  const isTypewriter = nameLength > 0 && nameLength <= NAME_TYPEWRITER_MAX_CHARS;
  const nameStyle = isTypewriter ? 'typewriter' : 'fade';
  const msPerChar = Math.round(NAME_TYPEWRITER_MS_PER_CHAR * scale);
  const nameDuration = isTypewriter
    ? Math.max(msPerChar * nameLength, Math.round(450 * scale))
    : Math.round(NAME_FADE_BASE_MS * scale);
  const nameStart = heroStart + heroDuration + gap;

  const occasionVisible = hasOccasion;
  const occasionDuration = occasionVisible
    ? Math.round(OCCASION_BASE_MS * scale)
    : 0;
  const occasionStart = nameStart + nameDuration + gap;

  const noteVisible = hasNote && noteWordCount > 0;
  const noteStyle: 'word' | 'line' =
    noteWordCount > NOTE_BATCH_THRESHOLD_WORDS ? 'line' : 'word';
  const perStepMs =
    noteStyle === 'word'
      ? Math.round(NOTE_WORD_MS * scale)
      : Math.round(NOTE_WORD_MS * NOTE_BATCH_WORDS_PER_LINE * scale);
  const stepCount =
    noteStyle === 'word'
      ? noteWordCount
      : Math.ceil(noteWordCount / NOTE_BATCH_WORDS_PER_LINE);
  const noteRaw = noteVisible
    ? Math.max(Math.round(NOTE_BASE_MS * scale), perStepMs * stepCount)
    : 0;
  const noteDuration = noteVisible
    ? Math.min(noteRaw, Math.round(NOTE_CAP_MS * scale))
    : 0;
  const noteStart = occasionVisible
    ? occasionStart + occasionDuration + gap
    : occasionStart;

  const visibleCardCount = Math.max(
    0,
    Math.min(cardCount, REVEAL_CARDS_CAP),
  );
  const staggerMs = Math.round(CARD_STAGGER_BASE_MS * scale);
  const cardsDealMs = Math.max(
    staggerMs * Math.max(visibleCardCount, 1),
    Math.round(CARDS_TEASER_FLOOR_MS * scale),
  );
  const cardsStart = noteVisible
    ? noteStart + noteDuration + gap
    : noteStart;
  const totalMs = cardsStart + cardsDealMs;

  return {
    scale,
    hero: { startMs: heroStart, durationMs: heroDuration },
    name: {
      startMs: nameStart,
      durationMs: nameDuration,
      style: nameStyle,
      msPerChar,
    },
    occasion: {
      startMs: occasionStart,
      durationMs: occasionDuration,
      visible: occasionVisible,
    },
    note: {
      startMs: noteStart,
      durationMs: noteDuration,
      visible: noteVisible,
      style: noteStyle,
      perStepMs,
    },
    cards: {
      startMs: cardsStart,
      durationMs: cardsDealMs,
      staggerMs,
      visibleCount: visibleCardCount,
    },
    totalMs,
  };
}

/**
 * Tokenize a string into words. Each token retains its trailing whitespace so
 * joining the spans renders identical to the source text.
 */
export function tokenizeWords(text: string): string[] {
  if (!text) return [];
  const re = /\S+\s*/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push(m[0]);
  }
  return out;
}

/** Current phase for a given elapsed time. Shared by the React scheduler and tests. */
export function phaseAtElapsed(plan: PhasePlan, elapsedMs: number): RevealPhase {
  if (elapsedMs >= plan.totalMs) return 'done';
  if (elapsedMs >= plan.cards.startMs) return 'cards';
  if (plan.note.visible && elapsedMs >= plan.note.startMs) return 'note';
  if (plan.occasion.visible && elapsedMs >= plan.occasion.startMs)
    return 'occasion';
  if (elapsedMs >= plan.name.startMs) return 'name';
  return 'hero';
}
