'use client';

import { useState, useTransition } from 'react';
import PeekPreview from '../../build/PeekPreview';
import type { Card, Peek, VariantGroup } from '@/lib/types';

interface Props {
  peek: Peek;
  cards: Card[];
  variantGroups: VariantGroup[];
  pickedCardIds: string[];
  slug: string;
}

export default function RecipientView({ peek, cards, variantGroups, pickedCardIds, slug }: Props) {
  const [picked, setPicked] = useState<Set<string>>(new Set(pickedCardIds));
  const [openCard, setOpenCard] = useState<Card | null>(null);
  const [note, setNote] = useState('');
  const [signature, setSignature] = useState('');
  const [beg, setBeg] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onPick(card: Card) {
    if (card.is_taunt) {
      setOpenCard(card);
      return;
    }
    setOpenCard(card);
    setError(null);
  }

  function confirm() {
    if (!openCard) return;
    startTransition(async () => {
      const r = await fetch('/api/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          card_id: openCard.id,
          recipient_signature: signature,
          recipient_note: note,
          beg_message: beg
        })
      });
      const data = await r.json();
      if (!data.ok) {
        setError(data.error || 'pick failed');
        return;
      }
      setPicked((s) => new Set([...s, openCard.id]));
      setDone(true);
    });
  }

  return (
    <>
      <PeekPreview
        peek={peek}
        cards={cards}
        variantGroups={variantGroups}
        pickedCardIds={picked}
        onPick={done ? undefined : onPick}
      />

      {openCard && !done && (
        <div className="fixed inset-0 z-30 bg-black/60 flex items-end sm:items-center justify-center p-3">
          <div className="stage w-full max-w-md rounded-2xl overflow-hidden">
            {openCard.is_taunt ? (
              <div className="p-8 text-center surface">
                <div className="text-4xl mb-3">😅</div>
                <div className="font-display text-2xl mb-2">{openCard.taunt_text || 'ha. denied.'}</div>
                <div className="text-sm opacity-60 mb-4">that one was a bit.</div>
                <button onClick={() => setOpenCard(null)} className="rounded-full bg-[var(--peek-accent)] text-black px-5 py-2">
                  back to the rest
                </button>
              </div>
            ) : (
              <div className="p-6 surface space-y-3">
                <div className="font-display text-2xl">pick this?</div>
                <div className="rounded-xl bg-black/5 p-3">
                  <div className="font-display text-lg">{openCard.title}</div>
                  {openCard.description && <div className="text-sm opacity-70 mt-1">{openCard.description}</div>}
                </div>
                {openCard.is_locked && (
                  <div>
                    <label className="text-xs uppercase tracking-wider opacity-60">
                      {(openCard.unlock_rule as any)?.beg_prompt || 'a little something to unlock this'}
                    </label>
                    <textarea
                      value={beg}
                      onChange={(e) => setBeg(e.target.value)}
                      rows={2}
                      className="mt-1 w-full rounded-xl border border-black/10 p-2 bg-white"
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs uppercase tracking-wider opacity-60">your name (for the curator)</label>
                  <input
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider opacity-60">say something back (optional)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-black/10 p-2 bg-white"
                  />
                </div>
                {error && <div className="text-sm text-red-600">{error}</div>}
                <div className="flex gap-2">
                  <button
                    onClick={() => setOpenCard(null)}
                    className="flex-1 rounded-full border border-black/10 px-4 py-2"
                  >
                    nevermind
                  </button>
                  <button
                    onClick={confirm}
                    disabled={pending}
                    className="flex-1 rounded-full bg-[var(--peek-accent)] text-black px-4 py-2 disabled:opacity-60"
                  >
                    {pending ? '…' : 'lock it in'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {done && (
        <div className="fixed inset-0 z-30 bg-black/70 flex items-center justify-center p-4">
          <div className="stage surface rounded-2xl p-8 max-w-md text-center">
            <div className="text-4xl mb-3">🎁</div>
            <div className="font-display text-2xl mb-1">picked.</div>
            <div className="opacity-70 text-sm">your curator just got a heads-up. they&apos;ll take it from here.</div>
          </div>
        </div>
      )}
    </>
  );
}
