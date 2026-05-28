'use client';

import { motion } from 'framer-motion';
import type { Card } from '@/lib/peek/types';
import { cssUrl } from '@/lib/security/css-url';

type Props = { card: Card };

export function GagCard({ card }: Props) {
  return (
    <motion.div
      layout
      whileHover={{ rotate: -1 }}
      className="relative overflow-hidden border border-[hsl(var(--peek-ink))]/10 bg-[hsl(var(--peek-surface))]/70 shadow-sm"
      style={{ borderRadius: 'var(--peek-radius-lg)' }}
      role="figure"
      aria-label={`Gag card: ${card.tauntText ?? card.title}`}
    >
      {card.imageUrl ? (
        <div
          aria-hidden="true"
          className="relative h-44 w-full bg-cover bg-center sm:h-56"
          style={{ backgroundImage: cssUrl(card.imageUrl) }}
        >
          <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--peek-ink))]/15 p-4 text-center">
            <p
              className="italic text-[hsl(var(--peek-ink))] drop-shadow"
              style={{
                fontFamily: 'var(--peek-font-heading)',
                fontSize: 'var(--vibe-type-scale-h2)',
                fontWeight: 'var(--vibe-type-weight-h2)',
                letterSpacing: 'var(--vibe-type-tracking-h2)',
                lineHeight: 'var(--vibe-type-leading-h2)',
              }}
            >
              “{card.tauntText ?? card.title}”
            </p>
          </div>
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center p-6 text-center sm:h-48">
          <p
            className="italic text-[hsl(var(--peek-ink))]/85"
            style={{
              fontFamily: 'var(--peek-font-heading)',
              fontSize: 'var(--vibe-type-scale-h2)',
              fontWeight: 'var(--vibe-type-weight-h2)',
              letterSpacing: 'var(--vibe-type-tracking-h2)',
              lineHeight: 'var(--vibe-type-leading-h2)',
            }}
          >
            “{card.tauntText ?? card.title}”
          </p>
        </div>
      )}
      <div className="px-4 pb-4 pt-2">
        <p
          className="text-center uppercase text-[hsl(var(--peek-ink))]/40"
          style={{
            fontSize: 'var(--vibe-type-scale-small)',
            fontWeight: 'var(--vibe-type-weight-small)',
            letterSpacing: 'var(--vibe-type-tracking-small)',
            lineHeight: 'var(--vibe-type-leading-small)',
          }}
        >
          a wink, not an option
        </p>
      </div>
    </motion.div>
  );
}
