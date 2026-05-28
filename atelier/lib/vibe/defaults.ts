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

export function isDefaultVibe(vibe: Vibe | null | undefined): boolean {
  if (!vibe) return true;
  const history = vibe.signal_source_history ?? [];
  return history.length === 0;
}

export function makeVibe(overrides: Partial<VibeCore>): Vibe {
  return applyDefaultVibe(overrides);
}
