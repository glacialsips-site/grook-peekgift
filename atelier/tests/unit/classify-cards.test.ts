import { describe, expect, it } from 'vitest';
import { classifyCards, type CardSignal } from '@/lib/vibe/classify-cards';

describe('classifyCards', () => {
  it('returns an empty patch for an empty array', () => {
    expect(classifyCards([])).toEqual({});
  });

  it('returns lively motion when at least 30% of cards are taunts', () => {
    const cards: CardSignal[] = [
      { type: 'gift', is_taunt: true },
      { type: 'gift', is_taunt: true },
      { type: 'gift', is_taunt: false },
      { type: 'gift', is_taunt: false },
      { type: 'gift', is_taunt: false },
    ];
    const patch = classifyCards(cards);
    expect(patch.motion).toBe('lively');
  });

  it('returns soft motion when at least 40% of cards are activities and no high taunt ratio', () => {
    const cards: CardSignal[] = [
      { type: 'activity', is_taunt: false },
      { type: 'activity', is_taunt: false },
      { type: 'gift', is_taunt: false },
      { type: 'gift', is_taunt: false },
      { type: 'gift', is_taunt: false },
    ];
    const patch = classifyCards(cards);
    expect(patch.motion).toBe('soft');
  });

  it('returns still motion when >=50% are aspirational', () => {
    const cards: CardSignal[] = [
      { type: 'aspirational', is_taunt: false },
      { type: 'aspirational', is_taunt: false },
      { type: 'aspirational', is_taunt: false },
      { type: 'gift', is_taunt: false },
      { type: 'gift', is_taunt: false },
    ];
    const patch = classifyCards(cards);
    expect(patch.motion).toBe('still');
  });

  it('returns an empty patch when no threshold is met', () => {
    const cards: CardSignal[] = [
      { type: 'gift', is_taunt: false },
      { type: 'experience', is_taunt: false },
      { type: 'gift', is_taunt: false },
    ];
    const patch = classifyCards(cards);
    expect(patch).toEqual({});
  });

  it('prefers taunt classification over activity when both thresholds are met', () => {
    const cards: CardSignal[] = [
      { type: 'activity', is_taunt: true },
      { type: 'activity', is_taunt: true },
      { type: 'activity', is_taunt: false },
      { type: 'activity', is_taunt: false },
      { type: 'gift', is_taunt: false },
    ];
    const patch = classifyCards(cards);
    expect(patch.motion).toBe('lively');
  });

  it('classifies all-taunt as lively', () => {
    const cards: CardSignal[] = [
      { type: 'gift', is_taunt: true },
      { type: 'gift', is_taunt: true },
      { type: 'gift', is_taunt: true },
    ];
    expect(classifyCards(cards).motion).toBe('lively');
  });

  it('classifies all-activity as soft', () => {
    const cards: CardSignal[] = [
      { type: 'activity', is_taunt: false },
      { type: 'activity', is_taunt: false },
      { type: 'activity', is_taunt: false },
    ];
    expect(classifyCards(cards).motion).toBe('soft');
  });
});
