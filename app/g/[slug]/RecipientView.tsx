'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { Card, Peek, VariantGroup } from '@/lib/types';
import { vibeToCssVars, DEFAULT_VIBE } from '@/lib/themes';
import Confetti from './Confetti';

interface Props {
  peek: Peek;
  cards: Card[];
  variantGroups: VariantGroup[];
  pickedCardIds: string[];
  slug: string;
}

export default function RecipientView({ peek, cards, variantGroups, pickedCardIds, slug }: Props) {
  const style = useMemo(() => vibeToCssVars(peek.vibe || DEFAULT_VIBE), [peek.vibe]);
  const [phase, setPhase] = useState<'door' | 'note' | 'cards' | 'done'>('door');
  const [picked, setPicked] = useState<Set<string>>(new Set(pickedCardIds));
  const [openCard, setOpenCard] = useState<Card | null>(null);
  const [note, setNote] = useState('');
  const [signature, setSignature] = useState('');
  const [beg, setBeg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [celebrating, setCelebrating] = useState(false);
  const cardsRef = useRef<HTMLDivElement>(null);

  const grouped = useMemo(() => {
    const byGroup: Record<string, Card[]> = {};
    const standalone: Card[] = [];
    for (const c of cards) {
      if (c.variant_group_id) (byGroup[c.variant_group_id] ||= []).push(c);
      else standalone.push(c);
    }
    return { byGroup, standalone };
  }, [cards]);

  useEffect(() => {
    if (phase === 'note' && !peek.note_md) {
      const t = setTimeout(() => setPhase('cards'), 600);
      return () => clearTimeout(t);
    }
  }, [phase, peek.note_md]);

  function onPick(card: Card) {
    if (card.is_taunt) {
      setOpenCard(card);
      return;
    }
    if (picked.has(card.id)) return;
    setOpenCard(card);
    setError(null);
    setNote('');
    setBeg('');
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
      setOpenCard(null);
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 2500);
    });
  }

  const finalChoiceMade = picked.size > 0;

  return (
    <main className="stage min-h-dvh vibe-mesh relative overflow-x-hidden" style={style}>
      {celebrating && <Confetti color={(peek.vibe as any)?.palette?.accent || '#ff5a3c'} />}

      {phase === 'door' && (
        <DoorPhase peek={peek} onOpen={() => setPhase(peek.note_md ? 'note' : 'cards')} />
      )}

      {phase === 'note' && peek.note_md && (
        <NotePhase peek={peek} onContinue={() => setPhase('cards')} />
      )}

      {phase === 'cards' && (
        <div ref={cardsRef} className="min-h-dvh">
          <div className="relative">
            {peek.hero_image_url ? (
              <div
                className="w-full aspect-[16/7] sm:aspect-[16/5] bg-cover bg-center"
                style={{ backgroundImage: `url(${peek.hero_image_url})` }}
              />
            ) : (
              <div className="w-full aspect-[16/7] sm:aspect-[16/5] bg-gradient-to-br from-[var(--peek-accent)]/40 to-[var(--peek-accent-2)]/40" />
            )}
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 bg-gradient-to-t from-black/70 via-black/40 to-transparent text-white">
              <div className="text-[11px] uppercase tracking-[0.22em] opacity-85">{peek.occasion || 'a peek'}</div>
              <h1 className="font-display text-3xl sm:text-5xl leading-tight mt-1">
                for {peek.recipient_name || 'you'}
              </h1>
            </div>
          </div>

          {peek.note_md && (
            <div className="max-w-2xl mx-auto px-5 pt-6">
              <div className="surface rounded-2xl p-5 shadow-sm">
                <div className="text-[11px] uppercase tracking-[0.22em] opacity-50 mb-2">a note</div>
                <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{peek.note_md}</div>
              </div>
            </div>
          )}

          <CardsReveal
            cards={grouped.standalone}
            groups={variantGroups}
            byGroup={grouped.byGroup}
            picked={picked}
            onPick={onPick}
          />

          {finalChoiceMade && (
            <div className="max-w-2xl mx-auto px-5 pb-16 pt-8">
              <div className="text-center surface rounded-3xl p-8">
                <div className="text-4xl mb-2">🎁</div>
                <div className="font-display text-2xl">picked.</div>
                <div className="opacity-70 text-sm mt-1">your curator just got the heads-up.</div>
              </div>
            </div>
          )}
        </div>
      )}

      {openCard && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-end sm:items-center justify-center p-3 backdrop-blur-sm">
          <div className="stage w-full max-w-md rounded-3xl overflow-hidden surface animate-rise">
            {openCard.is_taunt ? (
              <div className="p-8 text-center">
                <div className="text-5xl mb-3">😅</div>
                <div className="font-display text-2xl mb-2">{openCard.taunt_text || 'ha. denied.'}</div>
                <div className="text-sm opacity-60 mb-5">that one was a bit.</div>
                <button onClick={() => setOpenCard(null)} className="rounded-full bg-[var(--peek-accent)] text-black px-6 py-2.5 font-medium">
                  back to the rest
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-3">
                {openCard.image_url && (
                  <img src={openCard.image_url} alt="" className="w-full aspect-[16/9] object-cover rounded-2xl" />
                )}
                <div className="text-[11px] uppercase tracking-[0.22em] opacity-50">pick this?</div>
                <div className="font-display text-2xl">{openCard.title}</div>
                {openCard.description && <div className="text-sm opacity-75">{openCard.description}</div>}
                {openCard.is_locked && (
                  <div>
                    <label className="text-[11px] uppercase tracking-wider opacity-60">
                      {(openCard.unlock_rule as any)?.beg_prompt || 'unlock it — say what you need to say'}
                    </label>
                    <textarea
                      value={beg}
                      onChange={(e) => setBeg(e.target.value)}
                      rows={2}
                      placeholder="please...?"
                      className="mt-1 w-full rounded-xl border border-black/10 p-2 bg-white/95 text-black"
                    />
                  </div>
                )}
                <div>
                  <label className="text-[11px] uppercase tracking-wider opacity-60">your name</label>
                  <input
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 p-2 bg-white/95 text-black"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider opacity-60">say something back (optional)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-black/10 p-2 bg-white/95 text-black"
                  />
                </div>
                {error && <div className="text-sm text-red-500">{error}</div>}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setOpenCard(null)} className="flex-1 rounded-full border border-black/15 px-4 py-2.5">
                    nevermind
                  </button>
                  <button
                    onClick={confirm}
                    disabled={pending}
                    className="flex-1 rounded-full bg-[var(--peek-accent)] text-black px-4 py-2.5 font-medium disabled:opacity-60"
                  >
                    {pending ? '…' : 'lock it in'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function DoorPhase({ peek, onOpen }: { peek: Peek; onOpen: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 80);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="min-h-dvh relative overflow-hidden flex items-center justify-center">
      {peek.hero_image_url && (
        <div
          className="absolute inset-0 bg-cover bg-center scale-110"
          style={{ backgroundImage: `url(${peek.hero_image_url})`, filter: 'blur(18px) brightness(0.55)' }}
        />
      )}
      <div className="absolute inset-0 vibe-mesh opacity-90" />
      <div className={`relative text-center max-w-md px-6 transition-all duration-1000 ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <div className="text-[11px] uppercase tracking-[0.32em] opacity-70 mb-4">a peek for you</div>
        <div className="font-display italic text-5xl sm:text-6xl leading-[1.05]">
          {peek.recipient_name || 'you'}
        </div>
        {peek.occasion && (
          <div className="mt-3 text-sm opacity-70 uppercase tracking-[0.25em]">{peek.occasion}</div>
        )}
        <button
          onClick={onOpen}
          className="mt-12 rounded-full bg-[var(--peek-accent)] text-black px-8 py-4 text-lg font-medium shadow-lg hover:scale-105 transition"
        >
          tap to open
        </button>
        <div className="mt-8 text-xs opacity-50">someone made this just for you.</div>
      </div>
    </div>
  );
}

function NotePhase({ peek, onContinue }: { peek: Peek; onContinue: () => void }) {
  const [typed, setTyped] = useState('');
  const target = peek.note_md || '';
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i = Math.min(target.length, i + Math.max(1, Math.round(target.length / 80)));
      setTyped(target.slice(0, i));
      if (i >= target.length) clearInterval(id);
    }, 25);
    return () => clearInterval(id);
  }, [target]);
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        <div className="text-[11px] uppercase tracking-[0.22em] opacity-50 mb-3">a note before</div>
        <div className="font-display text-xl sm:text-2xl leading-relaxed whitespace-pre-wrap">
          {typed}
          <span className="inline-block w-[2px] h-[1em] bg-[var(--peek-accent)] align-middle animate-pulse ml-0.5" />
        </div>
        <button
          onClick={onContinue}
          className="mt-10 rounded-full border border-current/20 px-6 py-2.5 text-sm hover:bg-[var(--peek-accent)] hover:text-black hover:border-transparent transition"
        >
          show me what you picked →
        </button>
      </div>
    </div>
  );
}

function CardsReveal({
  cards,
  groups,
  byGroup,
  picked,
  onPick
}: {
  cards: Card[];
  groups: VariantGroup[];
  byGroup: Record<string, Card[]>;
  picked: Set<string>;
  onPick: (c: Card) => void;
}) {
  return (
    <div className="max-w-3xl mx-auto px-5 pt-6 pb-12">
      {cards.length + groups.length === 0 ? (
        <div className="text-center opacity-50 py-12 font-display">your curator's still cooking…</div>
      ) : (
        <div className="space-y-4">
          {cards.map((c, idx) => (
            <RevealCard key={c.id} card={c} delay={idx * 120} picked={picked.has(c.id)} onPick={onPick} />
          ))}
          {groups.map((vg, idx) => {
            const items = byGroup[vg.id] || [];
            if (!items.length) return null;
            return (
              <div
                key={vg.id}
                className="surface rounded-2xl p-4 animate-rise"
                style={{ animationDelay: `${(cards.length + idx) * 120}ms` }}
              >
                <div className="text-[11px] uppercase tracking-[0.22em] opacity-60 mb-2">
                  {vg.selection === 'pick_one' ? 'pick exactly one' : vg.selection === 'pick_any' ? 'pick any you want' : 'all of these'}
                </div>
                <div className="font-display text-xl mb-3">{vg.title}</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {items.map((c) => (
                    <CompactTile key={c.id} card={c} picked={picked.has(c.id)} onPick={onPick} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RevealCard({
  card,
  delay,
  picked,
  onPick
}: {
  card: Card;
  delay: number;
  picked: boolean;
  onPick: (c: Card) => void;
}) {
  const dollars = card.reveal_value && card.value_cents != null ? `$${(card.value_cents / 100).toFixed(0)}` : null;
  return (
    <button
      type="button"
      onClick={() => onPick(card)}
      disabled={picked}
      className={`w-full text-left surface rounded-3xl overflow-hidden shadow-sm transition border-2 animate-rise ${
        picked ? 'border-[var(--peek-accent)] ring-2 ring-[var(--peek-accent)]/30' : 'border-transparent hover:-translate-y-0.5'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative aspect-[4/3] card-grain">
        {card.image_url ? (
          <img src={card.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--peek-accent)]/30 to-[var(--peek-accent-2)]/30" />
        )}
        {card.is_taunt && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-center p-4 text-white font-display text-2xl">
            {card.taunt_text || 'ha. denied.'}
          </div>
        )}
        <TagChips card={card} dollars={dollars} />
      </div>
      <div className="p-4">
        <div className="font-display text-2xl leading-tight">{card.title}</div>
        {card.description && <div className="mt-1.5 text-sm opacity-70 leading-relaxed">{card.description}</div>}
        {picked && <div className="mt-3 text-xs uppercase tracking-wider text-[var(--peek-accent)]">picked ✓</div>}
      </div>
    </button>
  );
}

function CompactTile({
  card,
  picked,
  onPick
}: {
  card: Card;
  picked: boolean;
  onPick: (c: Card) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(card)}
      disabled={picked}
      className={`text-left surface rounded-2xl overflow-hidden shadow-sm transition border-2 ${
        picked ? 'border-[var(--peek-accent)] ring-2 ring-[var(--peek-accent)]/30' : 'border-transparent hover:-translate-y-0.5'
      }`}
    >
      <div className="relative aspect-square card-grain">
        {card.image_url ? (
          <img src={card.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--peek-accent)]/30 to-[var(--peek-accent-2)]/30" />
        )}
      </div>
      <div className="p-2">
        <div className="font-display text-sm leading-tight">{card.title}</div>
      </div>
    </button>
  );
}

function TagChips({ card, dollars }: { card: Card; dollars: string | null }) {
  return (
    <>
      {card.is_locked && (
        <div className="absolute top-2 right-2 rounded-full bg-black/75 text-white text-[10px] uppercase tracking-wider px-2 py-1">
          locked
        </div>
      )}
      {dollars && (
        <div className="absolute top-2 left-2 rounded-full bg-white/95 text-black text-[11px] font-medium px-2 py-1">
          {dollars}
        </div>
      )}
      {card.type === 'activity' && (
        <div className="absolute bottom-2 left-2 rounded-full bg-[var(--peek-accent)] text-black text-[10px] uppercase tracking-wider px-2 py-1">
          together
        </div>
      )}
      {card.type === 'aspirational' && !card.is_taunt && (
        <div className="absolute bottom-2 left-2 rounded-full bg-[var(--peek-accent-2)] text-black text-[10px] uppercase tracking-wider px-2 py-1">
          a stretch
        </div>
      )}
    </>
  );
}
