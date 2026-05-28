import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VIBE,
  applyDefaultVibe,
  isDefaultVibe,
  makeVibe,
} from '@/lib/vibe/defaults';
import { vibeCss } from '@/lib/vibe/css-vars';

const BLAND_BASELINE_BG = '0 0% 100%';
const BLAND_BASELINE_INK = '240 10% 4%';
const TAILWIND_DEFAULT_RADIUS_PX = ['0px', '2px', '4px'];

describe('DEFAULT_VIBE — vivid baseline', () => {
  it('locks the seven dials to opinionated values', () => {
    expect(DEFAULT_VIBE.tone).toBe('warm-curiosity');
    expect(DEFAULT_VIBE.palette).toEqual({
      bg: '#FBF6E9',
      surface: '#F4ECDB',
      ink: '#1B1A3D',
      accent: '#E8A93C',
      accent2: '#C75D3A',
    });
    expect(DEFAULT_VIBE.font_pairing).toEqual({
      display: 'Fraunces',
      body: 'Inter',
    });
    expect(DEFAULT_VIBE.typography).toEqual({ heading: 'serif', body: 'sans' });
    expect(DEFAULT_VIBE.density).toBe('breathable');
    expect(DEFAULT_VIBE.shape).toBe('soft');
    expect(DEFAULT_VIBE.mood).toBe('rich');
    expect(DEFAULT_VIBE.motion).toBe('soft');
  });

  it('mood_words signal warmth + curiosity, not generic warmth', () => {
    expect(DEFAULT_VIBE.mood_words).toEqual([
      'warm',
      'curious',
      'crafted',
      'personal',
      'considered',
    ]);
  });
});

describe('DEFAULT_VIBE → vibeCss snapshot', () => {
  const vars = vibeCss(DEFAULT_VIBE);

  it('emits all seven dials into the CSS bundle', () => {
    expect(vars['--peek-bg']).toBeDefined();
    expect(vars['--peek-surface']).toBeDefined();
    expect(vars['--peek-ink']).toBeDefined();
    expect(vars['--peek-accent']).toBeDefined();
    expect(vars['--peek-accent2']).toBeDefined();
    expect(vars['--vibe-bg']).toBeDefined();
    expect(vars['--vibe-ink']).toBeDefined();
    expect(vars['--vibe-accent']).toBeDefined();

    expect(vars['--peek-font-heading']).toBeDefined();
    expect(vars['--peek-font-body']).toBeDefined();
    expect(vars['--vibe-type-display']).toContain('Fraunces');
    expect(vars['--vibe-type-body']).toContain('Inter');
    expect(vars['--vibe-type-mono']).toBeDefined();

    expect(vars['--vibe-space-base']).toBe('1.5rem');
    expect(vars['--vibe-space-gap']).toBe('1.5');

    expect(vars['--vibe-radius-card']).toBe('16px');
    expect(vars['--vibe-radius-button']).toBe('12px');

    expect(vars['--vibe-motion-scale']).toBe('1');

    expect(vars['--vibe-mood-grain']).toBe('0.04');
    expect(vars['--vibe-mood-overlay']).toBe('0.08');
  });

  it('does NOT collapse to the bland Tailwind baseline', () => {
    expect(vars['--peek-bg']).not.toBe(BLAND_BASELINE_BG);
    expect(vars['--peek-ink']).not.toBe(BLAND_BASELINE_INK);
    expect(TAILWIND_DEFAULT_RADIUS_PX).not.toContain(vars['--vibe-radius-card']);

    expect(vars['--peek-font-heading']).toMatch(/Fraunces|serif/);
    expect(vars['--peek-font-body']).toMatch(/Inter/);
  });

  it('emits the exact warm-cream / deep-indigo / saffron palette', () => {
    expect(vars['--peek-bg']).toMatch(/^\d+ \d+% \d+%$/);
    expect(vars['--peek-ink']).toMatch(/^\d+ \d+% \d+%$/);
    expect(vars['--peek-accent']).toMatch(/^\d+ \d+% \d+%$/);

    const [bgH, bgS, bgL] = parseHsl(vars['--peek-bg']!);
    const [, , inkL] = parseHsl(vars['--peek-ink']!);
    const [accentH, accentS] = parseHsl(vars['--peek-accent']!);

    expect(bgL).toBeGreaterThanOrEqual(85);
    expect(inkL).toBeLessThanOrEqual(25);
    expect(accentS).toBeGreaterThanOrEqual(40);
    expect(accentH).toBeGreaterThanOrEqual(20);
    expect(accentH).toBeLessThanOrEqual(60);
    expect(bgH).toBeGreaterThanOrEqual(20);
    expect(bgH).toBeLessThanOrEqual(80);
    expect(bgS).toBeLessThanOrEqual(80);
    expect(bgS).toBeGreaterThanOrEqual(40);
  });

  it('snapshot — the bundle preview-pane consumes', () => {
    expect({
      '--peek-bg': vars['--peek-bg'],
      '--peek-surface': vars['--peek-surface'],
      '--peek-ink': vars['--peek-ink'],
      '--peek-accent': vars['--peek-accent'],
      '--peek-accent2': vars['--peek-accent2'],
      '--peek-font-heading': vars['--peek-font-heading'],
      '--peek-font-body': vars['--peek-font-body'],
      '--vibe-radius-card': vars['--vibe-radius-card'],
      '--vibe-radius-button': vars['--vibe-radius-button'],
      '--vibe-space-base': vars['--vibe-space-base'],
      '--vibe-space-gap': vars['--vibe-space-gap'],
      '--vibe-motion-scale': vars['--vibe-motion-scale'],
      '--vibe-mood-grain': vars['--vibe-mood-grain'],
      '--vibe-mood-overlay': vars['--vibe-mood-overlay'],
    }).toMatchInlineSnapshot(`
      {
        "--peek-accent": "38 79% 57%",
        "--peek-accent2": "15 56% 50%",
        "--peek-bg": "43 69% 95%",
        "--peek-font-body": ""Inter", Inter, system-ui, sans-serif",
        "--peek-font-heading": ""Fraunces", "Fraunces", "Playfair Display", Georgia, serif",
        "--peek-ink": "242 40% 17%",
        "--peek-surface": "41 53% 91%",
        "--vibe-mood-grain": "0.04",
        "--vibe-mood-overlay": "0.08",
        "--vibe-motion-scale": "1",
        "--vibe-radius-button": "12px",
        "--vibe-radius-card": "16px",
        "--vibe-space-base": "1.5rem",
        "--vibe-space-gap": "1.5",
      }
    `);
  });
});

