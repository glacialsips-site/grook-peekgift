'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Card, VariantSelection } from '@/lib/peek/types';
import { cssUrl } from '@/lib/security/css-url';
import { PickButton } from './pick-button';
import { BegSheet } from './beg-sheet';
import type { RecipientPick } from './realtime';

type Props = {
  card: Card;
  isPicked: boolean;
  pick: RecipientPick | null;
  isPending: boolean;
  groupSelection?: VariantSelection;
  onPick: (args: {
    cardId: string;
    begMessage?: string;
  }) => Promise<boolean>;
  onUnpick: (cardId: string) => Promise<boolean>;
};

export function AspirationalCard({
  card,
  isPicked,
  pick,
  isPending,
  onPick,
  onUnpick,
}: Props) {
  const [begOpen, setBegOpen] = useState(false);
  const needsBeg = card.isLocked && card.unlockRule?.kind === 'beg';

  const submitBeg = async (begMessage: string) => {
    return onPick({ cardId: card.id, begMessage });
  };

  return (
    <>
      <motion.div
        layout
        className={cn(
          'relative overflow-hidden border border-[hsl(var(--peek-accent))]/30 bg-[hsl(var(--peek-surface))] shadow-md',
          isPicked && 'ring-2 ring-[hsl(var(--peek-accent))]/60',
        )}
        style={{ borderRadius: 'var(--peek-radius-lg)' }}
      >
        {card.imageUrl ? (
          <div
            role="img"
            aria-label={card.title}
            className="relative h-56 w-full bg-cover bg-center sm:h-72"
            style={{ backgroundImage: cssUrl(card.imageUrl) }}
          >
            {card.isLocked ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[hsl(var(--peek-bg))]/55 backdrop-blur-sm">
                <Lock
                  className="h-6 w-6 text-[hsl(var(--peek-ink))]/70"
                  aria-hidden="true"
                />
                <p
                  className="px-6 text-center text-[hsl(var(--peek-ink))]/85"
                  style={{
                    fontSize: 'var(--vibe-type-scale-body)',
                    fontWeight: 'var(--vibe-type-weight-body)',
                    letterSpacing: 'var(--vibe-type-tracking-body)',
                    lineHeight: 'var(--vibe-type-leading-body)',
                  }}
                >
                  {card.unlockRule?.beg_prompt ?? 'Locked — make your case'}
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <div
            aria-hidden="true"
            className="relative flex h-44 w-full items-center justify-center bg-gradient-to-br from-[hsl(var(--peek-accent))]/40 to-[hsl(var(--peek-accent2))]/40"
          >
            <Sparkles className="h-8 w-8 text-[hsl(var(--peek-ink))]/60" />
          </div>
        )}
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3
              style={{
                fontFamily: 'var(--peek-font-heading)',
                fontSize: 'var(--vibe-type-scale-h2)',
                fontWeight: 'var(--vibe-type-weight-h2)',
                letterSpacing: 'var(--vibe-type-tracking-h2)',
                lineHeight: 'var(--vibe-type-leading-h2)',
              }}
            >
              {card.title}
            </h3>
            {card.isLocked ? (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[hsl(var(--peek-accent))]/15 px-2 py-0.5 text-[hsl(var(--peek-accent))]"
                style={{
                  fontSize: 'var(--vibe-type-scale-small)',
                  fontWeight: 'var(--vibe-type-weight-small)',
                  letterSpacing: 'var(--vibe-type-tracking-small)',
                  lineHeight: 'var(--vibe-type-leading-small)',
                }}
              >
                <Lock className="h-3 w-3" aria-hidden="true" />
                locked
              </span>
            ) : null}
          </div>
          {card.description ? (
            <p
              className="text-[hsl(var(--peek-ink))]/70"
              style={{
                fontSize: 'var(--vibe-type-scale-body)',
                fontWeight: 'var(--vibe-type-weight-body)',
                letterSpacing: 'var(--vibe-type-tracking-body)',
                lineHeight: 'var(--vibe-type-leading-body)',
              }}
            >
              {card.description}
            </p>
          ) : null}
          {pick?.begMessage ? (
            <p
              className="rounded-md bg-[hsl(var(--peek-bg))]/40 px-3 py-2 italic text-[hsl(var(--peek-ink))]/70"
              style={{
                fontSize: 'var(--vibe-type-scale-small)',
                fontWeight: 'var(--vibe-type-weight-small)',
                letterSpacing: 'var(--vibe-type-tracking-small)',
                lineHeight: 'var(--vibe-type-leading-small)',
              }}
            >
              your case: {pick.begMessage}
            </p>
          ) : null}
          {needsBeg && !isPicked ? (
            <Button
              type="button"
              onClick={() => setBegOpen(true)}
              disabled={isPending}
              className="min-h-11 w-full bg-[hsl(var(--peek-accent))] text-white hover:bg-[hsl(var(--peek-accent))]/90"
              aria-label={`Make your case for ${card.title}`}
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Make your case
            </Button>
          ) : (
            <PickButton
              isPicked={isPicked}
              isPending={isPending}
              onPick={() => onPick({ cardId: card.id })}
              onUnpick={() => onUnpick(card.id)}
              pickLabel="I want this"
              pickedLabel="Asked for"
            />
          )}
        </div>
      </motion.div>
      <BegSheet
        open={begOpen}
        card={card}
        initialMessage={pick?.begMessage ?? undefined}
        isPending={isPending}
        onClose={() => setBegOpen(false)}
        onSubmit={submitBeg}
      />
    </>
  );
}
