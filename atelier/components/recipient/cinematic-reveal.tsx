'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Peek, VibeMotion } from '@/lib/peek/types';
import { cssUrl } from '@/lib/security/css-url';
import {
  type PhasePlan,
  type RevealPhase,
  phaseAtElapsed,
  planPhases,
  tokenizeWords,
} from '@/lib/reveal/phases';

type Props = {
  peek: Peek;
  cardCount: number;
  motion: VibeMotion;
  revealed: boolean;
  onDone: () => void;
  onSkip: () => void;
};

/**
 * Magazine-cover-opening reveal — see `_packets/SPINE/skills/reveal-mechanics.md` §3.
 *
 * Phase order: hero → name → occasion → note → cards → done.
 *
 *  - hero: backdrop starts at 110% scale, blurred 4px, desaturated to 55%, then
 *    eases into 100% / 0 blur / full saturation — like a magazine cover coming
 *    into focus.
 *  - name: short names (≤20 chars) typewriter at ~50ms/char; long names fade-up.
 *  - occasion: fade-up subtitle below name (skipped if no occasion).
 *  - note: word-by-word fade-up at ~80ms/word; long notes (>50 words) batch
 *    into ~7-word lines so the duration stays inside the cap.
 *  - cards: deal-in teaser that crossfades into the real card deck below. The
 *    actual CardDeck renders the interactive cards once `revealed` flips true.
 *
 * `vibe.motion` multiplies every duration uniformly. `prefers-reduced-motion`
 * bypasses the whole choreography — the component renders nothing and signals
 * done immediately so the peek surface is interactive from t=0.
 */