describe('applyDefaultVibe', () => {
  it('returns DEFAULT_VIBE for an empty input', () => {
    const merged = applyDefaultVibe({});
    expect(merged.palette).toEqual(DEFAULT_VIBE.palette);
    expect(merged.font_pairing).toEqual(DEFAULT_VIBE.font_pairing);
    expect(merged.density).toBe(DEFAULT_VIBE.density);
    expect(merged.mood).toBe(DEFAULT_VIBE.mood);
  });

  it('returns DEFAULT_VIBE for null/undefined input', () => {
    expect(applyDefaultVibe(null).palette).toEqual(DEFAULT_VIBE.palette);
    expect(applyDefaultVibe(undefined).palette).toEqual(DEFAULT_VIBE.palette);
  });

  it('preserves curator-set dials verbatim', () => {
    const merged = applyDefaultVibe({
      palette: {
        bg: '#000000',
        surface: '#111111',
        ink: '#FFFFFF',
        accent: '#FF00FF',
      },
      mood: 'whimsical',
      shape: 'pillowy',
    });
    expect(merged.palette?.bg).toBe('#000000');
    expect(merged.mood).toBe('whimsical');
    expect(merged.shape).toBe('pillowy');
    expect(merged.density).toBe(DEFAULT_VIBE.density);
    expect(merged.font_pairing).toEqual(DEFAULT_VIBE.font_pairing);
  });

  it('preserves signal_source_history on the input', () => {
    const history = [
      {
        source: 'curator' as const,
        ts: '2026-01-01T00:00:00Z',
        patch: { mood: 'rich' as const },
      },
    ];
    const merged = applyDefaultVibe({ signal_source_history: history });
    expect(merged.signal_source_history).toEqual(history);
  });

  it('fills mood_words only when input array is empty', () => {
    const explicit = applyDefaultVibe({ mood_words: ['gold', 'neon'] });
    expect(explicit.mood_words).toEqual(['gold', 'neon']);
    const empty = applyDefaultVibe({ mood_words: [] });
    expect(empty.mood_words).toEqual(DEFAULT_VIBE.mood_words);
  });
});

describe('isDefaultVibe', () => {
  it('true for null / undefined / empty vibe', () => {
    expect(isDefaultVibe(null)).toBe(true);
    expect(isDefaultVibe(undefined)).toBe(true);
    expect(isDefaultVibe({})).toBe(true);
    expect(isDefaultVibe(DEFAULT_VIBE)).toBe(true);
  });

  it('false once the vibe engine has appended a signal', () => {
    expect(
      isDefaultVibe({
        ...DEFAULT_VIBE,
        signal_source_history: [
          {
            source: 'tone_classifier',
            ts: '2026-01-01T00:00:00Z',
            patch: { motion: 'lively' },
          },
        ],
      }),
    ).toBe(false);
  });
});

describe('makeVibe', () => {
  it('is a convenience wrapper around applyDefaultVibe', () => {
    const v = makeVibe({ mood: 'whimsical' });
    expect(v.mood).toBe('whimsical');
    expect(v.density).toBe(DEFAULT_VIBE.density);
  });
});

function parseHsl(triple: string): [number, number, number] {
  const m = triple.match(/^(\d+) (\d+)% (\d+)%$/);
  if (!m) throw new Error(`Invalid HSL triple: ${triple}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}
