'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  Gift,
  Laugh,
  Lock,
  MapPin,
  Sparkle,
  Sparkles,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  PeekVibeProvider,
  type Vibe as ProviderVibe,
} from '@/components/peek-vibe-provider';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { cssUrl } from '@/lib/security/css-url';
import type {
  Card,
  CardType,
  PeekDraft,
  VariantGroup,
  Vibe,
} from '@/lib/peek/types';
import {
  VariantGroupContainer,
  gridClassesForCount,
} from './variant-group-container';

export type PreviewViewAs = 'curator' | 'recipient';

type Props = {
  draft: PeekDraft;
  className?: string;
  viewAs?: PreviewViewAs;
};

function isPeekEmpty(draft: PeekDraft): boolean {
  const p = draft.peek;
  if (p.recipientName && p.recipientName.trim().length > 0) return false;
  if (p.occasion && p.occasion.trim().length > 0) return false;
  if (p.relationship && p.relationship.trim().length > 0) return false;
  if (p.giverNames && p.giverNames.length > 0) return false;
  if (p.heroImageUrl) return false;
  if (p.noteMd && p.noteMd.trim().length > 0) return false;
  if (draft.cards.length > 0) return false;
  if (draft.variantGroups.length > 0) return false;
  // DEFAULT_VIBE ships with palette+mood already populated, so we can't use
  // those fields as a proxy for "evolved vibe". A non-empty
  // `signal_source_history` is the truth: the vibe engine appends an entry
  // every time a real curator/system signal updates a dial.
  const v = p.vibe ?? {};
  const evolved = (v.signal_source_history ?? []).length > 0;
  if (evolved) return false;
  return true;
}

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
    typography: vibe.typography,
    density: vibe.density,
    shape: vibe.shape,
    mood: vibe.mood,
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

export function PreviewPane({
  draft,
  className,
  viewAs = 'curator',
}: Props) {
  const empty = isPeekEmpty(draft);

  if (empty) {
    return (
      <section
        className={cn(
          'relative flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground',
          className,
        )}
        aria-label="Peek preview"
      >
        <BlankPreviewHint />
      </section>
    );
  }

  return (
    <section
      className={cn('relative flex h-full min-h-0 flex-col', className)}
      style={{
        backgroundColor: 'hsl(var(--peek-bg))',
        color: 'hsl(var(--peek-ink))',
        fontFamily: 'var(--peek-font-body)',
      }}
      aria-label="Peek preview"
    >
      <DraftRender draft={draft} viewAs={viewAs} />
    </section>
  );
}

function BlankPreviewHint() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/60"
      >
        <Sparkles className="h-7 w-7 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-base font-medium text-foreground">
          Hey, who&apos;s this for?
        </p>
        <p className="max-w-[28ch] text-sm text-muted-foreground">
          Tell Peek about them in the chat. The preview comes to life as you go.
        </p>
      </div>
    </div>
  );
}

