'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Peek, VibeMotion } from '@/lib/peek/types';
import { cssUrl } from '@/lib/security/css-url';

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

const GAP_MS = 200;

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
  const nameMs = Math.round(900 * scale);
  const noteMs = peek.noteMd ? Math.min(1600, Math.round(800 * scale)) : 0;
  const gapMs = Math.round(GAP_MS * scale);
  const nameDelayMs = heroMs;
  const noteDelayMs = nameDelayMs + nameMs + gapMs;
  const cardsDelayMs = noteDelayMs + noteMs + gapMs;
  const cardStaggerMs = Math.round(180 * scale);
  const totalMs =
    cardsDelayMs + Math.max(cardStaggerMs * Math.min(cardCount, 6), 400);

  const [phase, setPhase] = useState<'hero' | 'name' | 'note' | 'cards' | 'done'>(
    'hero',
  );

  const startedAtRef = useRef<number | null>(null);
  const elapsedRef = useRef<number>(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pausedRef = useRef<boolean>(false);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (revealed) return;
    if (reduce) {
      setPhase('done');
      onDoneRef.current();
      return;
    }

    const schedule = (elapsed: number) => {
      const phases: Array<{ at: number; run: () => void }> = [
        { at: nameDelayMs, run: () => setPhase('name') },
        { at: noteDelayMs, run: () => setPhase('note') },
        { at: cardsDelayMs, run: () => setPhase('cards') },
        {
          at: totalMs,
          run: () => {
            setPhase('done');
            onDoneRef.current();
          },
        },
      ];
      for (const { at, run } of phases) {
        const remaining = at - elapsed;
        if (remaining <= 0) {
          run();
        } else {
          timersRef.current.push(setTimeout(run, remaining));
        }
      }
    };

    const clearTimers = () => {
      for (const t of timersRef.current) clearTimeout(t);
      timersRef.current = [];
    };

    const pause = () => {
      if (pausedRef.current) return;
      if (startedAtRef.current == null) return;
      pausedRef.current = true;
      elapsedRef.current += Date.now() - startedAtRef.current;
      startedAtRef.current = null;
      clearTimers();
    };

    const resume = () => {
      if (!pausedRef.current) return;
      pausedRef.current = false;
      startedAtRef.current = Date.now();
      schedule(elapsedRef.current);
    };

    const onVisibility = () => {
      if (document.hidden) pause();
      else resume();
    };

    startedAtRef.current = Date.now();
    elapsedRef.current = 0;
    pausedRef.current = false;
    schedule(0);

    if (typeof document !== 'undefined' && document.hidden) {
      pause();
    }

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', pause);
    window.addEventListener('focus', resume);

    return () => {
      clearTimers();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', pause);
      window.removeEventListener('focus', resume);
      startedAtRef.current = null;
      elapsedRef.current = 0;
      pausedRef.current = false;
    };
  }, [
    revealed,
    reduce,
    nameDelayMs,
    noteDelayMs,
    cardsDelayMs,
    totalMs,
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
                ? `linear-gradient(180deg, hsl(var(--peek-bg))/0 30%, hsl(var(--peek-bg)) 100%), ${cssUrl(peek.heroImageUrl)}`
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