export function CinematicReveal({
  peek,
  cardCount,
  motion: vibeMotion,
  revealed,
  onDone,
  onSkip,
}: Props) {
  const reduce = useReducedMotion();
  const name = peek.recipientName ?? 'you';
  const noteText = peek.noteMd ?? '';
  const occasion = peek.occasion ?? null;

  const noteWords = useMemo(() => tokenizeWords(noteText), [noteText]);

  const plan: PhasePlan = useMemo(
    () =>
      planPhases({
        motion: vibeMotion,
        hasNote: noteText.length > 0,
        noteWordCount: noteWords.length,
        nameLength: name.length,
        hasOccasion: Boolean(occasion),
        cardCount,
      }),
    [
      vibeMotion,
      noteText.length,
      noteWords.length,
      name.length,
      occasion,
      cardCount,
    ],
  );

  const [phase, setPhase] = useState<RevealPhase>('hero');
  const [typedName, setTypedName] = useState<string>(
    plan.name.style === 'typewriter' ? '' : name,
  );

  const startedAtRef = useRef<number | null>(null);
  const elapsedRef = useRef<number>(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

    const clearTimers = () => {
      for (const t of timersRef.current) clearTimeout(t);
      timersRef.current = [];
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const startNameTypewriter = (fromIdx: number) => {
      if (plan.name.style !== 'typewriter') {
        setTypedName(name);
        return;
      }
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      let idx = Math.max(0, Math.min(fromIdx, name.length));
      setTypedName(name.slice(0, idx));
      if (idx >= name.length) return;
      const tickMs = Math.max(plan.name.msPerChar, 16);
      intervalRef.current = setInterval(() => {
        idx += 1;
        setTypedName(name.slice(0, idx));
        if (idx >= name.length && intervalRef.current != null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, tickMs);
    };

    const schedule = (elapsed: number) => {
      const initialPhase = phaseAtElapsed(plan, elapsed);
      setPhase(initialPhase);

      // Snap the typewriter to wherever it should be at this elapsed point.
      if (plan.name.style === 'typewriter') {
        if (elapsed >= plan.name.startMs + plan.name.durationMs) {
          setTypedName(name);
        } else if (elapsed >= plan.name.startMs) {
          const charsSoFar = Math.min(
            name.length,
            Math.floor(
              (elapsed - plan.name.startMs) /
                Math.max(plan.name.msPerChar, 16),
            ),
          );
          startNameTypewriter(charsSoFar);
        } else {
          setTypedName('');
        }
      }

      const transitions: Array<{ at: number; run: () => void }> = [
        {
          at: plan.name.startMs,
          run: () => {
            setPhase('name');
            startNameTypewriter(0);
          },
        },
        ...(plan.occasion.visible
          ? [{ at: plan.occasion.startMs, run: () => setPhase('occasion') }]
          : []),
        ...(plan.note.visible
          ? [{ at: plan.note.startMs, run: () => setPhase('note') }]
          : []),
        { at: plan.cards.startMs, run: () => setPhase('cards') },
        {
          at: plan.totalMs,
          run: () => {
            setPhase('done');
            onDoneRef.current();
          },
        },
      ];
      for (const { at, run } of transitions) {
        const remaining = at - elapsed;
        if (remaining <= 0) continue;
        timersRef.current.push(setTimeout(run, remaining));
      }
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
  }, [revealed, reduce, plan, name]);

  const display = peek.vibe?.font_pairing?.display;
  const body = peek.vibe?.font_pairing?.body;

  if (reduce) return null;

  const heroSeconds = plan.hero.durationMs / 1000;
  const showOverlay = !revealed;
  const heroExpanded = phase !== 'hero';
  const showName = phase !== 'hero';
  const showOccasion =
    plan.occasion.visible &&
    (phase === 'occasion' || phase === 'note' || phase === 'cards');
  const showNote =
    plan.note.visible && (phase === 'note' || phase === 'cards');
  const showCardsTeaser = phase === 'cards';

  const noteWordStaggerSec = Math.max(plan.note.perStepMs / 1000, 0.02);

  return (
    <AnimatePresence>
      {showOverlay ? (
        <motion.div
          key="reveal"
          className="pointer-events-auto fixed inset-0 z-40 flex flex-col items-center justify-end bg-[hsl(var(--peek-bg))]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
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
            initial={{
              scale: 1.1,
              filter: 'saturate(0.55) blur(4px)',
              opacity: peek.heroImageUrl ? 1 : 0.8,
            }}
            animate={
              heroExpanded
                ? {
                    scale: 1,
                    filter: 'saturate(1) blur(0px)',
                    opacity: 1,
                  }
                : {
                    scale: 1.1,
                    filter: 'saturate(0.55) blur(4px)',
                    opacity: peek.heroImageUrl ? 1 : 0.8,
                  }
            }
            transition={{ duration: heroSeconds, ease: [0.22, 1, 0.36, 1] }}
            style={{
              backgroundImage: peek.heroImageUrl
                ? `linear-gradient(to top, hsl(var(--peek-bg)) 0%, hsl(var(--peek-bg) / 0.55) 35%, hsl(var(--peek-bg) / 0) 75%), ${cssUrl(peek.heroImageUrl)}`
                : undefined,
              backgroundColor: peek.heroImageUrl
                ? undefined
                : 'hsl(var(--peek-bg))',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transformOrigin: 'center',
            }}
            aria-hidden="true"
          />

          {!peek.heroImageUrl ? (
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: heroExpanded ? 1 : 0 }}
              transition={{ duration: heroSeconds, ease: 'easeOut' }}
              style={{
                background:
                  'radial-gradient(ellipse at 50% 30%, hsl(var(--peek-accent) / 0.18), transparent 60%), radial-gradient(ellipse at 30% 80%, hsl(var(--peek-accent2, var(--peek-accent)) / 0.12), transparent 70%)',
              }}
            />
          ) : null}

          <div className="relative z-10 flex w-full flex-col items-center px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
            <div className="flex w-full max-w-2xl flex-col items-center gap-3 text-center">
              <AnimatePresence>
                {showName ? (
                  <motion.h1
                    key="name"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{
                      duration: Math.max(plan.name.durationMs / 1000, 0.3),
                      ease: 'easeOut',
                    }}
                    className="px-2 text-4xl font-semibold tracking-tight text-[hsl(var(--peek-ink))] drop-shadow-sm sm:text-6xl"
                    style={display ? { fontFamily: display } : undefined}
                  >
                    <span className="sr-only">for {name}</span>
                    <span aria-hidden="true">
                      for{' '}
                      {plan.name.style === 'typewriter' ? (
                        <>
                          {typedName}
                          {typedName.length < name.length ? (
                            <span className="ml-0.5 inline-block h-[0.9em] w-[2px] animate-pulse bg-[hsl(var(--peek-ink))]/70 align-baseline" />
                          ) : null}
                        </>
                      ) : (
                        name
                      )}
                    </span>
                  </motion.h1>
                ) : null}
              </AnimatePresence>

              <AnimatePresence>
                {showOccasion && occasion ? (
                  <motion.p
                    key="occasion"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{
                      duration: Math.max(plan.occasion.durationMs / 1000, 0.25),
                      ease: 'easeOut',
                    }}
                    className="text-base uppercase tracking-[0.2em] text-[hsl(var(--peek-ink))]/70 sm:text-lg"
                    style={display ? { fontFamily: display } : undefined}
                  >
                    {occasion}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <AnimatePresence>
                {showNote ? (
                  <motion.p
                    key="note"
                    className="mt-2 max-w-xl text-balance text-base leading-relaxed text-[hsl(var(--peek-ink))]/85 sm:text-lg"
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0 }}
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: {
                          staggerChildren: noteWordStaggerSec,
                          delayChildren: 0,
                        },
                      },
                    }}
                    style={body ? { fontFamily: body } : undefined}
                    aria-label="A note from the giver"
                  >
                    {plan.note.style === 'word'
                      ? noteWords.map((word, i) => (
                          <motion.span
                            key={`w-${i}`}
                            className="inline"
                            variants={{
                              hidden: { opacity: 0, y: 6 },
                              visible: {
                                opacity: 1,
                                y: 0,
                                transition: {
                                  duration: 0.28,
                                  ease: 'easeOut',
                                },
                              },
                            }}
                          >
                            {word}
                          </motion.span>
                        ))
                      : chunkWordsToLines(noteWords, 7).map((line, i) => (
                          <motion.span
                            key={`l-${i}`}
                            className="block"
                            variants={{
                              hidden: { opacity: 0, y: 8 },
                              visible: {
                                opacity: 1,
                                y: 0,
                                transition: {
                                  duration: 0.32,
                                  ease: 'easeOut',
                                },
                              },
                            }}
                          >
                            {line.join('').trim()}
                          </motion.span>
                        ))}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {showCardsTeaser && plan.cards.visibleCount > 0 ? (
                <motion.div
                  key="cards-teaser"
                  className="pointer-events-none mt-8 flex w-full max-w-xl items-end justify-center gap-2"
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, y: 8 }}
                  variants={{
                    hidden: { opacity: 1 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: Math.max(
                          plan.cards.staggerMs / 1000,
                          0.04,
                        ),
                      },
                    },
                  }}
                  aria-hidden="true"
                >
                  {Array.from({ length: plan.cards.visibleCount }).map((_, i) => (
                    <motion.span
                      key={`card-${i}`}
                      className="block h-12 w-8 rounded-[var(--peek-radius,8px)] bg-[hsl(var(--peek-surface,var(--peek-bg)))] shadow-[0_8px_24px_-12px_hsl(var(--peek-ink)/0.45)] ring-1 ring-[hsl(var(--peek-ink)/0.08)] sm:h-16 sm:w-10"
                      variants={{
                        hidden: {
                          opacity: 0,
                          y: 24,
                          rotate: -3 + (i % 5) * 1.5,
                        },
                        visible: {
                          opacity: 1,
                          y: 0,
                          rotate: 0,
                          transition: { duration: 0.4, ease: 'easeOut' },
                        },
                      }}
                    />
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <p className="pointer-events-none mt-6 text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--peek-ink))]/40">
              tap to skip
            </p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function chunkWordsToLines(words: string[], perLine: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < words.length; i += perLine) {
    out.push(words.slice(i, i + perLine));
  }
  return out;
}
