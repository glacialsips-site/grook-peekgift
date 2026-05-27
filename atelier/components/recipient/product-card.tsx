'use client';

import { motion } from 'framer-motion';
import { Gift } from 'lucide-react';
import type { Card, VariantSelection } from '@/lib/peek/types';
import { cn } from '@/lib/utils';
import { PickButton } from './pick-button';
import type { RecipientPick } from './realtime';

type Props = {
  card: Card;
  isPicked: boolean;
  pick: RecipientPick | null;
  isPending: boolean;
  groupSelection?: VariantSelection;
  onPick: (args: { cardId: string }) => Promise<boolean>;
  onUnpick: (cardId: string) => Promise<boolean>;
};

function formatPrice(cents: number | null): string | null {
  if (cents == null) return null;
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: dollars % 1 === 0 ? 0 : 2,
  }).format(dollars);
}

export function ProductCard({
  card,
  isPicked,
  isPending,
  groupSelection,
  onPick,
  onUnpick,
}: Props) {
  const price = card.revealValue ? formatPrice(card.valueCents) : null;
  const lockedByGroup =
    groupSelection === 'pick_all' && !isPicked ? true : false;

  return (
    <motion.div
      layout
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-2xl border border-[hsl(var(--peek-ink))]/10 bg-[hsl(var(--peek-surface))] shadow-sm transition-colors',
        isPicked && 'ring-2 ring-[hsl(var(--peek-accent))]/60',
      )}
    >
      {card.imageUrl ? (
        <div
          role="img"
          aria-label={card.title}
          className="relative h-48 w-full bg-cover bg-center sm:h-56"
          style={{ backgroundImage: `url(${card.imageUrl})` }}
        />
      ) : (
        <div
          aria-hidden="true"
          className="relative flex h-36 w-full items-end overflow-hidden p-4 sm:h-40"
          style={{
            background:
              'linear-gradient(135deg, hsl(var(--peek-accent) / 0.22) 0%, hsl(var(--peek-accent2) / 0.16) 100%)',
          }}
        >
          <Gift
            className="pointer-events-none absolute -right-2 -top-2 h-16 w-16 text-[hsl(var(--peek-accent))]/40"
            aria-hidden="true"
          />
          <span
            className="text-[10px] uppercase tracking-widest text-[hsl(var(--peek-accent))]/85"
            style={{ fontFamily: 'var(--peek-font-heading)' }}
          >
            gift
          </span>
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3
            className={cn(
              'leading-tight',
              card.imageUrl
                ? 'text-base font-medium'
                : 'text-lg font-semibold',
            )}
            style={
              card.imageUrl
                ? undefined
                : { fontFamily: 'var(--peek-font-heading)' }
            }
          >
            {card.title}
          </h3>
          {price ? (
            <span className="shrink-0 rounded-full bg-[hsl(var(--peek-accent))]/10 px-2 py-0.5 text-xs font-medium text-[hsl(var(--peek-accent))]">
              {price}
            </span>
          ) : null}
        </div>
        {card.description ? (
          <p className="text-sm text-[hsl(var(--peek-ink))]/70">
            {card.description}
          </p>
        ) : null}
        <PickButton
          isPicked={isPicked || groupSelection === 'pick_all'}
          isPending={isPending}
          onPick={() => onPick({ cardId: card.id })}
          onUnpick={() => onUnpick(card.id)}
          pickLabel={groupSelection === 'pick_one' ? 'Pick this one' : 'Yes please'}
          pickedLabel={
            groupSelection === 'pick_all' ? 'Included' : "It's yours"
          }
          className={lockedByGroup ? 'pointer-events-none opacity-70' : ''}
        />
      </div>
    </motion.div>
  );
}
