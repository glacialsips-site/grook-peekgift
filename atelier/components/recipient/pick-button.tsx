'use client';

import { useState } from 'react';
import { Check, Heart, Loader2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  isPicked: boolean;
  isPending: boolean;
  onPick: () => Promise<boolean>;
  onUnpick: () => Promise<boolean>;
  pickLabel?: string;
  pickedLabel?: string;
  className?: string;
};

export function PickButton({
  isPicked,
  isPending,
  onPick,
  onUnpick,
  pickLabel = 'Pick this',
  pickedLabel = 'Picked',
  className,
}: Props) {
  const [justConfirmed, setJustConfirmed] = useState(false);

  const handle = async () => {
    if (isPending) return;
    if (isPicked) {
      await onUnpick();
      return;
    }
    const ok = await onPick();
    if (ok) {
      setJustConfirmed(true);
      setTimeout(() => setJustConfirmed(false), 900);
    }
  };

  return (
    <Button
      type="button"
      onClick={handle}
      disabled={isPending}
      variant={isPicked ? 'secondary' : 'default'}
      className={cn(
        'group relative w-full overflow-hidden transition-colors',
        isPicked
          ? 'bg-[hsl(var(--peek-accent))]/15 text-[hsl(var(--peek-accent))] hover:bg-[hsl(var(--peek-accent))]/25'
          : 'bg-[hsl(var(--peek-accent))] text-white hover:bg-[hsl(var(--peek-accent))]/90',
        className,
      )}
      aria-pressed={isPicked}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isPicked ? (
        <>
          <Check className="h-4 w-4" />
          <span>{pickedLabel}</span>
          <X className="ml-2 h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100" />
        </>
      ) : (
        <>
          <Heart className="h-4 w-4" />
          <span>{pickLabel}</span>
        </>
      )}
      {justConfirmed ? (
        <motion.span
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 m-auto h-3 w-3 rounded-full bg-[hsl(var(--peek-accent))]/40"
        />
      ) : null}
    </Button>
  );
}
