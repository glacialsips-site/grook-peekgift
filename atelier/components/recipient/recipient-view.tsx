'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  PeekVibeProvider,
  type Vibe as ProviderVibe,
} from '@/components/peek-vibe-provider';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import type { PeekDraft, Vibe } from '@/lib/peek/types';
import { CinematicReveal } from './cinematic-reveal';
import { Hero } from './hero';
import { NoteBlock } from './note-block';
import { CardDeck } from './card-deck';
import { usePeekPicks, type RecipientPick } from './realtime';

type Props = {
  draft: PeekDraft;
  recipientSessionId: string;
  initialPicks: RecipientPick[];
};

const PROVIDER_DEFAULT: ProviderVibe = {
  tone: 'warm',
  motion: 'soft',
  palette: {
    bg: '0 0% 100%',
    surface: '240 4.8% 97%',
    ink: '240 10% 3.9%',
    accent: '24 95% 53%',
    accent2: '280 65% 60%',
  },
};

function toProviderVibe(vibe: Vibe | null | undefined): ProviderVibe {
  if (!vibe) return PROVIDER_DEFAULT;
  return {
    tone: vibe.tone ?? PROVIDER_DEFAULT.tone,
    motion: vibe.motion ?? PROVIDER_DEFAULT.motion,
    mood_words: vibe.mood_words,
    palette: vibe.palette ?? PROVIDER_DEFAULT.palette,
    font_pairing: vibe.font_pairing,
  };
}

export function RecipientView({
  draft,
  recipientSessionId,
  initialPicks,
}: Props) {
  const { peek, cards, variantGroups } = draft;
  const providerVibe = useMemo(() => toProviderVibe(peek.vibe), [peek.vibe]);
  const [revealed, setRevealed] = useState(false);
  const { picks, pendingCardIds, mutate } = usePeekPicks(
    peek.id,
    recipientSessionId,
    initialPicks,
  );
  const { toast } = useToast();

  const pickedCardIds = useMemo(
    () => new Set(picks.map((p) => p.cardId)),
    [picks],
  );

  const pickByCardId = useMemo(() => {
    const m = new Map<string, RecipientPick>();
    for (const p of picks) m.set(p.cardId, p);
    return m;
  }, [picks]);

  const handlePick = useCallback(
    async (args: {
      cardId: string;
      begMessage?: string;
      recipientNote?: string;
    }) => {
      const { cardId, begMessage, recipientNote } = args;
      mutate.setPending(cardId, true);
      try {
        const res = await fetch('/api/pick', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            peekId: peek.id,
            cardId,
            recipientSessionId,
            begMessage,
            recipientNote,
          }),
        });
        const body = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !body.ok) {
          throw new Error(body.error ?? 'pick_failed');
        }
        mutate.refresh();
        return true;
      } catch (err) {
        toast({
          title: 'Could not save your pick',
          description: err instanceof Error ? err.message : 'unknown error',
          variant: 'destructive',
        });
        return false;
      } finally {
        mutate.setPending(cardId, false);
      }
    },
    [mutate, peek.id, recipientSessionId, toast],
  );

  const handleUnpick = useCallback(
    async (cardId: string) => {
      mutate.setPending(cardId, true);
      try {
        const res = await fetch('/api/pick', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            peekId: peek.id,
            cardId,
            recipientSessionId,
          }),
        });
        const body = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !body.ok) {
          throw new Error(body.error ?? 'unpick_failed');
        }
        mutate.refresh();
        return true;
      } catch (err) {
        toast({
          title: 'Could not undo your pick',
          description: err instanceof Error ? err.message : 'unknown error',
          variant: 'destructive',
        });
        return false;
      } finally {
        mutate.setPending(cardId, false);
      }
    },
    [mutate, peek.id, recipientSessionId, toast],
  );

  return (
    <PeekVibeProvider vibe={providerVibe}>
      <main
        className="relative min-h-[100dvh] bg-[hsl(var(--peek-bg))] text-[hsl(var(--peek-ink))]"
        aria-label={`A peek for ${peek.recipientName ?? 'you'}`}
      >
        <CinematicReveal
          peek={peek}
          cardCount={cards.length}
          motion={providerVibe.motion ?? 'soft'}
          revealed={revealed}
          onDone={() => setRevealed(true)}
          onSkip={() => setRevealed(true)}
        />
        <div className="flex flex-col">
          <Hero peek={peek} />
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 pb-32 pt-8 sm:pb-16">
            <NoteBlock peek={peek} revealed={revealed} />
            <CardDeck
              cards={cards}
              variantGroups={variantGroups}
              pickedCardIds={pickedCardIds}
              pickByCardId={pickByCardId}
              pendingCardIds={pendingCardIds}
              revealed={revealed}
              onPick={handlePick}
              onUnpick={handleUnpick}
              motion={providerVibe.motion ?? 'soft'}
            />
          </div>
        </div>
        <Toaster />
      </main>
    </PeekVibeProvider>
  );
}
