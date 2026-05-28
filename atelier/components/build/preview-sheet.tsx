'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
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
  // Default to 'closed' so the chat input is reachable on first paint —
  // expansion is one tap on the peek handle. Half/full open via tap or
  // upward swipe (BUGS.md, CONCEPT-V2.md §2 "chat first, swipe up to
  // expand preview"). Previously defaulted to 'half', which buried the
  // chat input under the sheet on every mobile landing.
  const [snap, setSnap] = useState<Snap>('closed');
  const [viewportH, setViewportH] = useState<number>(0);
  const [dragging, setDragging] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const measure = () => setViewportH(window.innerHeight);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (snap === 'full') {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
    return;
  }, [snap]);

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

  const close = useCallback(() => {
    setSnap('closed');
    toggleRef.current?.focus();
  }, []);

  const onDragStart = useCallback(() => setDragging(true), []);
  const onDragEnd = useCallback(
    (
      _: unknown,
      info: { offset: { y: number }; velocity: { y: number } },
    ) => {
      setDragging(false);
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

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'Escape' && snap === 'full') {
        e.preventDefault();
        close();
      }
    },
    [snap, close],
  );

  const sheetLabelId = 'preview-sheet-label';

  return (
    <motion.aside
      role="dialog"
      aria-modal={snap === 'full' ? true : undefined}
      aria-labelledby={sheetLabelId}
      onKeyDown={onKeyDown}
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
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        height: `min(${targetHeight}px, 100dvh)`,
        touchAction: dragging ? 'none' : 'pan-y',
      }}
    >
      <button
        ref={toggleRef}
        type="button"
        onClick={cycle}
        className="flex min-h-11 w-full items-center justify-between gap-2 border-b border-border/50 bg-background/95 px-4 py-2 text-left backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        aria-expanded={snap !== 'closed'}
        aria-controls="preview-sheet-content"
        id={sheetLabelId}
      >
        <span className="flex items-center gap-2">
          <GripHorizontal
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="text-sm font-medium">Live preview</span>
          <SnapLabel snap={snap} />
        </span>
        <span aria-hidden="true" className="text-muted-foreground">
          {snap === 'full' ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </span>
      </button>
      <div
        ref={contentRef}
        id="preview-sheet-content"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
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
          className="min-h-11 rounded-full shadow-md"
        >
          <ChevronUp className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Show preview
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}
