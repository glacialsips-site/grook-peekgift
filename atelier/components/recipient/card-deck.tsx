'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Card, VariantGroup, VibeMotion } from '@/lib/peek/types';
import {
  VariantGroupContainer,
  gridClassesForCount,
} from '@/components/build/variant-group-container';
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

/**
 * Per-card deal-in stagger (seconds) keyed by vibe.motion.
 *
 * Base cadence is 100ms (the magazine-cover-opening reveal cards-phase target,
 * see `_packets/SPINE/skills/reveal-mechanics.md` §3) multiplied by the vibe
 * motion scale (still 0.6x, soft 1x, lively 1.25x). Matches the cinematic
 * teaser strip stagger so the deck below picks up where the reveal teaser
 * leaves off without a perceptible seam.
 */
const MOTION_STAGGER: Record<VibeMotion, number> = {
  still: 0.06,
  soft: 0.1,
  lively: 0.125,
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
    items.push({
      kind: 'group',
      group: g,
      cards: groupCards,
      startIndex: renderIndex,
    });
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
  const { card, index, revealed, stagger } = props;
  const delay = revealed ? 0 : Math.min(index * stagger, 1.6);
  // Slight per-card tilt on entry — seeded by card id + index so variant-group
  // members fan distinctly from one another while staying deterministic. Lands
  // at rotate: 0. Variant group members share the parent's staggerChildren so
  // they appear together as a fan, per skill §3.
  const seed = (card.id ? card.id.charCodeAt(0) : index) + index;
  const enterRotate = ((seed % 5) - 2) * 1.4; // -2.8 .. +2.8 deg
  return (
    <motion.article
      initial={{ opacity: 0, y: 22, rotate: enterRotate }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
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
  const headDelay = revealed ? 0 : Math.min(startIndex * stagger, 1.6);
  return (
    <VariantGroupContainer
      group={group}
      memberCount={cards.length}
      delay={headDelay}
    >
      <div className={gridClassesForCount(cards.length)}>
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
    </VariantGroupContainer>
  );
}
