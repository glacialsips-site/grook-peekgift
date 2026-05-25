'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  onPick: (args: {
    cardId: string;
    recipientNote?: string;
  }) => Promise<boolean>;
  onUnpick: (cardId: string) => Promise<boolean>;
};

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function ActivityCard({
  card,
  isPicked,
  pick,
  isPending,
  onPick,
  onUnpick,
}: Props) {
  const date = formatDate(card.proposedDate);
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterText, setCounterText] = useState(pick?.recipientNote ?? '');

  const submitCounter = async () => {
    const ok = await onPick({
      cardId: card.id,
      recipientNote: counterText.trim() || undefined,
    });
    if (ok) setCounterOpen(false);
  };

  return (
    <>
      <motion.div
        layout
        className={cn(
          'overflow-hidden rounded-2xl border border-[hsl(var(--peek-ink))]/10 bg-[hsl(var(--peek-surface))] shadow-sm',
          isPicked && 'ring-2 ring-[hsl(var(--peek-accent))]/60',
        )}
      >
        {card.imageUrl ? (
          <div
            className="relative h-48 w-full bg-cover bg-center sm:h-56"
            style={{ backgroundImage: `url(${card.imageUrl})` }}
          />
        ) : null}
        <div className="flex flex-col gap-3 p-4">
          <h3 className="text-base font-medium leading-tight">{card.title}</h3>
          {card.description ? (
            <p className="text-sm text-[hsl(var(--peek-ink))]/70">
              {card.description}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 text-xs text-[hsl(var(--peek-ink))]/60">
            {date ? (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {date}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 italic">
                <CalendarDays className="h-3 w-3" />
                you propose a time
              </span>
            )}
            {card.locationHint ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {card.locationHint}
              </span>
            ) : null}
          </div>
          {pick?.recipientNote ? (
            <p className="rounded-md bg-[hsl(var(--peek-bg))]/40 px-3 py-2 text-xs italic text-[hsl(var(--peek-ink))]/70">
              your reply: {pick.recipientNote}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <PickButton
              isPicked={isPicked}
              isPending={isPending}
              onPick={() => onPick({ cardId: card.id })}
              onUnpick={() => onUnpick(card.id)}
              pickLabel="Yes — let's do it"
              pickedLabel="On the calendar"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              className="border-[hsl(var(--peek-ink))]/15 bg-transparent text-[hsl(var(--peek-ink))]"
              onClick={() => {
                setCounterText(pick?.recipientNote ?? '');
                setCounterOpen(true);
              }}
              disabled={isPending}
            >
              Counter-propose
            </Button>
          </div>
        </div>
      </motion.div>
      <Dialog open={counterOpen} onOpenChange={setCounterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suggest a different time or place</DialogTitle>
            <DialogDescription>
              Send a quick note back to the giver. They'll get pinged.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={counterText}
            onChange={(e) => setCounterText(e.target.value)}
            placeholder="What works better for you?"
            rows={4}
            maxLength={1800}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCounterOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitCounter}
              disabled={isPending || counterText.trim().length === 0}
            >
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
