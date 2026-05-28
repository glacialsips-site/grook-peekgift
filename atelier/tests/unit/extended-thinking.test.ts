import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  consumeExtendedThinking,
  requestExtendedThinking,
  _resetExtendedThinkingFlags,
} from '@/lib/anthropic/extended-thinking';

describe('extended-thinking flag (W07 from BUGS-WAVE2)', () => {
  beforeEach(() => {
    _resetExtendedThinkingFlags();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false when no flag is set', () => {
    expect(consumeExtendedThinking('sess-1')).toBe(false);
  });

  it('returns true exactly once after request', () => {
    requestExtendedThinking('sess-2');
    expect(consumeExtendedThinking('sess-2')).toBe(true);
    expect(consumeExtendedThinking('sess-2')).toBe(false);
  });

  it('isolates flags per sessionId', () => {
    requestExtendedThinking('sess-3');
    expect(consumeExtendedThinking('sess-4')).toBe(false);
    expect(consumeExtendedThinking('sess-3')).toBe(true);
  });

  it('evicts the flag after the TTL window (sweep on access)', () => {
    requestExtendedThinking('sess-leak');
    vi.advanceTimersByTime(61_000);
    expect(consumeExtendedThinking('sess-leak')).toBe(false);
  });

  it('does NOT evict a fresh flag before TTL expires', () => {
    requestExtendedThinking('sess-fresh');
    vi.advanceTimersByTime(30_000);
    expect(consumeExtendedThinking('sess-fresh')).toBe(true);
  });

  it('sweeps stale flags from OTHER sessions on a new request', () => {
    requestExtendedThinking('sess-stale');
    vi.advanceTimersByTime(61_000);
    requestExtendedThinking('sess-other');
    expect(consumeExtendedThinking('sess-stale')).toBe(false);
    expect(consumeExtendedThinking('sess-other')).toBe(true);
  });
});
