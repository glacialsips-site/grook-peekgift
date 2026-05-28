/**
 * The opening note of every peek.
 *
 * The vibe engine evolves the page as the curator chats — hero palette,
 * note tone, card mix all feed back into `peek.vibe`. Until that happens,
 * the page has to stand on its own. A neutral / dim default = "SaaS dashboard
 * with a few cards in it." A vivid, opinionated default = "this is a gift,
 * something happens here."
 *
 * Locked dials for the brand-new-peek state:
 *
 *   - Palette: warm cream bg, deep indigo ink, saffron accent + terracotta
 *     accent2. Reads as "stationery / craft paper / hand-lettered card,"
 *     NOT "lavender SaaS." Carries high contrast (ink-on-cream clears WCAG
 *     AA at every weight) so the page is legible before any content lands.
 *   - Typography: serif display (Fraunces) + sans body (Inter). Editorial
 *     by default — most peeks are sentimental and serif sets that register.
 *     Whimsical / unhinged peeks override to display/script as they evolve.
 *   - Density: breathable. New peeks have nothing in them; tight density
 *     would emphasize the emptiness. Breathable lets a single hero block
 *     hold the whole frame.
 *   - Shape: soft (16px). "Organic, slightly rounded" — pillowy reads as
 *     kids/birthday-cake (a specific choice, not a default), sharp reads as
 *     editorial-funeral. Soft is the right middle.
 *   - Mood: rich. Closest legal mapping for "warm-curiosity" — emits the
 *     grain + overlay treatment, giving the surface a tactile baseline.
 *   - Motion: soft. Standard 1.0x scale.
 *
 * Once the vibe engine evolves the page (`signal_source_history` length > 0)
 * the default is just a starting point; downstream signals overwrite each
 * dial freely.
 */

import type { Vibe, VibeCore } from '@/db/schema/peeks';

export const DEFAULT_VIBE: Vibe = {
  tone: 'warm-curiosity',
  palette: {
    bg: '#FBF6E9',
    surface: '#F4ECDB',
    ink: '#1B1A3D',
    accent: '#E8A93C',
    accent2: '#C75D3A',
  },
  mood_words: ['warm', 'curious', 'crafted', 'personal', 'considered'],
  motion: 'soft',
  font_pairing: { display: 'Fraunces', body: 'Inter' },
  typography: { heading: 'serif', body: 'sans' },
  density: 'breathable',
  shape: 'soft',
  mood: 'rich',
};

/**
 * Fill in any missing dials on a partial vibe with the DEFAULT_VIBE values.
 * Existing dials on the partial are preserved verbatim — `applyDefaultVibe`
 * never overwrites curator/system signals, it only fills holes.
 *
 * Use this on the brand-new-peek insert path and anywhere a peek is loaded
 * from a source that may have dropped optional dials (legacy rows, partial
 * patches from older clients).
 *
 * `signal_source_history` is preserved as-is; the defaults are NOT recorded
 * as a signal entry because they're not a curator/system observation — they
 * are the baseline the engine evolves AWAY from.
 */
export function applyDefaultVibe(partial: Partial<Vibe> | null | undefined): Vibe {
  const input: Partial<Vibe> = partial ?? {};
  const palette = input.palette ?? DEFAULT_VIBE.palette;
  const fontPairing = input.font_pairing ?? DEFAULT_VIBE.font_pairing;
  const typography = input.typography ?? DEFAULT_VIBE.typography;

  const merged: Vibe = {
    tone: input.tone ?? DEFAULT_VIBE.tone,
    palette,
    mood_words:
      input.mood_words && input.mood_words.length > 0
        ? input.mood_words
        : DEFAULT_VIBE.mood_words,
    motion: input.motion ?? DEFAULT_VIBE.motion,
    font_pairing: fontPairing,
    typography,
    density: input.density ?? DEFAULT_VIBE.density,
    shape: input.shape ?? DEFAULT_VIBE.shape,
    mood: input.mood ?? DEFAULT_VIBE.mood,
  };

  if (input.preset !== undefined) merged.preset = input.preset;
  else if (DEFAULT_VIBE.preset !== undefined) merged.preset = DEFAULT_VIBE.preset;

  if (input.voice !== undefined) merged.voice = input.voice;
  else if (DEFAULT_VIBE.voice !== undefined) merged.voice = DEFAULT_VIBE.voice;

  if (input.signal_source_history) {
    merged.signal_source_history = input.signal_source_history;
  }

  return merged;
}

/**
 * True when the vibe has not been evolved away from `DEFAULT_VIBE`. The vibe
 * engine appends a `signal_source_history` entry on every patch — an empty
 * (or absent) history means no curator/system signal has fired yet.
 *
 * Useful for callsites that want to show the teaching/empty surface for
 * an "untouched" peek rather than the live preview.
 */
export function isDefaultVibe(vibe: Vibe | null | undefined): boolean {
  if (!vibe) return true;
  const history = vibe.signal_source_history ?? [];
  return history.length === 0;
}

/**
 * Build a minimally-typed VibeCore patch from a subset of dials. Convenience
 * for tests and seed scripts that need to spell out a non-default vibe
 * without restating every optional field.
 */
export function makeVibe(overrides: Partial<VibeCore>): Vibe {
  return applyDefaultVibe(overrides);
}