function DraftRender({
  draft,
  viewAs,
}: {
  draft: PeekDraft;
  viewAs: PreviewViewAs;
}) {
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

  const budgetTally = useMemo(() => {
    if (viewAs !== 'curator') return null;
    const sum = draft.cards.reduce(
      (acc, c) => acc + (c.valueCents ?? 0),
      0,
    );
    return { sum, budget: draft.peek.budgetCents };
  }, [viewAs, draft.cards, draft.peek.budgetCents]);

  return (
    <PeekVibeProvider vibe={providerVibe}>
      <div
        className="relative flex h-full min-h-0 flex-col overflow-y-auto"
        style={{
          backgroundColor: 'hsl(var(--peek-bg))',
          color: 'hsl(var(--peek-ink))',
          fontFamily: 'var(--peek-font-body)',
        }}
      >
        {budgetTally &&
        (budgetTally.sum > 0 || budgetTally.budget != null) ? (
          <BudgetBadge sum={budgetTally.sum} budget={budgetTally.budget} />
        ) : null}

        <PreviewHero peek={draft.peek} />

        <div
          className="mx-auto flex w-full max-w-2xl flex-col px-5"
          style={{
            gap: 'var(--peek-space-8)',
            paddingTop: 'var(--peek-space-6)',
            paddingBottom: 'var(--peek-space-8)',
          }}
        >
          {draft.peek.noteMd ? (
            <article
              className={cn(
                'prose prose-sm max-w-none',
                'prose-headings:text-[hsl(var(--peek-ink))]',
                'prose-strong:text-[hsl(var(--peek-ink))]',
                'prose-a:text-[hsl(var(--peek-accent))]',
              )}
              style={{
                color: 'hsl(var(--peek-ink))',
                fontFamily: 'var(--peek-font-body)',
              }}
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

          <Separator
            style={{ backgroundColor: 'hsl(var(--peek-ink) / 0.12)' }}
          />

          <div
            className="flex flex-col"
            style={{ gap: 'var(--peek-space-6)' }}
          >
            {ungrouped.length === 0 && orderedGroups.length === 0 ? (
              <EmptyHint>No cards yet — keep chatting.</EmptyHint>
            ) : null}

            <AnimatePresence initial={false}>
              {ungrouped.map((card, idx) => (
                <CardItem
                  key={card.id}
                  card={card}
                  index={idx}
                  viewAs={viewAs}
                />
              ))}
            </AnimatePresence>

            {orderedGroups.map((group, gi) => (
              <VariantGroupBlock
                key={group.id}
                group={group}
                cards={grouped.get(group.id) ?? []}
                baseIndex={ungrouped.length + gi}
                viewAs={viewAs}
              />
            ))}
          </div>
        </div>
      </div>
    </PeekVibeProvider>
  );
}

function BudgetBadge({
  sum,
  budget,
}: {
  sum: number;
  budget: number | null;
}) {
  const sumFmt = formatPrice(sum) ?? '$0';
  const over = budget != null && sum > budget;
  const label =
    budget == null
      ? `${sumFmt} (no budget set)`
      : `${sumFmt} / ${formatPrice(budget) ?? '$0'} proposed`;
  return (
    <div className="pointer-events-none absolute right-3 top-3 z-30">
      <span
        className="pointer-events-auto inline-flex items-center gap-1.5 border px-3 py-1.5 text-[11px] font-semibold shadow-md backdrop-blur"
        style={{
          borderRadius: 'var(--vibe-radius-button, 9999px)',
          backgroundColor: 'hsl(var(--peek-bg) / 0.92)',
          fontFamily: 'var(--peek-font-body)',
          borderColor: over
            ? 'rgb(239 68 68 / 0.4)'
            : 'hsl(var(--peek-ink) / 0.18)',
          color: over ? 'rgb(220 38 38)' : 'hsl(var(--peek-ink) / 0.78)',
        }}
        title={
          over ? 'Proposed value exceeds budget' : 'Curator-only budget tally'
        }
      >
        {label}
      </span>
    </div>
  );
}

function PreviewHero({ peek }: { peek: PeekDraft['peek'] }) {
  const name = peek.recipientName ?? 'your person';
  const givers = peek.giverNames ?? [];
  const hasGivers = givers.length > 0;
  const display = peek.vibe?.font_pairing?.display;
  const headingFont = display
    ? `"${display}", var(--peek-font-heading)`
    : 'var(--peek-font-heading)';

  if (peek.heroImageUrl) {
    return (
      <header className="relative w-full overflow-hidden">
        <div
          role="img"
          aria-label={`Hero image for ${name}`}
          className="relative h-[42vh] min-h-[260px] w-full sm:h-[52vh]"
        >
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: cssUrl(peek.heroImageUrl) }}
            initial={{ scale: 1.05, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.0, ease: 'easeOut' }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, hsl(var(--peek-ink) / 0.78) 0%, hsl(var(--peek-ink) / 0.22) 45%, transparent 70%)',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 px-6 pb-6 sm:pb-8">
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
              className="drop-shadow-lg"
              style={{
                fontFamily: headingFont,
                color: 'hsl(var(--peek-bg))',
                fontSize: 'var(--vibe-type-scale-display)',
                fontWeight: 'var(--vibe-type-weight-display)',
                letterSpacing: 'var(--vibe-type-tracking-display)',
                lineHeight: 'var(--vibe-type-leading-display)',
              }}
            >
              {name}
            </motion.h1>
            {peek.occasion ? (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.55, ease: 'easeOut' }}
                className="drop-shadow"
                style={{
                  fontFamily: headingFont,
                  color: 'hsl(var(--peek-bg) / 0.92)',
                  fontSize: 'var(--vibe-type-scale-h3)',
                  fontWeight: 'var(--vibe-type-weight-h3)',
                  letterSpacing: 'var(--vibe-type-tracking-h3)',
                  lineHeight: 'var(--vibe-type-leading-h3)',
                }}
              >
                {peek.occasion}
              </motion.p>
            ) : peek.relationship ? (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.55, ease: 'easeOut' }}
                className="uppercase drop-shadow"
                style={{
                  color: 'hsl(var(--peek-bg) / 0.82)',
                  fontSize: 'var(--vibe-type-scale-small)',
                  fontWeight: 'var(--vibe-type-weight-small)',
                  letterSpacing: 'var(--vibe-type-tracking-small)',
                  lineHeight: 'var(--vibe-type-leading-small)',
                }}
              >
                {peek.relationship}
              </motion.p>
            ) : null}
            {hasGivers ? (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.7, ease: 'easeOut' }}
                className="uppercase drop-shadow"
                style={{
                  color: 'hsl(var(--peek-bg) / 0.82)',
                  fontSize: 'var(--vibe-type-scale-small)',
                  fontWeight: 'var(--vibe-type-weight-small)',
                  letterSpacing: 'var(--vibe-type-tracking-small)',
                  lineHeight: 'var(--vibe-type-leading-small)',
                }}
              >
                from {givers.join(', ')}
              </motion.p>
            ) : null}
            {!peek.occasion && !hasGivers && !peek.relationship ? (
              <p
                className="drop-shadow"
                style={{
                  color: 'hsl(var(--peek-bg) / 0.7)',
                  fontSize: 'var(--vibe-type-scale-body)',
                  fontWeight: 'var(--vibe-type-weight-body)',
                  letterSpacing: 'var(--vibe-type-tracking-body)',
                  lineHeight: 'var(--vibe-type-leading-body)',
                }}
              >
                Who is this for?
              </p>
            ) : null}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="relative w-full overflow-hidden">
      <motion.div
        className="relative flex h-[36vh] min-h-[220px] w-full flex-col items-start justify-end px-6 pb-6 sm:h-[44vh]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          background:
            'linear-gradient(135deg, hsl(var(--peek-accent) / 0.55) 0%, hsl(var(--peek-accent2) / 0.42) 45%, hsl(var(--peek-surface)) 100%)',
        }}
      >
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
          style={{
            fontFamily: headingFont,
            color: 'hsl(var(--peek-ink))',
            fontSize: 'var(--vibe-type-scale-display)',
            fontWeight: 'var(--vibe-type-weight-display)',
            letterSpacing: 'var(--vibe-type-tracking-display)',
            lineHeight: 'var(--vibe-type-leading-display)',
          }}
        >
          {name}
        </motion.h1>
        {peek.occasion ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-1"
            style={{
              fontFamily: headingFont,
              color: 'hsl(var(--peek-ink) / 0.78)',
              fontSize: 'var(--vibe-type-scale-h3)',
              fontWeight: 'var(--vibe-type-weight-h3)',
              letterSpacing: 'var(--vibe-type-tracking-h3)',
              lineHeight: 'var(--vibe-type-leading-h3)',
            }}
          >
            {peek.occasion}
          </motion.p>
        ) : peek.relationship ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.5 }}
            className="mt-1 uppercase"
            style={{
              color: 'hsl(var(--peek-ink) / 0.62)',
              fontSize: 'var(--vibe-type-scale-small)',
              fontWeight: 'var(--vibe-type-weight-small)',
              letterSpacing: 'var(--vibe-type-tracking-small)',
              lineHeight: 'var(--vibe-type-leading-small)',
            }}
          >
            {peek.relationship}
          </motion.p>
        ) : null}
        {hasGivers ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.6 }}
            className="mt-1 uppercase"
            style={{
              color: 'hsl(var(--peek-ink) / 0.62)',
              fontSize: 'var(--vibe-type-scale-small)',
              fontWeight: 'var(--vibe-type-weight-small)',
              letterSpacing: 'var(--vibe-type-tracking-small)',
              lineHeight: 'var(--vibe-type-leading-small)',
            }}
          >
            from {givers.join(', ')}
          </motion.p>
        ) : null}
        {!peek.occasion && !hasGivers && !peek.relationship ? (
          <p
            className="mt-1 text-sm"
            style={{ color: 'hsl(var(--peek-ink) / 0.48)' }}
          >
            Who is this for?
          </p>
        ) : null}
      </motion.div>
    </header>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <motion.p
      className="border border-dashed px-4 py-3 text-center text-xs"
      style={{
        borderRadius: 'var(--vibe-radius-card)',
        borderColor: 'hsl(var(--peek-ink) / 0.18)',
        backgroundColor: 'hsl(var(--peek-surface) / 0.5)',
        color: 'hsl(var(--peek-ink) / 0.55)',
        fontFamily: 'var(--peek-font-body)',
      }}
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.p>
  );
}

