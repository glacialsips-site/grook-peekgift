'use client';

import { motion } from 'framer-motion';
import type { Peek } from '@/lib/peek/types';
import { cssUrl } from '@/lib/security/css-url';

type Props = { peek: Peek };

export function Hero({ peek }: Props) {
  const name = peek.recipientName ?? 'you';
  const givers = peek.giverNames ?? [];
  const hasGivers = givers.length > 0;
  const display = peek.vibe?.font_pairing?.display;
  const headingFont = display ?? 'var(--peek-font-heading)';

  if (peek.heroImageUrl) {
    return (
      <header className="relative w-full overflow-hidden">
        <div
          role="img"
          aria-label={`Hero image for ${name}`}
          className="relative h-[55dvh] min-h-[340px] w-full sm:h-[62dvh]"
        >
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: cssUrl(peek.heroImageUrl) }}
            initial={{ scale: 1.04, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.18) 45%, transparent 70%)',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 px-6 pb-8 sm:pb-10">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
              className="text-white drop-shadow-lg"
              style={{
                fontFamily: headingFont,
                fontSize: 'var(--vibe-type-scale-display)',
                fontWeight: 'var(--vibe-type-weight-display)',
                letterSpacing: 'var(--vibe-type-tracking-display)',
                lineHeight: 'var(--vibe-type-leading-display)',
              }}
            >
              {name}
            </motion.h1>
            {peek.occasion ? (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.65, ease: 'easeOut' }}
                className="text-white/90 drop-shadow"
                style={{
                  fontFamily: headingFont,
                  fontSize: 'var(--vibe-type-scale-h3)',
                  fontWeight: 'var(--vibe-type-weight-h3)',
                  letterSpacing: 'var(--vibe-type-tracking-h3)',
                  lineHeight: 'var(--vibe-type-leading-h3)',
                }}
              >
                {peek.occasion}
              </motion.p>
            ) : peek.relationship ? (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.65, ease: 'easeOut' }}
                className="text-white/85 drop-shadow"
                style={{
                  fontSize: 'var(--vibe-type-scale-body)',
                  fontWeight: 'var(--vibe-type-weight-body)',
                  letterSpacing: 'var(--vibe-type-tracking-body)',
                  lineHeight: 'var(--vibe-type-leading-body)',
                }}
              >
                {peek.relationship}
              </motion.p>
            ) : null}
            {hasGivers ? (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.85, ease: 'easeOut' }}
                className="uppercase text-white/80 drop-shadow"
                style={{
                  fontSize: 'var(--vibe-type-scale-small)',
                  fontWeight: 'var(--vibe-type-weight-small)',
                  letterSpacing: 'var(--vibe-type-tracking-small)',
                  lineHeight: 'var(--vibe-type-leading-small)',
                }}
              >
                from {givers.join(', ')}
              </motion.p>
            ) : null}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="relative w-full overflow-hidden">
      <div className="relative flex h-[45dvh] min-h-[280px] w-full flex-col items-start justify-end bg-gradient-to-br from-[hsl(var(--peek-accent))]/55 via-[hsl(var(--peek-accent2))]/40 to-[hsl(var(--peek-surface))] px-6 pb-8 sm:h-[52dvh] sm:pb-10">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="text-[hsl(var(--peek-ink))]"
          style={{
            fontFamily: headingFont,
            fontSize: 'var(--vibe-type-scale-display)',
            fontWeight: 'var(--vibe-type-weight-display)',
            letterSpacing: 'var(--vibe-type-tracking-display)',
            lineHeight: 'var(--vibe-type-leading-display)',
          }}
        >
          {name}
        </motion.h1>
        {peek.occasion ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
            className="mt-2 text-[hsl(var(--peek-ink))]/75"
            style={{
              fontFamily: headingFont,
              fontSize: 'var(--vibe-type-scale-h3)',
              fontWeight: 'var(--vibe-type-weight-h3)',
              letterSpacing: 'var(--vibe-type-tracking-h3)',
              lineHeight: 'var(--vibe-type-leading-h3)',
            }}
          >
            {peek.occasion}
          </motion.p>
        ) : peek.relationship ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-2 text-[hsl(var(--peek-ink))]/70"
            style={{
              fontSize: 'var(--vibe-type-scale-body)',
              fontWeight: 'var(--vibe-type-weight-body)',
              letterSpacing: 'var(--vibe-type-tracking-body)',
              lineHeight: 'var(--vibe-type-leading-body)',
            }}
          >
            {peek.relationship}
          </motion.p>
        ) : null}
        {hasGivers ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.6 }}
            className="mt-1 uppercase text-[hsl(var(--peek-ink))]/60"
            style={{
              fontSize: 'var(--vibe-type-scale-small)',
              fontWeight: 'var(--vibe-type-weight-small)',
              letterSpacing: 'var(--vibe-type-tracking-small)',
              lineHeight: 'var(--vibe-type-leading-small)',
            }}
          >
            from {givers.join(', ')}
          </motion.p>
        ) : null}
      </div>
    </header>
  );
}
