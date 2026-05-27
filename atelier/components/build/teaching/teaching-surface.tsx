'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from 'framer-motion';
import { cn } from '@/lib/utils';
import { SAMPLE_PEEKS, type SamplePeek } from './sample-peeks';

type CueKey = 'hero' | 'chat' | 'card';

const CUE_SEQUENCE: { key: CueKey; durationMs: number; copy: string }[] = [
  {
    key: 'hero',
    durationMs: 2000,
    copy: 'cover photo — auto-generated or upload your own',
  },
  {
    key: 'chat',
    durationMs: 1300,
    copy: 'drop a product link, voice note, or just describe a vibe',
  },
  {
    key: 'card',
    durationMs: 1300,
    copy: 'pick one, pick a few, lock the cool stuff behind a beg',
  },
];

const CYCLE_TOTAL_MS = CUE_SEQUENCE.reduce((s, c) => s + c.durationMs, 0) + 400;

export type TeachingSurfaceProps = {
  children: (sample: SamplePeek) => React.ReactNode;
  className?: string;
};

export function TeachingSurface({ children, className }: TeachingSurfaceProps) {
  const reduce = useReducedMotion();
  const samples = SAMPLE_PEEKS;
  const [sampleIdx, setSampleIdx] = useState(0);
  const [cueIdx, setCueIdx] = useState(0);

  useEffect(() => {
    if (reduce) return;
    if (samples.length <= 1) return;
    const t = window.setTimeout(() => {
      setSampleIdx((i) => (i + 1) % samples.length);
      setCueIdx(0);
    }, CYCLE_TOTAL_MS);
    return () => window.clearTimeout(t);
  }, [sampleIdx, reduce, samples.length]);

  useEffect(() => {
    if (reduce) return;
    if (cueIdx >= CUE_SEQUENCE.length - 1) return;
    const dur = CUE_SEQUENCE[cueIdx]?.durationMs ?? 1500;
    const t = window.setTimeout(() => setCueIdx((i) => i + 1), dur);
    return () => window.clearTimeout(t);
  }, [cueIdx, sampleIdx, reduce]);

  const sample = samples[sampleIdx] ?? samples[0]!;
  const activeCue = CUE_SEQUENCE[cueIdx] ?? CUE_SEQUENCE[0]!;
  const showSpotlight = !reduce;

  const dots = useMemo(
    () =>
      samples.map((s, i) => ({
        id: s.sampleId,
        active: i === sampleIdx,
      })),
    [samples, sampleIdx],
  );

  return (
    <div className={cn('relative h-full w-full', className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={sample.sampleId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: 'easeInOut' }}
          className="absolute inset-0"
          aria-hidden="true"
        >
          {children(sample)}
        </motion.div>
      </AnimatePresence>

      {showSpotlight ? (
        <CueOverlay
          key={`${sample.sampleId}-${activeCue.key}`}
          cue={activeCue.key}
          copy={activeCue.copy}
        />
      ) : null}

      <TeachingChrome
        dots={dots}
        sampleName={sample.peek.recipientName ?? 'someone'}
        sampleOccasion={sample.peek.occasion ?? ''}
      />
    </div>
  );
}

function TeachingChrome({
  dots,
  sampleName,
  sampleOccasion,
}: {
  dots: { id: string; active: boolean }[];
  sampleName: string;
  sampleOccasion: string;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center gap-1.5 px-4 pt-3">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-black/10 bg-white/85 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-black/70 shadow-sm backdrop-blur">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
        sample peek - {sampleName}
        {sampleOccasion ? <span className="text-black/40">- {sampleOccasion}</span> : null}
      </div>
      <div className="pointer-events-auto flex gap-1">
        {dots.map((d) => (
          <span
            key={d.id}
            className={cn(
              'h-1 rounded-full transition-all duration-300',
              d.active ? 'w-5 bg-black/60' : 'w-1.5 bg-black/20',
            )}
          />
        ))}
      </div>
    </div>
  );
}

function CueOverlay({ cue, copy }: { cue: CueKey; copy: string }) {
  const position = cuePosition(cue);
  return (
    <motion.div
      key={cue + copy}
      initial={{ opacity: 0, y: position.enterY }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: position.exitY }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn(
        'pointer-events-none absolute z-30 flex items-center gap-2 px-4',
        position.classes,
      )}
    >
      <CueArrow cue={cue} />
      <span className="max-w-[18rem] rounded-full border border-black/10 bg-white/95 px-3 py-1.5 text-[11px] font-medium text-black/80 shadow-lg backdrop-blur">
        {copy}
      </span>
    </motion.div>
  );
}

function cuePosition(cue: CueKey): {
  classes: string;
  enterY: number;
  exitY: number;
} {
  if (cue === 'hero') {
    return {
      classes: 'left-1/2 top-24 -translate-x-1/2 flex-col-reverse',
      enterY: -12,
      exitY: -8,
    };
  }
  if (cue === 'chat') {
    return {
      classes: 'left-4 top-1/2 -translate-y-1/2 flex-row',
      enterY: 0,
      exitY: 0,
    };
  }
  return {
    classes: 'bottom-10 left-1/2 -translate-x-1/2 flex-col',
    enterY: 12,
    exitY: 8,
  };
}

function CueArrow({ cue }: { cue: CueKey }) {
  if (cue === 'hero') {
    return (
      <motion.span
        aria-hidden="true"
        className="text-lg leading-none"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {'↑'}
      </motion.span>
    );
  }
  if (cue === 'chat') {
    return (
      <motion.span
        aria-hidden="true"
        className="text-lg leading-none"
        animate={{ x: [0, -4, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {'←'}
      </motion.span>
    );
  }
  return (
    <motion.span
      aria-hidden="true"
      className="text-lg leading-none"
      animate={{ y: [0, 4, 0] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      {'↓'}
    </motion.span>
  );
}
