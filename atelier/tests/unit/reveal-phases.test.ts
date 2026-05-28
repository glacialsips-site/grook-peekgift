import { describe, expect, it } from 'vitest';
import {
  MOTION_SCALE,
  REVEAL_PHASES,
  phaseAtElapsed,
  planPhases,
  tokenizeWords,
} from '@/lib/reveal/phases';

/**
 * Magazine-cover-opening reveal — snapshot tests for the phase choreography.
 *
 * The reveal component schedules React state transitions against a pure
 * `PhasePlan`. These tests cover:
 *
 *  - the canonical phase ordering (hero → name → occasion → note → cards → done)
 *  - three snapshot reveal moments for one representative peek vibe (princess-bday
 *    soft, with note + occasion + 6 cards): initial, mid-reveal, post-reveal
 *  - vibe.motion uniformly multiplies durations (still 0.6x, soft 1x, lively 1.25x)
 *  - graceful degradation when inputs are missing (no note, no occasion, no cards)
 *  - long-name / long-note branching (typewriter vs fade; word vs line)
 *  - visibility-pause math (`phaseAtElapsed` resuming mid-phase)
 *
 * No DOM, no renderer — the phase math is the contract.
 */

describe('reveal phases — canonical ordering', () => {
  it('exposes the phase order in REVEAL_PHASES', () => {
    expect(REVEAL_PHASES).toEqual([
      'hero',
      'name',
      'occasion',
      'note',
      'cards',
      'done',
    ]);
  });

  it('produces strictly monotonic phase start times', () => {
    const plan = planPhases({
      motion: 'soft',
      hasNote: true,
      noteWordCount: 12,
      nameLength: 6,
      hasOccasion: true,
      cardCount: 6,
    });
    expect(plan.hero.startMs).toBeLessThan(plan.name.startMs);
    expect(plan.name.startMs).toBeLessThan(plan.occasion.startMs);
    expect(plan.occasion.startMs).toBeLessThan(plan.note.startMs);
    expect(plan.note.startMs).toBeLessThan(plan.cards.startMs);
    expect(plan.cards.startMs).toBeLessThan(plan.totalMs);
  });
});

describe('reveal phases — vibe.motion uniform scaling', () => {
  const baseInput = {
    hasNote: true as const,
    noteWordCount: 14,
    nameLength: 8,
    hasOccasion: true as const,
    cardCount: 6,
  };

  it('maps still / soft / lively to documented multipliers', () => {
    expect(MOTION_SCALE.still).toBe(0.6);
    expect(MOTION_SCALE.soft).toBe(1);
    expect(MOTION_SCALE.lively).toBe(1.25);
  });

  it('still motion is shorter total than soft, lively is longer', () => {
    const still = planPhases({ ...baseInput, motion: 'still' });
    const soft = planPhases({ ...baseInput, motion: 'soft' });
    const lively = planPhases({ ...baseInput, motion: 'lively' });
    expect(still.totalMs).toBeLessThan(soft.totalMs);
    expect(soft.totalMs).toBeLessThan(lively.totalMs);
  });

  it('exposes the scale on the plan output', () => {
    expect(planPhases({ ...baseInput, motion: 'still' }).scale).toBe(0.6);
    expect(planPhases({ ...baseInput, motion: 'soft' }).scale).toBe(1);
    expect(planPhases({ ...baseInput, motion: 'lively' }).scale).toBe(1.25);
  });
});

describe('reveal phases — name choreography branches', () => {
  it('short names (≤20 chars) typewriter at ~50ms/char soft', () => {
    const plan = planPhases({
      motion: 'soft',
      hasNote: false,
      noteWordCount: 0,
      nameLength: 5,
      hasOccasion: false,
      cardCount: 0,
    });
    expect(plan.name.style).toBe('typewriter');
    expect(plan.name.msPerChar).toBe(50);
  });

  it('long names (>20 chars) fall back to fade-up', () => {
    const plan = planPhases({
      motion: 'soft',
      hasNote: false,
      noteWordCount: 0,
      nameLength: 32,
      hasOccasion: false,
      cardCount: 0,
    });
    expect(plan.name.style).toBe('fade');
  });

  it('msPerChar scales with vibe.motion', () => {
    const still = planPhases({
      motion: 'still',
      hasNote: false,
      noteWordCount: 0,
      nameLength: 5,
      hasOccasion: false,
      cardCount: 0,
    });
    const lively = planPhases({
      motion: 'lively',
      hasNote: false,
      noteWordCount: 0,
      nameLength: 5,
      hasOccasion: false,
      cardCount: 0,
    });
    expect(still.name.msPerChar).toBeLessThan(lively.name.msPerChar);
  });
});

describe('reveal phases — note choreography branches', () => {
  it('short notes word-by-word', () => {
    const plan = planPhases({
      motion: 'soft',
      hasNote: true,
      noteWordCount: 12,
      nameLength: 6,
      hasOccasion: false,
      cardCount: 0,
    });
    expect(plan.note.style).toBe('word');
    expect(plan.note.visible).toBe(true);
  });

  it('long notes (>50 words) batch into lines', () => {
    const plan = planPhases({
      motion: 'soft',
      hasNote: true,
      noteWordCount: 80,
      nameLength: 6,
      hasOccasion: false,
      cardCount: 0,
    });
    expect(plan.note.style).toBe('line');
    expect(plan.note.visible).toBe(true);
  });

  it('caps note duration at 2400ms × scale', () => {
    const plan = planPhases({
      motion: 'soft',
      hasNote: true,
      noteWordCount: 300, // forces line-batch + would exceed cap
      nameLength: 6,
      hasOccasion: false,
      cardCount: 0,
    });
    expect(plan.note.durationMs).toBeLessThanOrEqual(2400);
  });
});

