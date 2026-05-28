import { describe, expect, it } from 'vitest';
import {
  buttonStyle,
  bubbleStyle,
  cardStyle,
  chipStyle,
  inputStyle,
  quickShareTileStyle,
  vibeTokens,
} from '@/lib/vibe/component-styles';
import { vibeCss } from '@/lib/vibe/css-vars';
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

function flatten(record: Record<string, string>): string {
  return Object.entries(record)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
}

describe('component-styles vibe tokens', () => {
  it('emits CSS-var references so consumers stay vibe-aware', () => {
    expect(vibeTokens.accent).toContain('var(--vibe-accent');
    expect(vibeTokens.ink).toContain('var(--vibe-ink');
    expect(vibeTokens.bg).toContain('var(--vibe-bg');
    expect(vibeTokens.radiusCard).toContain('var(--vibe-radius-card');
    expect(vibeTokens.radiusButton).toContain('var(--vibe-radius-button');
    expect(vibeTokens.fontBody).toContain('var(--vibe-type-body');
    expect(vibeTokens.fontDisplay).toContain('var(--vibe-type-display');
  });

  it('button default variant resolves accent color and vibe radius', () => {
    const s = buttonStyle('default', 'default');
    expect(String(s.backgroundColor)).toContain('--vibe-accent');
    expect(String(s.borderRadius)).toContain('--vibe-radius-button');
    expect(String(s.fontFamily)).toContain('--vibe-type-body');
  });

  it('button destructive uses state-error CSS var, not a tailwind class', () => {
    const s = buttonStyle('destructive', 'default');
    expect(String(s.backgroundColor)).toContain('--state-error');
    expect(String(s.color)).toContain('--state-error-ink');
  });

  it('input/card consume vibe tokens', () => {
    expect(String(inputStyle().backgroundColor)).toContain('--vibe-bg');
    expect(String(cardStyle().backgroundColor)).toContain('--vibe-surface');
    expect(String(cardStyle().borderRadius)).toContain('--vibe-radius-card');
    expect(String(quickShareTileStyle().backgroundColor)).toContain(
      '--vibe-surface',
    );
  });

  it('user vs assistant bubble use different palette slots', () => {
    expect(String(bubbleStyle('user').backgroundColor)).toContain('--vibe-accent');
    expect(String(bubbleStyle('assistant').backgroundColor)).toContain('--vibe-muted');
  });

  it('chip active vs inactive switch which CSS-var is referenced', () => {
    const active = chipStyle(true);
    const inactive = chipStyle(false);
    expect(String(active.backgroundColor)).toContain('--vibe-bg');
    expect(String(inactive.backgroundColor)).toBe('transparent');
  });
});

describe('vibeCss × 3 vibes → distinct CSS-var output (visual fingerprint)', () => {
  it('three vibes produce three different fingerprints', () => {
    const p = flatten(vibeCss(princessBday));
    const b = flatten(vibeCss(bachelorette));
    const w = flatten(vibeCss(wedding));
    expect(p).not.toBe(b);
    expect(p).not.toBe(w);
    expect(b).not.toBe(w);
  });

  it('each vibe drives the chrome-relevant vars that primitives consume', () => {
    const samples: Vibe[] = [princessBday, bachelorette, wedding];
    for (const v of samples) {
      const out = vibeCss(v);
      expect(out['--vibe-bg']).toBeTruthy();
      expect(out['--vibe-ink']).toBeTruthy();
      expect(out['--vibe-accent']).toBeTruthy();
      expect(out['--vibe-radius-button']).toBeTruthy();
      expect(out['--vibe-radius-card']).toBeTruthy();
      expect(out['--vibe-type-display']).toBeTruthy();
      expect(out['--vibe-type-body']).toBeTruthy();
    }
  });

  it('pillowy princess radius diverges from sharp bachelorette and soft wedding', () => {
    const p = vibeCss(princessBday);
    const b = vibeCss(bachelorette);
    const w = vibeCss(wedding);
    expect(p['--vibe-radius-button']).not.toBe(b['--vibe-radius-button']);
    expect(p['--vibe-radius-button']).not.toBe(w['--vibe-radius-button']);
    expect(b['--vibe-radius-button']).not.toBe(w['--vibe-radius-button']);
  });

  it('display dial divergence drives different display font for chrome heading style', () => {
    const p = vibeCss(princessBday);
    const w = vibeCss(wedding);
    expect(p['--vibe-type-display']).not.toBe(w['--vibe-type-display']);
    expect(p['--vibe-type-body']).not.toBe(w['--vibe-type-body']);
  });
});
