'use client';

import { motion } from 'framer-motion';
import { Lock, Sparkle } from 'lucide-react';
import type { ReactNode } from 'react';
import type { VariantGroup, VariantSelection } from '@/lib/peek/types';
import { cn } from '@/lib/utils';

type Props = {
  group: VariantGroup;
  memberCount: number;
  children: ReactNode;
  className?: string;
  initialAnimation?: boolean;
  delay?: number;
};

const SELECTION_LABEL: Record<VariantSelection, string> = {
  pick_one: 'Pick one',
  pick_any: 'Pick any',
  pick_all: 'All of these',
};

export function gridClassesForCount(count: number): string {
  if (count >= 3) return 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3';
  if (count === 2) return 'grid grid-cols-1 gap-3 sm:grid-cols-2';
  return 'grid grid-cols-1 gap-3';
}

export function VariantGroupContainer({
  group,
  memberCount,
  children,
  className,
  initialAnimation = true,
  delay = 0,
}: Props) {
  const label = SELECTION_LABEL[group.selection];
  const memberCopy =
    memberCount === 0
      ? 'no picks yet'
      : memberCount === 1
        ? '1 option'
        : `${memberCount} options`;

  return (
    <motion.section
      layout
      initial={initialAnimation ? { opacity: 0, y: 14 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={cn(
        'relative overflow-hidden border shadow-sm',
        className,
      )}
      style={{
        borderRadius: 'var(--vibe-radius-card, var(--peek-radius-lg))',
        borderColor: 'hsl(var(--peek-accent) / 0.32)',
        backgroundColor: 'hsl(var(--peek-surface) / 0.7)',
      }}
      aria-label={`${group.title} — ${label}`}
    >
      <header
        className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"
        style={{
          backgroundColor: 'hsl(var(--peek-accent) / 0.08)',
          borderBottomColor: 'hsl(var(--peek-accent) / 0.2)',
        }}
      >
        <div className="flex min-w-0 flex-col">
          <h3
            className="truncate text-base font-semibold leading-tight"
            style={{
              fontFamily: 'var(--peek-font-heading)',
              color: 'hsl(var(--peek-ink))',
            }}
          >
            <Sparkle
              className="mr-1.5 inline h-3.5 w-3.5"
              aria-hidden="true"
              style={{ color: 'hsl(var(--peek-accent))' }}
            />
            {group.title}
          </h3>
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{
              color: 'hsl(var(--peek-ink) / 0.55)',
              fontFamily: 'var(--peek-font-body)',
            }}
          >
            {memberCopy}
          </span>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider"
          style={{
            borderRadius: 'var(--vibe-radius-button, 9999px)',
            backgroundColor: 'hsl(var(--peek-accent) / 0.16)',
            color: 'hsl(var(--peek-accent))',
            fontFamily: 'var(--peek-font-body)',
          }}
        >
          {group.selection === 'pick_all' ? (
            <Lock className="h-3 w-3" aria-hidden="true" />
          ) : null}
          {label}
        </span>
      </header>
      <div className="p-4">{children}</div>
    </motion.section>
  );
}
