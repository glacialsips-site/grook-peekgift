// Per-turn extended-thinking flag. The model calls `request_extended_thinking`
// in iteration N; this sets a flag keyed by sessionId. The chat loop reads
// + clears the flag at the top of iteration N+1, flipping `thinking: { enabled }`
// on the messages.create call for that single iteration.
//
// W07 from BUGS-WAVE2: the flag was a bare `Map<sessionId, true>` with delete
// only on `consume`. Sessions that requested ext-thinking but never consumed
// (abort mid-stream, upstream error, network failure) leaked forever. The
// leak is small (one boolean per session) but unbounded in long-lived Node
// processes.
//
// Fix: each flag carries an expiry timestamp; a sweep on every access drops
// stale entries. TTL is short (60s) — the flag is supposed to be consumed
// on the NEXT iteration of the same SSE stream, always within seconds.
// Multi-instance Netlify is a known caveat: if the SSE stream sticks to a
// different instance, the flag never consumes regardless of TTL (sticky-
// session not guaranteed). Move to Upstash if that actually bites — out of
// Wave 2 scope.

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
  // Defense-in-depth: sweep above already deleted expired entries, but a
  // double-check guards the few microseconds between sweep and get.
  return entry.expiresAt > now;
}

// Testing hook — call between unit tests to reset state.
export function _resetExtendedThinkingFlags(): void {
  FLAGS.clear();
}
