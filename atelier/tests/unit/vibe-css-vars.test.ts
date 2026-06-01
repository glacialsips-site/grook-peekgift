import { describe, expect, it } from 'vitest';
import { motionScale, paletteValueAsHslTriple, vibeCss } from '@/lib/vibe/css-vars';
import type { Vibe } from '@/db/schema/peeks';

const princessBday: Vibe = {
  palette: {
    bg: '#FFE5F0',
    surface: '#FFF0F6',
    ink: '#3D1A2E',
    accent: '#FF6BAF',
    accent2: '#FFD166',
  },
  typography: { heading: 'display', body: 'sans' },
  density: 'compact',
  shape: 'pillowy',
  mood: 'whimsical',
  motion: 'lively',
};

const bachelorette: Vibe = {
  palette: {
    bg: '#0A0A0F',
    surface: '#1A0A1F',
    ink: '#FFFFFF',
    accent: '#FF1F8F',
    accent2: '#9D4EDD',
  },
  typography: { heading: 'display', body: 'sans' },
  density: 'compact',
  shape: 'sharp',
  mood: 'rich',
  motion: 'lively',
};

const wedding: Vibe = {
  palette: {
    bg: '#F8F4EE',
    surface: '#FFFFFF',
    ink: '#2C2418',
    accent: '#9C7A50',
    accent2: '#C7A87A',
  },
  typography: { heading: 'serif', body: 'serif' },
  density: 'breathable',
  shape: 'soft',
  mood: 'rich',
  motion: 'soft',
};

describe('paletteValueAsHslTriple', () => {
  it('converts a 6-digit hex to an HSL triple', () => {
    const out = paletteValueAsHslTriple('#FF6BAF');
    expect(out).toMatch(/^\d+ \d+% \d+%$/);
  });

  it('passes through an existing HSL triple unchanged', () => {
    expect(paletteValueAsHslTriple('24 95% 53%')).toBe('24 95% 53%');
  });

  it('returns undefined for empty or invalid input', () => {
    expect(paletteValueAsHslTriple('')).toBeUndefined();
    expect(paletteValueAsHslTriple(undefined)).toBeUndefined();
    expect(paletteValueAsHslTriple('#zzz')).toBeUndefined();
  });

  it('handles 3-digit shorthand hex', () => {
    expect(paletteValueAsHslTriple('#fff')).toBe('0 0% 100%');
  });
});

describe('motionScale', () => {
  it('maps motion dial to numeric multipliers', () => {
    expect(motionScale('still')).toBe(0.6);
    expect(motionScale('soft')).toBe(1);
    expect(motionScale('lively')).toBe(1.25);
    expect(motionScale(undefined)).toBe(1);
  });
});

