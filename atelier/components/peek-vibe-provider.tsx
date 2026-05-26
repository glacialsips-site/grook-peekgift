'use client';

import { useMemo, type CSSProperties, type ReactNode } from 'react';

export type HeadingFont = 'serif' | 'display' | 'sans' | 'mono' | 'script';
export type BodyFont = 'sans' | 'serif' | 'mono';
export type Density = 'compact' | 'cozy' | 'breathable';
export type Shape = 'sharp' | 'soft' | 'pillowy';
export type Mood = 'minimal' | 'rich' | 'whimsical' | 'editorial';

export interface Vibe {
  tone?: string;
  palette?: {
    bg: string;
    surface: string;
    ink: string;
    accent: string;
    accent2?: string;
  };
  mood_words?: string[];
  motion?: 'still' | 'soft' | 'lively';
  font_pairing?: { display: string; body: string };
  typography?: { heading: HeadingFont; body: BodyFont };
  density?: Density;
  shape?: Shape;
  mood?: Mood;
}

const HEADING_FONT_VAR: Record<HeadingFont, string> = {
  serif: 'var(--font-serif), Georgia, serif',
  display: 'var(--font-display), Georgia, serif',
  sans: 'var(--font-sans), system-ui, sans-serif',
  mono: 'var(--font-mono), ui-monospace, monospace',
  script: 'var(--font-script), "Comic Sans MS", cursive',
};

const BODY_FONT_VAR: Record<BodyFont, string> = {
  sans: 'var(--font-sans), system-ui, sans-serif',
  serif: 'var(--font-body-serif), Georgia, serif',
  mono: 'var(--font-mono), ui-monospace, monospace',
};

const DENSITY_SPACE: Record<Density, Record<string, string>> = {
  compact: {
    '--peek-space-1': '0.125rem',
    '--peek-space-2': '0.375rem',
    '--peek-space-3': '0.5rem',
    '--peek-space-4': '0.75rem',
    '--peek-space-5': '1rem',
    '--peek-space-6': '1.25rem',
    '--peek-space-8': '1.5rem',
  },
  cozy: {
    '--peek-space-1': '0.25rem',
    '--peek-space-2': '0.5rem',
    '--peek-space-3': '0.75rem',
    '--peek-space-4': '1rem',
    '--peek-space-5': '1.25rem',
    '--peek-space-6': '1.5rem',
    '--peek-space-8': '2rem',
  },
  breathable: {
    '--peek-space-1': '0.375rem',
    '--peek-space-2': '0.75rem',
    '--peek-space-3': '1rem',
    '--peek-space-4': '1.5rem',
    '--peek-space-5': '2rem',
    '--peek-space-6': '2.5rem',
    '--peek-space-8': '3.5rem',
  },
};

const SHAPE_RADIUS: Record<Shape, Record<string, string>> = {
  sharp: {
    '--peek-radius': '4px',
    '--peek-radius-sm': '2px',
    '--peek-radius-lg': '6px',
  },
  soft: {
    '--peek-radius': '12px',
    '--peek-radius-sm': '8px',
    '--peek-radius-lg': '16px',
  },
  pillowy: {
    '--peek-radius': '24px',
    '--peek-radius-sm': '16px',
    '--peek-radius-lg': '32px',
  },
};

export function PeekVibeProvider({
  vibe,
  children,
}: {
  vibe: Vibe;
  children: ReactNode;
}) {
  const style = useMemo<CSSProperties>(() => {
    const s: Record<string, string> = {};
    if (vibe.palette?.bg) s['--peek-bg'] = vibe.palette.bg;
    if (vibe.palette?.surface) s['--peek-surface'] = vibe.palette.surface;
    if (vibe.palette?.ink) s['--peek-ink'] = vibe.palette.ink;
    if (vibe.palette?.accent) s['--peek-accent'] = vibe.palette.accent;
    if (vibe.palette?.accent2) s['--peek-accent2'] = vibe.palette.accent2;

    if (vibe.typography?.heading) {
      s['--peek-font-heading'] = HEADING_FONT_VAR[vibe.typography.heading];
    }
    if (vibe.typography?.body) {
      s['--peek-font-body'] = BODY_FONT_VAR[vibe.typography.body];
    }

    const density = vibe.density;
    if (density) {
      Object.assign(s, DENSITY_SPACE[density]);
    }

    const shape = vibe.shape;
    if (shape) {
      Object.assign(s, SHAPE_RADIUS[shape]);
    }

    return s as CSSProperties;
  }, [vibe]);

  const motionClass =
    vibe.motion === 'lively'
      ? 'peek-motion-lively'
      : vibe.motion === 'still'
        ? 'peek-motion-still'
        : 'peek-motion-soft';

  const moodClass = vibe.mood ? `peek-mood-${vibe.mood}` : '';
  const densityClass = vibe.density ? `peek-density-${vibe.density}` : '';
  const shapeClass = vibe.shape ? `peek-shape-${vibe.shape}` : '';

  return (
    <div
      className={`peek-vibe ${motionClass} ${moodClass} ${densityClass} ${shapeClass}`.trim()}
      style={style}
      data-tone={vibe.tone}
      data-mood={vibe.mood}
      data-density={vibe.density}
      data-shape={vibe.shape}
    >
      {children}
    </div>
  );
}
