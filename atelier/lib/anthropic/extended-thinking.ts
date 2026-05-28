interface FlagEntry {
  expiresAt: number;
}

const FLAGS = new Map<string, FlagEntry>();
const FLAG_TTL_MS = 60_000;

function sweep(now: number): void {
  for (const [key, entry] of FLAGS) {
    if (entry.expiresAt <= now) {
      FLAGS.delete(key);
    }
  }
}

function flagKey(sessionId: string, turnId?: string): string {
  return turnId ? `${sessionId}:${turnId}` : sessionId;
}

export function requestExtendedThinking(sessionId: string, turnId?: string): void {
  const now = Date.now();
  sweep(now);
  FLAGS.set(flagKey(sessionId, turnId), { expiresAt: now + FLAG_TTL_MS });
}

export function consumeExtendedThinking(sessionId: string, turnId?: string): boolean {
  const now = Date.now();
  sweep(now);
  const key = flagKey(sessionId, turnId);
  const entry = FLAGS.get(key);
  if (!entry) return false;
  FLAGS.delete(key);
  return entry.expiresAt > now;
}

export function _resetExtendedThinkingFlags(): void {
  FLAGS.clear();
}
