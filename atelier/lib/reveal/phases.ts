/**
 * Phase math for the cinematic recipient reveal.
 *
 * Magazine-cover-opening choreography — see `_packets/SPINE/skills/reveal-mechanics.md`
 * for the design spec. This module is the deterministic, framework-free core: given
 * a peek shape + vibe.motion, produce the per-phase timing budget the React
 * component schedules against. Lives outside the React tree so the snapshot test can
 * exercise it without spinning up a renderer.
 *
 * Phase order (load-bearing):
 *   hero → name → occasion → note → cards → done
 *
 * Each phase's start time cascades from the previous phase's start + duration + gap.
 * `vibe.motion` is a uniform duration multiplier (still 0.6x, soft 1.0x, lively 1.25x).
 */
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

// Base durations at soft (1x). Magazine-cover-opening tuned per skill §3.
const HERO_BASE_MS = 1800;
const NAME_FADE_BASE_MS = 900;
const OCCASION_BASE_MS = 400;
const NOTE_BASE_MS = 800;
const NOTE_CAP_MS = 2400;
const GAP_BASE_MS = 200;
const CARD_STAGGER_BASE_MS = 100;
const CARDS_TEASER_FLOOR_MS = 400;
const REVEAL_CARDS_CAP = 6;

// Typewriter pacing.
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
 * Pure phase planner. Mirrors the BUGS-B17-closed math from packet 14:
 *
 *   nameStart    = heroStart + heroDuration + gap
 *   occasionStart = nameStart + nameDuration + gap
 *   noteStart    = occasionStart + occasionDuration + gap
 *   cardsStart   = noteStart + noteDuration + gap
 *   totalMs      = cardsStart + max(cardStagger * min(cardCount, 6), 400)
 *
 * Adds an explicit `occasion` phase between name and note (skill §2 enhancement).
 * `vibe.motion` is the uniform multiplier on durations and stagger.
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

  // Hero — slow lighting-up, 1.10 → 1.00 zoom, blur out.
  const heroDuration = Math.round(HERO_BASE_MS * scale);
  const heroStart = 0;

  // Name — typewriter for short names, fade for long names.
  const isTypewriter = nameLength > 0 && nameLength <= NAME_TYPEWRITER_MAX_CHARS;
  const nameStyle = isTypewriter ? 'typewriter' : 'fade';
  const msPerChar = Math.round(NAME_TYPEWRITER_MS_PER_CHAR * scale);
  const nameDuration = isTypewriter
    ? Math.max(msPerChar * nameLength, Math.round(450 * scale))
    : Math.round(NAME_FADE_BASE_MS * scale);
  const nameStart = heroStart + heroDuration + gap;

  // Occasion — short fade-up subtitle, only if present.
  const occasionVisible = hasOccasion;
  const occasionDuration = occasionVisible
    ? Math.round(OCCASION_BASE_MS * scale)
    : 0;
  const occasionStart = nameStart + nameDuration + gap;

  // Note — word-by-word for short notes, line-batched for long.
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

  // Cards — dealt-in stagger. Cap visible-in-reveal at 6 per skill §8.12.
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
 * Split a free-form string into "words" for the word-by-word reveal. We preserve
 * leading whitespace within each token so the rendered text reads the same as the
 * source string when the spans are joined. Empty tokens are dropped.
 */
export function tokenizeWords(text: string): string[] {
  if (!text) return [];
  // Match word + trailing whitespace. The final word in a string may lack trailing space.
  const re = /\S+\s*/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push(m[0]);
  }
  return out;
}

/**
 * Determine the current phase for a given elapsed time. Used by both the React
 * scheduler and the snapshot test; centralising avoids drift.
 */
export function phaseAtElapsed(plan: PhasePlan, elapsedMs: number): RevealPhase {
  if (elapsedMs >= plan.totalMs) return 'done';
  if (elapsedMs >= plan.cards.startMs) return 'cards';
  if (plan.note.visible && elapsedMs >= plan.note.startMs) return 'note';
  if (plan.occasion.visible && elapsedMs >= plan.occasion.startMs)
    return 'occasion';
  if (elapsedMs >= plan.name.startMs) return 'name';
  return 'hero';
}
