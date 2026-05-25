'use client';

import { useMemo, type CSSProperties, type ReactNode } from 'react';

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
    if (vibe.palette?.bg) s['--peek-bg'] = vibe.palette.bg;
    if (vibe.palette?.surface) s['--peek-surface'] = vibe.palette.surface;
    if (vibe.palette?.ink) s['--peek-ink'] = vibe.palette.ink;
    if (vibe.palette?.accent) s['--peek-accent'] = vibe.palette.accent;
    if (vibe.palette?.accent2) s['--peek-accent2'] = vibe.palette.accent2;
    return s as CSSProperties;
  }, [vibe]);

  const motionClass =
    vibe.motion === 'lively'
      ? 'peek-motion-lively'
      : vibe.motion === 'still'
        ? 'peek-motion-still'
        : 'peek-motion-soft';

  return (
    <div
      className={`peek-vibe ${motionClass}`}
      style={style}
      data-tone={vibe.tone}
    >
      {children}
    </div>
  );
}
