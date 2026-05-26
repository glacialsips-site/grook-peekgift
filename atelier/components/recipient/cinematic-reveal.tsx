'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Peek, VibeMotion } from '@/lib/peek/types';

type Props = {
  peek: Peek;
  cardCount: number;
  motion: VibeMotion;
  revealed: boolean;
  onDone: () => void;
  onSkip: () => void;
};

const MOTION_SCALE: Record<VibeMotion, number> = {
  still: 0.6,
  soft: 1,
  lively: 1.25,
};

export function CinematicReveal({
  peek,
  cardCount,
  motion: vibeMotion,
  revealed,
  onDone,
  onSkip,
}: Props) {
  const reduce = useReducedMotion();
  const scale = MOTION_SCALE[vibeMotion];
  const heroMs = Math.round(900 * scale);
  const nameDelayMs = Math.round(700 * scale);
  const nameMs = Math.round(900 * scale);
  const noteDelayMs = nameDelayMs + nameMs;
  const noteMs = peek.noteMd ? Math.min(1600, Math.round(800 * scale)) : 0;
  const cardsDelayMs = noteDelayMs + noteMs + 200;
  const cardStaggerMs = Math.round(180 * scale);
  const totalMs =
    cardsDelayMs + Math.max(cardStaggerMs * Math.min(cardCount, 6), 400);

  const [phase, setPhase] = useState<'hero' | 'name' | 'note' | 'cards' | 'done'>(
    'hero',
  );

  useEffect(() => {
    if (revealed) return;
    if (reduce) {
      setPhase('done');
      onDone();
      return;
    }
    const t1 = setTimeout(() => setPhase('name'), heroMs);
    const t2 = setTimeout(() => setPhase('note'), nameDelayMs);
    const t3 = setTimeout(() => setPhase('cards'), cardsDelayMs);
    const t4 = setTimeout(() => {
      setPhase('done');
      onDone();
    }, totalMs);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [
    revealed,
    reduce,
    heroMs,
    nameDelayMs,
    cardsDelayMs,
    totalMs,
    onDone,
  ]);

  const display = peek.vibe?.font_pairing?.display;
  const name = peek.recipientName ?? 'you';

  if (reduce) return null;

  return (
    <AnimatePresence>
      {!revealed ? (
        <motion.div
          key="reveal"
          className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-center bg-[hsl(var(--peek-bg))]/0"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          onClick={onSkip}
          role="button"
          tabIndex={0}
          aria-label="Skip the reveal animation"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
              e.preventDefault();
              onSkip();
            }
          }}
        >
          <motion.div
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 1 }}
            animate={{ opacity: phase === 'hero' ? 1 : 0 }}
            transition={{ duration: heroMs / 1000, ease: 'easeOut' }}
            style={{
              backgroundImage: peek.heroImageUrl
                ? `linear-gradient(180deg, hsl(var(--peek-bg))/0 30%, hsl(var(--peek-bg)) 100%), url(${peek.heroImageUrl})`
                : undefined,
              backgroundColor: peek.heroImageUrl
                ? undefined
                : 'hsl(var(--peek-bg))',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            aria-hidden="true"
          />
          <div className="relative flex h-full w-full flex-col items-center justify-center px-6 text-center">
            <AnimatePresence>
              {phase === 'name' ? (
                <motion.h1
                  key="flourish"
                  initial={{ opacity: 0, y: 20, letterSpacing: '0.2em' }}
                  animate={{ opacity: 1, y: 0, letterSpacing: '0.02em' }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: nameMs / 1000, ease: 'easeOut' }}
                  className="px-6 text-center text-4xl font-semibold tracking-tight text-[hsl(var(--peek-ink))] sm:text-6xl"
                  style={display ? { fontFamily: display } : undefined}
                >
                  for {name}
                </motion.h1>
              ) : null}
            </AnimatePresence>
            <p className="pointer-events-none absolute bottom-6 text-xs text-[hsl(var(--peek-ink))]/40">
              tap to skip
            </p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
