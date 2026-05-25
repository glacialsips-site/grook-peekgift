'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, ChevronUp, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PeekDraft } from '@/lib/peek/types';
import { PreviewPane } from './preview-pane';

type Props = {
  draft: PeekDraft;
  className?: string;
};

type Snap = 'closed' | 'half' | 'full';

const PEEK_HEIGHT = 84;

export function PreviewSheet({ draft, className }: Props) {
  const reduce = useReducedMotion();
  const [snap, setSnap] = useState<Snap>('half');
  const [viewportH, setViewportH] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const measure = () => setViewportH(window.innerHeight);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const heights = useMemo(() => {
    if (viewportH === 0) {
      return { closed: PEEK_HEIGHT, half: 360, full: 600 };
    }
    return {
      closed: PEEK_HEIGHT,
      half: Math.round(viewportH * 0.55),
      full: Math.round(viewportH * 0.92),
    };
  }, [viewportH]);

  const targetHeight = heights[snap];

  const cycle = useCallback(() => {
    setSnap((prev) =>
      prev === 'closed' ? 'half' : prev === 'half' ? 'full' : 'closed',
    );
  }, []);

  const onDragEnd = useCallback(
    (
      _: unknown,
      info: { offset: { y: number }; velocity: { y: number } },
    ) => {
      const drag = info.offset.y;
      const fling = info.velocity.y;
      const downward = drag + fling * 0.2 > 60;
      const upward = drag + fling * 0.2 < -60;
      if (downward) {
        setSnap((prev) =>
          prev === 'full' ? 'half' : prev === 'half' ? 'closed' : 'closed',
        );
        return;
      }
      if (upward) {
        setSnap((prev) =>
          prev === 'closed' ? 'half' : prev === 'half' ? 'full' : 'full',
        );
      }
    },
    [],
  );

  return (
    <motion.aside
      role="dialog"
      aria-label="Peek preview"
      aria-modal={false}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 flex flex-col rounded-t-2xl border-t border-border bg-background shadow-2xl',
        'overflow-hidden md:hidden',
        className,
      )}
      initial={false}
      animate={{ height: targetHeight }}
      transition={
        reduce
          ? { duration: 0 }
          : { type: 'spring', stiffness: 320, damping: 32 }
      }
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.1}
      onDragEnd={onDragEnd}
      style={{ touchAction: 'none' }}
    >
      <button
        type="button"
        onClick={cycle}
        className="flex w-full items-center justify-between gap-2 border-b border-border/50 bg-background/95 px-4 py-2 text-left backdrop-blur"
        aria-expanded={snap !== 'closed'}
      >
        <span className="flex items-center gap-2">
          <GripHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Live preview</span>
          <SnapLabel snap={snap} />
        </span>
        <span aria-hidden className="text-muted-foreground">
          {snap === 'full' ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </span>
      </button>
      <div className="min-h-0 flex-1 overflow-hidden">
        <PreviewPane draft={draft} className="h-full" />
      </div>
    </motion.aside>
  );
}

function SnapLabel({ snap }: { snap: Snap }) {
  const text = snap === 'closed' ? 'tap to expand' : snap === 'half' ? 'half' : 'full';
  return (
    <span className="text-xs text-muted-foreground/70">{text}</span>
  );
}

export function PreviewToggleHandle({
  onOpen,
  className,
}: {
  onOpen: () => void;
  className?: string;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className={cn('pointer-events-auto', className)}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpen}
          className="rounded-full shadow-md"
        >
          <ChevronUp className="mr-1.5 h-4 w-4" />
          Show preview
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}
