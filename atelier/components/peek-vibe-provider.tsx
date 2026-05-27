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

function hexToHslTriple(hex: string): string | null {
  const h = hex.replace('#', '').trim();
  if (h.length !== 3 && h.length !== 6) return null;
  let r: number, g: number, b: number;
  if (h.length === 3) {
    r = parseInt(h[0]! + h[0]!, 16);
    g = parseInt(h[1]! + h[1]!, 16);
    b = parseInt(h[2]! + h[2]!, 16);
  } else {
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  }
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const l = (max + min) / 2;
  let s = 0;
  let hue = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rN) hue = ((gN - bN) / d + (gN < bN ? 6 : 0));
    else if (max === gN) hue = ((bN - rN) / d + 2);
    else hue = ((rN - gN) / d + 4);
    hue *= 60;
  }
  return `${Math.round(hue)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function paletteValueAsHslTriple(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.startsWith('#')) {
    const triple = hexToHslTriple(trimmed);
    return triple ?? undefined;
  }
  return trimmed;
}

export function PeekVibeProvider({
  vibe,
  children,
}: {
  vibe: Vibe;
  children: ReactNode;
}) {
  const style = useMemo<CSSProperties>(() => {
    const s: Record<string, string> = {};
    const bg = paletteValueAsHslTriple(vibe.palette?.bg);
    const surface = paletteValueAsHslTriple(vibe.palette?.surface);
    const ink = paletteValueAsHslTriple(vibe.palette?.ink);
    const accent = paletteValueAsHslTriple(vibe.palette?.accent);
    const accent2 = paletteValueAsHslTriple(vibe.palette?.accent2);
    if (bg) s['--peek-bg'] = bg;
    if (surface) s['--peek-surface'] = surface;
    if (ink) s['--peek-ink'] = ink;
    if (accent) s['--peek-accent'] = accent;
    if (accent2) s['--peek-accent2'] = accent2;

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
