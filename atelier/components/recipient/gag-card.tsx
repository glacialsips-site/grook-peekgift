'use client';

import { motion } from 'framer-motion';
import type { Card } from '@/lib/peek/types';

type Props = { card: Card };

export function GagCard({ card }: Props) {
  return (
    <motion.div
      layout
      whileHover={{ rotate: -1 }}
      className="relative overflow-hidden rounded-2xl border border-[hsl(var(--peek-ink))]/10 bg-[hsl(var(--peek-surface))]/70 shadow-sm"
      aria-label="Decorative card"
    >
      {card.imageUrl ? (
        <div
          className="relative h-44 w-full bg-cover bg-center sm:h-56"
          style={{ backgroundImage: `url(${card.imageUrl})` }}
        >
          <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--peek-ink))]/15 p-4 text-center">
            <p className="font-serif text-2xl italic text-[hsl(var(--peek-ink))] drop-shadow sm:text-3xl">
              “{card.tauntText ?? card.title}”
            </p>
          </div>
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center p-6 text-center sm:h-48">
          <p className="font-serif text-2xl italic text-[hsl(var(--peek-ink))]/85 sm:text-3xl">
            “{card.tauntText ?? card.title}”
          </p>
        </div>
      )}
      <div className="px-4 pb-4 pt-2">
        <p className="text-center text-xs uppercase tracking-widest text-[hsl(var(--peek-ink))]/40">
          a wink, not an option
        </p>
      </div>
    </motion.div>
  );
}
