'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkle } from 'lucide-react';
import type { Card, VariantGroup, VibeMotion } from '@/lib/peek/types';
import { ProductCard } from './product-card';
import { ActivityCard } from './activity-card';
import { AspirationalCard } from './aspirational-card';
import { GagCard } from './gag-card';
import type { RecipientPick } from './realtime';

type PickArgs = {
  cardId: string;
  begMessage?: string;
  recipientNote?: string;
};

type Props = {
  cards: Card[];
  variantGroups: VariantGroup[];
  pickedCardIds: Set<string>;
  pickByCardId: Map<string, RecipientPick>;
  pendingCardIds: Set<string>;
  revealed: boolean;
  motion: VibeMotion;
  onPick: (args: PickArgs) => Promise<boolean>;
  onUnpick: (cardId: string) => Promise<boolean>;
};

const MOTION_STAGGER: Record<VibeMotion, number> = {
  still: 0.08,
  soft: 0.14,
  lively: 0.22,
};

export function CardDeck({
  cards,
  variantGroups,
  pickedCardIds,
  pickByCardId,
  pendingCardIds,
  revealed,
  motion: vibeMotion,
  onPick,
  onUnpick,
}: Props) {
  const ungrouped = useMemo(
    () => cards.filter((c) => !c.variantGroupId),
    [cards],
  );

  const grouped = useMemo(() => {
    const m = new Map<string, Card[]>();
    for (const c of cards) {
      if (!c.variantGroupId) continue;
      const list = m.get(c.variantGroupId) ?? [];
      list.push(c);
      m.set(c.variantGroupId, list);
    }
    for (const [k, list] of m) {
      m.set(
        k,
        list.sort((a, b) => a.position - b.position),
      );
    }
    return m;
  }, [cards]);

  const orderedGroups = useMemo(
    () => [...variantGroups].sort((a, b) => a.position - b.position),
    [variantGroups],
  );

  const stagger = MOTION_STAGGER[vibeMotion];

  let renderIndex = 0;
  const items: Array<
    | { kind: 'card'; card: Card; index: number }
    | { kind: 'group'; group: VariantGroup; cards: Card[]; startIndex: number }
  > = [];
  for (const c of ungrouped) {
    items.push({ kind: 'card', card: c, index: renderIndex });
    renderIndex += 1;
  }
  for (const g of orderedGroups) {
    const groupCards = grouped.get(g.id) ?? [];
    items.push({ kind: 'group', group: g, cards: groupCards, startIndex: renderIndex });
    renderIndex += groupCards.length;
  }

  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-5">
      {items.map((item) => {
        if (item.kind === 'card') {
          return (
            <SingleCard
              key={item.card.id}
              card={item.card}
              index={item.index}
              revealed={revealed}
              stagger={stagger}
              pickedCardIds={pickedCardIds}
              pickByCardId={pickByCardId}
              pendingCardIds={pendingCardIds}
              onPick={onPick}
              onUnpick={onUnpick}
            />
          );
        }
        return (
          <VariantGroupBlock
            key={item.group.id}
            group={item.group}
            cards={item.cards}
            startIndex={item.startIndex}
            revealed={revealed}
            stagger={stagger}
            pickedCardIds={pickedCardIds}
            pickByCardId={pickByCardId}
            pendingCardIds={pendingCardIds}
            onPick={onPick}
            onUnpick={onUnpick}
          />
        );
      })}
    </section>
  );
}

type SubProps = {
  card: Card;
  index: number;
  revealed: boolean;
  stagger: number;
  groupSelection?: VariantGroup['selection'];
  pickedCardIds: Set<string>;
  pickByCardId: Map<string, RecipientPick>;
  pendingCardIds: Set<string>;
  onPick: (args: PickArgs) => Promise<boolean>;
  onUnpick: (cardId: string) => Promise<boolean>;
};

function SingleCard(props: SubProps) {
  const { index, revealed, stagger } = props;
  const delay = revealed ? 0 : Math.min(index * stagger, 1.6);
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: 'easeOut' }}
      layout
    >
      <CardRenderer {...props} />
    </motion.article>
  );
}

function CardRenderer({
  card,
  groupSelection,
  pickedCardIds,
  pickByCardId,
  pendingCardIds,
  onPick,
  onUnpick,
}: SubProps) {
  const isPicked = pickedCardIds.has(card.id);
  const pick = pickByCardId.get(card.id) ?? null;
  const isPending = pendingCardIds.has(card.id);
  const shared = {
    card,
    isPicked,
    pick,
    isPending,
    groupSelection,
    onPick,
    onUnpick,
  };
  if (card.isTaunt) {
    return <GagCard card={card} />;
  }
  if (card.type === 'activity') {
    return <ActivityCard {...shared} />;
  }
  if (card.type === 'aspirational') {
    return <AspirationalCard {...shared} />;
  }
  return <ProductCard {...shared} />;
}

function VariantGroupBlock({
  group,
  cards,
  startIndex,
  revealed,
  stagger,
  pickedCardIds,
  pickByCardId,
  pendingCardIds,
  onPick,
  onUnpick,
}: {
  group: VariantGroup;
  cards: Card[];
  startIndex: number;
  revealed: boolean;
  stagger: number;
  pickedCardIds: Set<string>;
  pickByCardId: Map<string, RecipientPick>;
  pendingCardIds: Set<string>;
  onPick: (args: PickArgs) => Promise<boolean>;
  onUnpick: (cardId: string) => Promise<boolean>;
}) {
  const label =
    group.selection === 'pick_one'
      ? 'Pick one'
      : group.selection === 'pick_any'
        ? 'Pick any'
        : 'All of these';
  const headDelay = revealed ? 0 : Math.min(startIndex * stagger, 1.6);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: headDelay, ease: 'easeOut' }}
      className="flex flex-col gap-3 rounded-2xl border border-[hsl(var(--peek-accent))]/30 bg-[hsl(var(--peek-surface))]/60 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="inline-flex items-center text-sm font-semibold uppercase tracking-wider text-[hsl(var(--peek-ink))]/70">
          <Sparkle className="mr-1.5 h-3.5 w-3.5" />
          {group.title}
        </h2>
        <span className="rounded-full bg-[hsl(var(--peek-accent))]/15 px-2 py-0.5 text-xs font-medium text-[hsl(var(--peek-accent))]">
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {cards.map((card, i) => (
          <SingleCard
            key={card.id}
            card={card}
            index={startIndex + i}
            revealed={revealed}
            stagger={stagger}
            groupSelection={group.selection}
            pickedCardIds={pickedCardIds}
            pickByCardId={pickByCardId}
            pendingCardIds={pendingCardIds}
            onPick={onPick}
            onUnpick={onUnpick}
          />
        ))}
      </div>
    </motion.div>
  );
}
