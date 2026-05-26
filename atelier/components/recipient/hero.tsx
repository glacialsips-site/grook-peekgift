'use client';

import { motion } from 'framer-motion';
import type { Peek } from '@/lib/peek/types';

type Props = { peek: Peek };

export function Hero({ peek }: Props) {
  const name = peek.recipientName ?? 'you';
  const subtitleParts = [peek.relationship, peek.occasion].filter(
    (v): v is string => Boolean(v),
  );
  const display = peek.vibe?.font_pairing?.display;

  return (
    <header className="relative w-full overflow-hidden">
      {peek.heroImageUrl ? (
        <div
          role="img"
          aria-label={`Hero image for ${name}`}
          className="relative h-[55dvh] min-h-[320px] w-full sm:h-[65dvh]"
        >
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${peek.heroImageUrl})` }}
            initial={{ scale: 1.04, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(var(--peek-bg))]/0 to-[hsl(var(--peek-bg))]"
          />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 px-6 pb-8 text-[hsl(var(--peek-ink))]">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
              className="text-3xl font-semibold tracking-tight drop-shadow-sm sm:text-5xl"
              style={display ? { fontFamily: display } : undefined}
            >
              {name}
            </motion.h1>
            {subtitleParts.length > 0 ? (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7, ease: 'easeOut' }}
                className="text-sm text-[hsl(var(--peek-ink))]/70 sm:text-base"
              >
                {subtitleParts.join(' · ')}
              </motion.p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="relative flex h-[40dvh] min-h-[240px] w-full flex-col items-center justify-center bg-gradient-to-br from-[hsl(var(--peek-accent))]/40 via-[hsl(var(--peek-accent2))]/30 to-[hsl(var(--peek-surface))] px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="text-3xl font-semibold tracking-tight text-[hsl(var(--peek-ink))] sm:text-5xl"
            style={display ? { fontFamily: display } : undefined}
          >
            {name}
          </motion.h1>
          {subtitleParts.length > 0 ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
              className="mt-2 text-sm text-[hsl(var(--peek-ink))]/70 sm:text-base"
            >
              {subtitleParts.join(' · ')}
            </motion.p>
          ) : null}
        </div>
      )}
    </header>
  );
}