function CardItem({
  card,
  index,
  viewAs,
  compact,
}: {
  card: Card;
  index: number;
  viewAs: PreviewViewAs;
  compact?: boolean;
}) {
  const showCuratorPrice =
    viewAs === 'curator' && card.valueCents != null;
  const showRecipientPrice = viewAs === 'recipient' && card.revealValue;
  const showPrice = showCuratorPrice || showRecipientPrice;
  const price = showPrice ? formatPrice(card.valueCents) : null;
  const priceIsHidden = showCuratorPrice && !card.revealValue;

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
      className="relative flex flex-col overflow-hidden border shadow-sm"
      style={{
        borderRadius: 'var(--vibe-radius-card, var(--peek-radius-lg))',
        borderColor: 'hsl(var(--peek-ink) / 0.12)',
        backgroundColor: 'hsl(var(--peek-surface))',
      }}
    >
      {card.imageUrl ? (
        <div
          role="img"
          aria-label={card.title}
          className={cn(
            'relative w-full bg-cover bg-center',
            compact ? 'h-36 sm:h-40' : 'h-44 sm:h-56',
          )}
          style={{ backgroundImage: cssUrl(card.imageUrl) }}
        >
          {card.isLocked ? <LockOverlay card={card} /> : null}
          {card.isTaunt && card.tauntText ? (
            <TauntOverlay text={card.tauntText} />
          ) : null}
        </div>
      ) : (
        <TextOnlyHero card={card} compact={compact} />
      )}

      <div
        className="flex flex-1 flex-col p-4"
        style={{ gap: 'var(--peek-space-2)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <h3
            style={{
              fontFamily: 'var(--peek-font-heading)',
              color: 'hsl(var(--peek-ink))',
              fontSize: 'var(--vibe-type-scale-h3)',
              fontWeight: 'var(--vibe-type-weight-h3)',
              letterSpacing: 'var(--vibe-type-tracking-h3)',
              lineHeight: 'var(--vibe-type-leading-h3)',
            }}
          >
            {card.title}
          </h3>
          {price ? (
            <span
              className={cn(
                'shrink-0 px-2 py-0.5',
                priceIsHidden ? 'border border-dashed' : '',
              )}
              style={{
                borderRadius: 'var(--vibe-radius-button, 9999px)',
                fontFamily: 'var(--peek-font-body)',
                fontSize: 'var(--vibe-type-scale-small)',
                fontWeight: 'var(--vibe-type-weight-small)',
                letterSpacing: 'var(--vibe-type-tracking-small)',
                lineHeight: 'var(--vibe-type-leading-small)',
                borderColor: priceIsHidden
                  ? 'hsl(var(--peek-accent) / 0.45)'
                  : undefined,
                backgroundColor: priceIsHidden
                  ? undefined
                  : 'hsl(var(--peek-accent) / 0.12)',
                color: priceIsHidden
                  ? 'hsl(var(--peek-accent) / 0.75)'
                  : 'hsl(var(--peek-accent))',
              }}
              title={priceIsHidden ? 'Hidden from recipient' : undefined}
            >
              {price}
            </span>
          ) : null}
        </div>
        {card.description ? (
          <p
            style={{
              color: 'hsl(var(--peek-ink) / 0.72)',
              fontFamily: 'var(--peek-font-body)',
              fontSize: 'var(--vibe-type-scale-body)',
              fontWeight: 'var(--vibe-type-weight-body)',
              letterSpacing: 'var(--vibe-type-tracking-body)',
              lineHeight: 'var(--vibe-type-leading-body)',
            }}
          >
            {card.description}
          </p>
        ) : null}
        {card.locationHint ? (
          <p
            className="mt-1 inline-flex items-center gap-1"
            style={{
              color: 'hsl(var(--peek-ink) / 0.55)',
              fontSize: 'var(--vibe-type-scale-small)',
              fontWeight: 'var(--vibe-type-weight-small)',
              letterSpacing: 'var(--vibe-type-tracking-small)',
              lineHeight: 'var(--vibe-type-leading-small)',
            }}
          >
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {card.locationHint}
          </p>
        ) : null}
      </div>
    </motion.article>
  );
}

const TYPE_ICON: Record<CardType, typeof Gift> = {
  product: Gift,
  activity: Calendar,
  aspirational: Sparkles,
  digital: Sparkle,
};

function TextOnlyHero({ card, compact }: { card: Card; compact?: boolean }) {
  const Icon = card.isTaunt ? Laugh : TYPE_ICON[card.type] ?? Gift;
  return (
    <div
      aria-hidden={card.isTaunt ? undefined : 'true'}
      className={cn(
        'relative flex w-full items-end overflow-hidden',
        compact ? 'h-28 sm:h-32' : 'h-32 sm:h-36',
      )}
      style={{
        background:
          'linear-gradient(135deg, hsl(var(--peek-accent) / 0.22) 0%, hsl(var(--peek-accent2) / 0.18) 100%)',
      }}
    >
      <div className="pointer-events-none absolute -right-3 -top-3 opacity-50">
        <Icon
          className="h-16 w-16"
          aria-hidden="true"
          style={{ color: 'hsl(var(--peek-accent) / 0.62)' }}
        />
      </div>
      <div className="flex flex-col gap-1 p-4">
        <span
          className="uppercase"
          style={{
            fontFamily: 'var(--peek-font-heading)',
            color: 'hsl(var(--peek-accent) / 0.88)',
            fontSize: 'var(--vibe-type-scale-small)',
            fontWeight: 'var(--vibe-type-weight-small)',
            letterSpacing: 'var(--vibe-type-tracking-small)',
            lineHeight: 'var(--vibe-type-leading-small)',
          }}
        >
          {card.type}
        </span>
      </div>
      {card.isLocked ? <LockOverlay card={card} /> : null}
      {card.isTaunt && card.tauntText ? (
        <TauntOverlay text={card.tauntText} />
      ) : null}
    </div>
  );
}

function LockOverlay({ card }: { card: Card }) {
  const prompt = card.unlockRule?.beg_prompt ?? 'ask first';
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center backdrop-blur-sm"
      style={{ backgroundColor: 'hsl(var(--peek-bg) / 0.82)' }}
    >
      <Lock
        className="h-5 w-5"
        aria-hidden="true"
        style={{ color: 'hsl(var(--peek-ink) / 0.62)' }}
      />
      <p
        className="px-4"
        style={{
          color: 'hsl(var(--peek-ink) / 0.82)',
          fontFamily: 'var(--peek-font-body)',
          fontSize: 'var(--vibe-type-scale-body)',
          fontWeight: 'var(--vibe-type-weight-body)',
          letterSpacing: 'var(--vibe-type-tracking-body)',
          lineHeight: 'var(--vibe-type-leading-body)',
        }}
      >
        {prompt}
      </p>
    </div>
  );
}

