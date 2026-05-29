/**
 * Dependency-free, edge-safe (Deno / Node ≥19 / browser) monotonic ULID.
 *
 * WHY hand-rolled and not the `ulid` npm package: the mutation log is written
 * from the Netlify Edge chat route; the only entropy primitive guaranteed there
 * is Web Crypto (`globalThis.crypto.getRandomValues`) — the same primitive the
 * working chat route already relies on. A 26-char Crockford-base32 ULID sorts
 * lexicographically by time, which is exactly the order the `peek_emitted_idx`
 * and the depth-layer diff-mark pane want.
 */

// Crockford base32, ascending — excludes I, L, O, U. Index order == ASCII order,
// so lexical string sort of ULIDs equals chronological order.
const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ENCODING_LEN = 32;
const TIME_LEN = 10;
const RANDOM_LEN = 16;

function getRandomValues(buf: Uint8Array): Uint8Array {
  const c = globalThis.crypto;
  if (!c || typeof c.getRandomValues !== 'function') {
    throw new Error('ulid: Web Crypto getRandomValues unavailable');
  }
  return c.getRandomValues(buf);
}

function encodeTime(time: number, len: number): string {
  if (!Number.isFinite(time) || time < 0) {
    throw new Error('ulid: invalid time');
  }
  let out = '';
  for (let i = len - 1; i >= 0; i--) {
    const mod = time % ENCODING_LEN;
    out = ENCODING[mod] + out;
    time = (time - mod) / ENCODING_LEN;
  }
  return out;
}

function encodeRandom(len: number): string {
  // 256 % 32 === 0, so byte % 32 is perfectly uniform — no modulo bias.
  const bytes = getRandomValues(new Uint8Array(len));
  let out = '';
  for (let i = 0; i < len; i++) out += ENCODING[bytes[i]! % ENCODING_LEN];
  return out;
}

function incrementBase32(str: string): string {
  const chars = str.split('');
  for (let i = chars.length - 1; i >= 0; i--) {
    const idx = ENCODING.indexOf(chars[i]!);
    if (idx < ENCODING_LEN - 1) {
      chars[i] = ENCODING[idx + 1]!;
      return chars.join('');
    }
    chars[i] = ENCODING[0]!; // carry
  }
  // 80 bits exhausted within one millisecond — practically impossible.
  throw new Error('ulid: random component overflow');
}

let lastTime = -1;
let lastRandom = '';

/**
 * Generate a monotonic 26-char ULID. Two calls within the same millisecond are
 * still strictly increasing (random component is incremented), so mutations
 * emitted back-to-back in a single turn keep their order.
 */
export function ulid(seedTime?: number): string {
  const now = seedTime ?? Date.now();
  if (now <= lastTime) {
    lastRandom = incrementBase32(lastRandom);
    return encodeTime(lastTime, TIME_LEN) + lastRandom;
  }
  lastTime = now;
  lastRandom = encodeRandom(RANDOM_LEN);
  return encodeTime(now, TIME_LEN) + lastRandom;
}

/**
 * Generate a NON-monotonic ULID encoding exactly `time` with fresh randomness
 * and zero shared state. Use for backfill/replay (a known historical emit time)
 * and for deterministic tests; `decodeTime(ulidAt(t)) === t`. Production should
 * call `ulid()` instead, which is monotonic.
 */
export function ulidAt(time: number): string {
  return encodeTime(time, TIME_LEN) + encodeRandom(RANDOM_LEN);
}

/** Decode the millisecond timestamp out of a ULID (the first 10 chars). */
export function decodeTime(id: string): number {
  if (id.length !== TIME_LEN + RANDOM_LEN) {
    throw new Error('ulid: malformed id');
  }
  let time = 0;
  for (let i = 0; i < TIME_LEN; i++) {
    const idx = ENCODING.indexOf(id[i]!);
    if (idx === -1) throw new Error('ulid: invalid character');
    time = time * ENCODING_LEN + idx;
  }
  return time;
}
