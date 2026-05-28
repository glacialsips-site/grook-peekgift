import type { Vibe } from './types';

export const VIBE_PRESETS: Record<string, Vibe> = {
  playful: {
    tone: 'playful',
    palette: { bg: '#fffaf2', surface: '#ffffff', ink: '#1a1a1a', accent: '#ff5a3c', accent2: '#ffd23f' },
    mood_words: ['silly', 'warm', 'bright'],
    motion: 'lively',
    font_pairing: { display: 'Fraunces', body: 'Inter' }
  },
  romantic: {
    tone: 'romantic',
    palette: { bg: '#0f0a14', surface: '#1b1320', ink: '#f5e6f0', accent: '#e0577a', accent2: '#7c4a8c' },
    mood_words: ['tender', 'late', 'quiet'],
    motion: 'soft',
    font_pairing: { display: 'Fraunces', body: 'Inter' }
  },
  dry: {
    tone: 'dry',
    palette: { bg: '#f4f3ee', surface: '#ffffff', ink: '#15161a', accent: '#2b2b2b', accent2: '#9c9b94' },
    mood_words: ['deadpan', 'precise', 'minimal'],
    motion: 'still',
    font_pairing: { display: 'Fraunces', body: 'Inter' }
  },
  unhinged: {
    tone: 'unhinged',
    palette: { bg: '#0a0a0a', surface: '#141414', ink: '#f0f0f0', accent: '#39ff14', accent2: '#ff00aa' },
    mood_words: ['feral', 'chaotic', 'loud'],
    motion: 'lively',
    font_pairing: { display: 'Fraunces', body: 'Inter' }
  },
  tender: {
    tone: 'tender',
    palette: { bg: '#f7f1ec', surface: '#ffffff', ink: '#2a241f', accent: '#c08552', accent2: '#dab785' },
    mood_words: ['warm', 'soft', 'home'],
    motion: 'soft',
    font_pairing: { display: 'Fraunces', body: 'Inter' }
  }
};

export const DEFAULT_VIBE: Vibe = VIBE_PRESETS.playful;

export function vibeToCssVars(vibe: Vibe | undefined): React.CSSProperties {
  const v = vibe?.palette ? vibe : DEFAULT_VIBE;
  const p = v.palette!;
  return {
    ['--peek-bg' as any]: p.bg,
    ['--peek-surface' as any]: p.surface,
    ['--peek-ink' as any]: p.ink,
    ['--peek-accent' as any]: p.accent,
    ['--peek-accent-2' as any]: p.accent2 || p.accent
  };
}
