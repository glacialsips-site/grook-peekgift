// Per-turn extended-thinking flag, sessionId-keyed. Set when the model calls
// request_extended_thinking; consumed (and cleared) on the next chat iteration
// to flip `thinking: { enabled }` for that one messages.create.
//
// In-memory, single-instance. On multi-instance Netlify the SSE stream is not
// guaranteed to stick to the instance that set the flag, so consume can miss;
// promote to Upstash if that bites in practice.

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

export function requestExtendedThinking(sessionId: string): void {
  const now = Date.now();
  sweep(now);
  FLAGS.set(sessionId, { expiresAt: now + FLAG_TTL_MS });
}

export function consumeExtendedThinking(sessionId: string): boolean {
  const now = Date.now();
  sweep(now);
  const entry = FLAGS.get(sessionId);
  if (!entry) return false;
  FLAGS.delete(sessionId);
  // Re-check expiry to close the race window between sweep() and get().
  return entry.expiresAt > now;
}

export function _resetExtendedThinkingFlags(): void {
  FLAGS.clear();
}
