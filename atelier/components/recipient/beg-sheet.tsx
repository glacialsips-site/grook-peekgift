'use client';

import { useEffect, useState } from 'react';
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
import type { Card } from '@/lib/peek/types';

type Props = {
  open: boolean;
  card: Card;
  initialMessage?: string;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (begMessage: string) => Promise<boolean>;
};

export function BegSheet({
  open,
  card,
  initialMessage,
  isPending,
  onClose,
  onSubmit,
}: Props) {
  const [text, setText] = useState(initialMessage ?? '');

  useEffect(() => {
    if (open) setText(initialMessage ?? '');
  }, [open, initialMessage]);

  const prompt = card.unlockRule?.beg_prompt ?? 'Make your case';

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const ok = await onSubmit(trimmed);
    if (ok) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{prompt}</DialogTitle>
          <DialogDescription>
            Tell them why you want this. They'll decide whether to unlock it.
          </DialogDescription>
        </DialogHeader>
        <label htmlFor="beg-message" className="sr-only">
          Your case
        </label>
        <Textarea
          id="beg-message"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Make your case..."
          rows={5}
          maxLength={1800}
        />
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            className="min-h-11"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={isPending || text.trim().length === 0}
            className="min-h-11"
            aria-busy={isPending}
          >
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