describe('reveal phases — graceful degradation', () => {
  it('hidden occasion skips occasion phase but still cascades note + cards', () => {
    const plan = planPhases({
      motion: 'soft',
      hasNote: true,
      noteWordCount: 10,
      nameLength: 6,
      hasOccasion: false,
      cardCount: 3,
    });
    expect(plan.occasion.visible).toBe(false);
    expect(plan.occasion.durationMs).toBe(0);
    // Note starts at occasionStart since occasion is zero-duration.
    expect(plan.note.startMs).toBe(plan.occasion.startMs);
    expect(plan.note.visible).toBe(true);
  });

  it('hidden note collapses to cards immediately after occasion', () => {
    const plan = planPhases({
      motion: 'soft',
      hasNote: false,
      noteWordCount: 0,
      nameLength: 6,
      hasOccasion: true,
      cardCount: 3,
    });
    expect(plan.note.visible).toBe(false);
    expect(plan.note.durationMs).toBe(0);
    // Cards start at noteStart since note is zero-duration.
    expect(plan.cards.startMs).toBe(plan.note.startMs);
  });

  it('zero cards still produces a cards-phase floor', () => {
    const plan = planPhases({
      motion: 'soft',
      hasNote: true,
      noteWordCount: 5,
      nameLength: 4,
      hasOccasion: true,
      cardCount: 0,
    });
    expect(plan.cards.visibleCount).toBe(0);
    expect(plan.cards.durationMs).toBeGreaterThanOrEqual(400);
    expect(plan.totalMs).toBeGreaterThan(plan.cards.startMs);
  });

  it('caps the cards teaser at 6 even if 8 cards exist', () => {
    const plan = planPhases({
      motion: 'soft',
      hasNote: false,
      noteWordCount: 0,
      nameLength: 4,
      hasOccasion: false,
      cardCount: 8,
    });
    expect(plan.cards.visibleCount).toBe(6);
  });
});

describe('reveal phases — snapshot for princess-bday soft (12 words, 6 cards)', () => {
  // Representative peek vibe: princess-bday soft would actually be 'lively',
  // but the prompt specifically asks for one peek vibe and the canonical math
  // is the soft 1x case. Snapshot covers initial, mid-reveal, post-reveal.
  const plan = planPhases({
    motion: 'soft',
    hasNote: true,
    noteWordCount: 12,
    nameLength: 8, // "Penelope"
    hasOccasion: true,
    cardCount: 6,
  });

  it('plan snapshot is stable', () => {
    expect(plan).toMatchInlineSnapshot(`
      {
        "cards": {
          "durationMs": 600,
          "staggerMs": 100,
          "startMs": 4410,
          "visibleCount": 6,
        },
        "hero": {
          "durationMs": 1800,
          "startMs": 0,
        },
        "name": {
          "durationMs": 450,
          "msPerChar": 50,
          "startMs": 2000,
          "style": "typewriter",
        },
        "note": {
          "durationMs": 960,
          "perStepMs": 80,
          "startMs": 3250,
          "style": "word",
          "visible": true,
        },
        "occasion": {
          "durationMs": 400,
          "startMs": 2650,
          "visible": true,
        },
        "scale": 1,
        "totalMs": 5010,
      }
    `);
  });

  it('initial frame (t=0) is hero phase', () => {
    expect(phaseAtElapsed(plan, 0)).toBe('hero');
  });

  it('mid-reveal frame (t=note start + half note) is note phase', () => {
    const mid = plan.note.startMs + Math.floor(plan.note.durationMs / 2);
    expect(phaseAtElapsed(plan, mid)).toBe('note');
  });

  it('post-reveal frame (t=totalMs) is done phase', () => {
    expect(phaseAtElapsed(plan, plan.totalMs)).toBe('done');
    expect(phaseAtElapsed(plan, plan.totalMs + 5000)).toBe('done');
  });

  it('phase boundaries snap to the right phase', () => {
    expect(phaseAtElapsed(plan, plan.name.startMs)).toBe('name');
    expect(phaseAtElapsed(plan, plan.occasion.startMs)).toBe('occasion');
    expect(phaseAtElapsed(plan, plan.note.startMs)).toBe('note');
    expect(phaseAtElapsed(plan, plan.cards.startMs)).toBe('cards');
  });
});

describe('reveal phases — visibility-pause resume math', () => {
  const plan = planPhases({
    motion: 'soft',
    hasNote: true,
    noteWordCount: 10,
    nameLength: 6,
    hasOccasion: true,
    cardCount: 4,
  });

  it('resuming at any elapsed time maps to a valid phase', () => {
    for (let t = 0; t <= plan.totalMs + 500; t += 250) {
      const p = phaseAtElapsed(plan, t);
      expect(REVEAL_PHASES).toContain(p);
    }
  });

  it('resuming past totalMs always reports done', () => {
    expect(phaseAtElapsed(plan, plan.totalMs + 1)).toBe('done');
    expect(phaseAtElapsed(plan, plan.totalMs * 2)).toBe('done');
  });
});

describe('tokenizeWords', () => {
  it('returns an empty array for empty input', () => {
    expect(tokenizeWords('')).toEqual([]);
  });

  it('preserves trailing whitespace within tokens so spans join back to the original', () => {
    const text = 'happy birthday, friend';
    const tokens = tokenizeWords(text);
    expect(tokens.length).toBe(3);
    expect(tokens.join('').trimEnd()).toBe(text);
  });

  it('handles newlines and multi-space gracefully', () => {
    const text = 'we love\nyou  always';
    const tokens = tokenizeWords(text);
    expect(tokens.length).toBe(4);
  });
});
