// Per-turn extended-thinking flag. The model calls `request_extended_thinking`
// in iteration N; this sets a flag keyed by sessionId. The chat loop reads
// + clears the flag at the top of iteration N+1, flipping `thinking: { enabled }`
// on the messages.create call for that single iteration.
//
// In-memory Map is fine because chatTurn runs entirely server-side for the
// lifetime of one SSE stream — single Node process, single event loop.
// Process boundaries reset the flag, which is the desired behavior (no
// stale thinking budgets carry across cold starts).

const FLAGS = new Map<string, true>();

export function requestExtendedThinking(sessionId: string): void {
  FLAGS.set(sessionId, true);
}

export function consumeExtendedThinking(sessionId: string): boolean {
  if (FLAGS.has(sessionId)) {
    FLAGS.delete(sessionId);
    return true;
  }
  return false;
}
