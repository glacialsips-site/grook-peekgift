'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, MapPin, Sparkle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  PeekVibeProvider,
  type Vibe as ProviderVibe,
} from '@/components/peek-vibe-provider';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Card, PeekDraft, VariantGroup, Vibe } from '@/lib/peek/types';

type Props = {
  draft: PeekDraft;
  className?: string;
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

function formatPrice(cents: number | null): string | null {
  if (cents == null) return null;
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: dollars % 1 === 0 ? 0 : 2,
  }).format(dollars);
}

export function PreviewPane({ draft, className }: Props) {
  const providerVibe = useMemo(
    () => toProviderVibe(draft.peek.vibe),
    [draft.peek.vibe],
  );

  const ungrouped = useMemo(
    () =>
      draft.cards
        .filter((c) => !c.variantGroupId)
        .sort((a, b) => a.position - b.position),
    [draft.cards],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Card[]>();
    for (const c of draft.cards) {
      if (!c.variantGroupId) continue;
      const list = map.get(c.variantGroupId) ?? [];
      list.push(c);
      map.set(c.variantGroupId, list);
    }
    for (const [k, v] of map) {
      map.set(
        k,
        v.sort((a, b) => a.position - b.position),
      );
    }
    return map;
  }, [draft.cards]);

  const orderedGroups = useMemo(
    () => [...draft.variantGroups].sort((a, b) => a.position - b.position),
    [draft.variantGroups],
  );

  return (
    <section
      className={cn(
        'flex h-full min-h-0 flex-col bg-[hsl(var(--peek-bg))] text-[hsl(var(--peek-ink))]',
        className,
      )}
      aria-label="Peek preview"
    >
      <PeekVibeProvider vibe={providerVibe}>
        <div className="flex h-full min-h-0 flex-col overflow-y-auto">
          <Hero peek={draft.peek} />

          <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 py-8">
            <RecipientHeader peek={draft.peek} />

            {draft.peek.noteMd ? (
              <article
                className={cn(
                  'prose prose-sm max-w-none text-[hsl(var(--peek-ink))]',
                  'prose-headings:text-[hsl(var(--peek-ink))]',
                  'prose-strong:text-[hsl(var(--peek-ink))]',
                  'prose-a:text-[hsl(var(--peek-accent))]',
                )}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {draft.peek.noteMd}
                </ReactMarkdown>
              </article>
            ) : (
              <EmptyHint>
                A personal note will appear here as you tell Peek more.
              </EmptyHint>
            )}

            <Separator className="bg-[hsl(var(--peek-ink))]/10" />

            <div className="flex flex-col gap-6">
              {ungrouped.length === 0 && orderedGroups.length === 0 ? (
                <EmptyHint>No cards yet — keep chatting.</EmptyHint>
              ) : null}

              <AnimatePresence initial={false}>
                {ungrouped.map((card, idx) => (
                  <CardItem key={card.id} card={card} index={idx} />
                ))}
              </AnimatePresence>

              {orderedGroups.map((group, gi) => (
                <VariantGroupBlock
                  key={group.id}
                  group={group}
                  cards={grouped.get(group.id) ?? []}
                  baseIndex={ungrouped.length + gi}
                />
              ))}
            </div>
          </div>
        </div>
      </PeekVibeProvider>
    </section>
  );
}