describe('vibeCss', () => {
  it('returns an empty object for null/undefined vibes', () => {
    expect(vibeCss(null)).toEqual({});
    expect(vibeCss(undefined)).toEqual({});
  });

  it('emits both --peek-* and --vibe-* aliases for palette', () => {
    const out = vibeCss(princessBday);
    expect(out['--peek-bg']).toBeDefined();
    expect(out['--vibe-bg']).toBe(out['--peek-bg']);
    expect(out['--peek-ink']).toBeDefined();
    expect(out['--vibe-ink']).toBe(out['--peek-ink']);
    expect(out['--peek-accent']).toBeDefined();
    expect(out['--vibe-accent']).toBe(out['--peek-accent']);
  });

  it('emits all 7 dial outputs when fully specified', () => {
    const out = vibeCss(princessBday);
    // Palette
    expect(out['--vibe-bg']).toBeTruthy();
    expect(out['--vibe-ink']).toBeTruthy();
    expect(out['--vibe-accent']).toBeTruthy();
    expect(out['--vibe-muted']).toBeTruthy();
    // Typography
    expect(out['--vibe-type-display']).toBeTruthy();
    expect(out['--vibe-type-body']).toBeTruthy();
    expect(out['--vibe-type-mono']).toBeTruthy();
    // Density
    expect(out['--vibe-space-base']).toBeTruthy();
    expect(out['--vibe-space-gap']).toBeTruthy();
    // Shape
    expect(out['--vibe-radius-card']).toBeTruthy();
    expect(out['--vibe-radius-button']).toBeTruthy();
    // Motion
    expect(out['--vibe-motion-scale']).toBeTruthy();
  });

  it('produces visually distinct outputs for princess vs bachelorette vs wedding', () => {
    const p = vibeCss(princessBday);
    const b = vibeCss(bachelorette);
    const w = vibeCss(wedding);

    // Palettes must differ
    expect(p['--peek-bg']).not.toBe(b['--peek-bg']);
    expect(p['--peek-bg']).not.toBe(w['--peek-bg']);
    expect(b['--peek-bg']).not.toBe(w['--peek-bg']);
    expect(p['--peek-accent']).not.toBe(b['--peek-accent']);

    // Typography must differ between display+sans and serif+serif
    expect(p['--peek-font-heading']).not.toBe(w['--peek-font-heading']);
    expect(p['--peek-font-body']).not.toBe(w['--peek-font-body']);

    // Density must differ between compact and breathable
    expect(p['--vibe-space-base']).not.toBe(w['--vibe-space-base']);
    expect(p['--peek-space-8']).not.toBe(w['--peek-space-8']);

    // Shape must differ between pillowy/sharp/soft
    expect(p['--peek-radius']).not.toBe(b['--peek-radius']);
    expect(p['--peek-radius']).not.toBe(w['--peek-radius']);
    expect(b['--peek-radius']).not.toBe(w['--peek-radius']);

    // Motion must differ between lively and soft
    expect(p['--vibe-motion-scale']).not.toBe(w['--vibe-motion-scale']);
  });

  it('princess-bday emits pillowy radius (32px) and compact spacing', () => {
    const out = vibeCss(princessBday);
    expect(out['--vibe-radius-card']).toBe('32px');
    expect(out['--vibe-space-gap']).toBe('0.6');
  });

  it('bachelorette emits sharp radius (4px) and lively motion (1.25x)', () => {
    const out = vibeCss(bachelorette);
    expect(out['--vibe-radius-card']).toBe('4px');
    expect(out['--vibe-motion-scale']).toBe('1.25');
  });

  it('wedding emits soft radius (16px), breathable spacing, soft motion', () => {
    const out = vibeCss(wedding);
    expect(out['--vibe-radius-card']).toBe('16px');
    expect(out['--vibe-space-gap']).toBe('1.5');
    expect(out['--vibe-motion-scale']).toBe('1');
  });

  it('still leaves --vibe-* outputs absent when dials are missing', () => {
    const out = vibeCss({ tone: 'warm' });
    expect(out['--vibe-bg']).toBeUndefined();
    expect(out['--vibe-radius-card']).toBeUndefined();
    expect(out['--vibe-motion-scale']).toBeUndefined();
  });

  it('honours explicit font_pairing over the typography category', () => {
    const out = vibeCss({
      ...wedding,
      font_pairing: { display: 'Cormorant Garamond', body: 'Lora' },
    });
    expect(out['--peek-font-heading']).toContain('Cormorant Garamond');
    expect(out['--peek-font-body']).toContain('Lora');
    expect(out['--vibe-type-display']).toContain('Cormorant Garamond');
  });

  it('accepts legacy HSL-triple palette format alongside hex', () => {
    const out = vibeCss({
      palette: {
        bg: '0 0% 100%',
        surface: '#FAFAFA',
        ink: '240 10% 4%',
        accent: '#FF0080',
      },
    });
    expect(out['--peek-bg']).toBe('0 0% 100%');
    expect(out['--peek-ink']).toBe('240 10% 4%');
    expect(out['--peek-surface']).toMatch(/^\d+ \d+% \d+%$/);
    expect(out['--peek-accent']).toMatch(/^\d+ \d+% \d+%$/);
  });
});
