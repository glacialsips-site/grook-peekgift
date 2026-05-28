'use client';

import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { vibeCss } from '@/lib/vibe/css-vars';
import type {
  VibeBodyFont,
  VibeDensity,
  VibeHeadingFont,
  VibeMood,
  VibeMotion,
  VibeShape,
} from '@/db/schema/peeks';

export type HeadingFont = VibeHeadingFont;
export type BodyFont = VibeBodyFont;
export type Density = VibeDensity;
export type Shape = VibeShape;
export type Mood = VibeMood;

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
  motion?: VibeMotion;
  font_pairing?: { display: string; body: string };
  typography?: { heading: HeadingFont; body: BodyFont };
  density?: Density;
  shape?: Shape;
  mood?: Mood;
}

export function PeekVibeProvider({
  vibe,
  children,
}: {
  vibe: Vibe;
  children: ReactNode;
}) {
  const style = useMemo<CSSProperties>(
    () => vibeCss(vibe) as CSSProperties,
    [vibe],
  );

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
      data-motion={vibe.motion}
    >
      {children}
    </div>
  );
}