function Hero({ peek }: { peek: PeekDraft['peek'] }) {
  if (peek.heroImageUrl) {
    return (
      <div
        role="img"
        aria-label="Hero preview"
        className="relative h-48 w-full bg-cover bg-center sm:h-64 md:h-80"
        style={{ backgroundImage: `url(${peek.heroImageUrl})` }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--peek-bg))]/80 to-transparent"
        />
      </div>
    );
  }
  return (
    <motion.div
      aria-hidden="true"
      className="h-32 w-full bg-gradient-to-br from-[hsl(var(--peek-accent))]/40 via-[hsl(var(--peek-accent2))]/30 to-[hsl(var(--peek-surface))] sm:h-48"
      animate={{ opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function RecipientHeader({ peek }: { peek: PeekDraft['peek'] }) {
  const name = peek.recipientName ?? 'your person';
  const subtitleParts = [peek.relationship, peek.occasion].filter(
    (v): v is string => Boolean(v),
  );
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {name}
      </h1>
      {subtitleParts.length > 0 ? (
        <p className="text-sm text-[hsl(var(--peek-ink))]/60">
          {subtitleParts.join(' · ')}
        </p>
      ) : (
        <p className="text-sm text-[hsl(var(--peek-ink))]/40">
          Who is this for?
        </p>
      )}
    </header>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <motion.p
      className="rounded-lg border border-dashed border-[hsl(var(--peek-ink))]/15 bg-[hsl(var(--peek-surface))]/40 px-4 py-3 text-center text-xs text-[hsl(var(--peek-ink))]/50"
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.p>
  );
}

function CardItem({ card, index }: { card: Card; index: number }) {
  const price = card.revealValue ? formatPrice(card.valueCents) : null;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        duration: 0.22,
        delay: Math.min(index * 0.04, 0.3),
        ease: 'easeOut',
      }}
      className="relative overflow-hidden rounded-2xl border border-[hsl(var(--peek-ink))]/10 bg-[hsl(var(--peek-surface))] shadow-sm"
    >
      {card.imageUrl ? (
        <div
          role="img"
          aria-label={card.title}
          className="relative h-44 w-full bg-cover bg-center sm:h-56"
          style={{ backgroundImage: `url(${card.imageUrl})` }}
        >
          {card.isLocked ? <LockOverlay card={card} /> : null}
          {card.isTaunt && card.tauntText ? (
            <TauntOverlay text={card.tauntText} />
          ) : null}
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="relative h-32 w-full bg-gradient-to-br from-[hsl(var(--peek-accent))]/20 to-[hsl(var(--peek-accent2))]/20"
        >
          {card.isLocked ? <LockOverlay card={card} /> : null}
          {card.isTaunt && card.tauntText ? (
            <TauntOverlay text={card.tauntText} />
          ) : null}
        </div>
      )}

      <div className="flex flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-medium leading-tight">{card.title}</h3>
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
        {card.locationHint ? (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-[hsl(var(--peek-ink))]/50">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {card.locationHint}
          </p>
        ) : null}
      </div>
    </motion.article>
  );
}

function LockOverlay({ card }: { card: Card }) {
  const prompt = card.unlockRule?.beg_prompt ?? 'ask first';
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[hsl(var(--peek-bg))]/80 text-center backdrop-blur-sm">
      <Lock
        className="h-5 w-5 text-[hsl(var(--peek-ink))]/60"
        aria-hidden="true"
      />
      <p className="px-4 text-sm font-medium text-[hsl(var(--peek-ink))]/80">
        {prompt}
      </p>
    </div>
  );
}

function TauntOverlay({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--peek-ink))]/10 p-4 text-center">
      <p className="font-serif text-xl italic text-[hsl(var(--peek-ink))] drop-shadow-sm sm:text-2xl">
        “{text}”
      </p>
    </div>
  );
}

function VariantGroupBlock({
  group,
  cards,
  baseIndex,
}: {
  group: VariantGroup;
  cards: Card[];
  baseIndex: number;
}) {
  const label =
    group.selection === 'pick_one'
      ? 'Pick one'
      : group.selection === 'pick_any'
        ? 'Pick any'
        : 'All of these';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="flex flex-col gap-3 rounded-2xl border border-[hsl(var(--peek-accent))]/30 bg-[hsl(var(--peek-surface))]/60 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--peek-ink))]/70">
          <Sparkle className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
          {group.title}
        </h2>
        <span className="rounded-full bg-[hsl(var(--peek-accent))]/15 px-2 py-0.5 text-xs text-[hsl(var(--peek-accent))]">
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {cards.length === 0 ? (
          <EmptyHint>This group is still being filled in.</EmptyHint>
        ) : (
          cards.map((card, i) => (
            <CardItem key={card.id} card={card} index={baseIndex + i} />
          ))
        )}
      </div>
    </motion.div>
  );
}