function TauntOverlay({ text }: { text: string }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center p-4 text-center"
      style={{ backgroundColor: 'hsl(var(--peek-ink) / 0.12)' }}
    >
      <p
        className="italic drop-shadow-sm"
        style={{
          fontFamily: 'var(--peek-font-heading)',
          color: 'hsl(var(--peek-ink))',
          fontSize: 'var(--vibe-type-scale-h2)',
          fontWeight: 'var(--vibe-type-weight-h2)',
          letterSpacing: 'var(--vibe-type-tracking-h2)',
          lineHeight: 'var(--vibe-type-leading-h2)',
        }}
      >
        “{text}”
      </p>
    </div>
  );
}

function VariantGroupBlock({
  group,
  cards,
  baseIndex,
  viewAs,
}: {
  group: VariantGroup;
  cards: Card[];
  baseIndex: number;
  viewAs: PreviewViewAs;
}) {
  const compact = cards.length >= 2;
  return (
    <VariantGroupContainer group={group} memberCount={cards.length}>
      {cards.length === 0 ? (
        <EmptyHint>This group is still being filled in.</EmptyHint>
      ) : (
        <div className={gridClassesForCount(cards.length)}>
          {cards.map((card, i) => (
            <CardItem
              key={card.id}
              card={card}
              index={baseIndex + i}
              viewAs={viewAs}
              compact={compact}
            />
          ))}
        </div>
      )}
    </VariantGroupContainer>
  );
}
