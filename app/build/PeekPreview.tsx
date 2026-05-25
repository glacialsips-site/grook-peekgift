'use client';

import { useMemo } from 'react';
import { vibeToCssVars, DEFAULT_VIBE } from '@/lib/themes';
import type { Card, Peek, VariantGroup } from '@/lib/types';

interface Props {
  peek: Peek | null;
  cards: Card[];
  variantGroups?: VariantGroup[];
  onPick?: (card: Card) => void;
  pickedCardIds?: Set<string>;
  showSourceForCurator?: boolean;
}

export default function PeekPreview({
  peek,
  cards,
  variantGroups = [],
  onPick,
  pickedCardIds = new Set(),
  showSourceForCurator = false
}: Props) {
  const style = useMemo(() => vibeToCssVars(peek?.vibe || DEFAULT_VIBE), [peek?.vibe]);

  // Group cards by variant_group_id (null = standalone)
  const grouped = useMemo(() => {
    const byGroup: Record<string, Card[]> = {};
    const standalone: Card[] = [];
    for (const c of cards) {
      if (c.variant_group_id) {
        (byGroup[c.variant_group_id] ||= []).push(c);
      } else {
        standalone.push(c);
      }
    }
    return { byGroup, standalone };
  }, [cards]);

  return (
    <div className="stage min-h-full w-full vibe-mesh" style={style}>
      {/* Hero */}
      <div className="relative">
        {peek?.hero_image_url ? (
          <div
            className="w-full aspect-[4/3] sm:aspect-[16/9] bg-cover bg-center"
            style={{ backgroundImage: `url(${peek.hero_image_url})` }}
          />
        ) : (
          <div className="w-full aspect-[4/3] sm:aspect-[16/9] bg-gradient-to-br from-[var(--peek-accent)]/30 to-[var(--peek-accent-2)]/30 flex items-center justify-center">
            <span className="font-display text-xl opacity-50">your hero image</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 bg-gradient-to-t from-black/55 to-transparent text-white">
          <div className="text-xs uppercase tracking-[0.18em] opacity-80">
            {peek?.occasion || 'a peek'}
          </div>
          <h1 className="font-display text-3xl sm:text-5xl leading-tight mt-1">
            {peek?.recipient_name ? `for ${peek.recipient_name}` : 'for someone special'}
          </h1>
        </div>
      </div>

      {/* Note */}
      {peek?.note_md && (
        <div className="max-w-2xl mx-auto px-5 pt-8">
          <div className="surface rounded-2xl p-5 shadow-sm">
            <div className="font-display text-lg mb-1 opacity-60">a note from your curator</div>
            <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{peek.note_md}</div>
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="max-w-3xl mx-auto px-5 pt-6 pb-16">
        {cards.length === 0 ? (
          <div className="text-center opacity-50 py-20 font-display">
            cards will appear here as you build
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Standalone cards */}
            {grouped.standalone.map((c) => (
              <CardTile
                key={c.id}
                card={c}
                onPick={onPick}
                picked={pickedCardIds.has(c.id)}
                showSource={showSourceForCurator}
              />
            ))}

            {/* Variant groups */}
            {variantGroups.map((vg) => {
              const items = grouped.byGroup[vg.id] || [];
              if (!items.length) return null;
              return (
                <div key={vg.id} className="sm:col-span-2 surface rounded-2xl p-4">
                  <div className="text-xs uppercase tracking-[0.18em] opacity-60 mb-2">
                    {vg.selection === 'pick_one'
                      ? 'pick exactly one'
                      : vg.selection === 'pick_any'
                      ? 'pick any you want'
                      : 'this whole bundle'}
                  </div>
                  <div className="font-display text-xl mb-3">{vg.title}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {items.map((c) => (
                      <CardTile
                        key={c.id}
                        card={c}
                        onPick={onPick}
                        picked={pickedCardIds.has(c.id)}
                        showSource={showSourceForCurator}
                        compact
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CardTile({
  card,
  onPick,
  picked,
  showSource,
  compact = false
}: {
  card: Card;
  onPick?: (c: Card) => void;
  picked?: boolean;
  showSource?: boolean;
  compact?: boolean;
}) {
  const dollars =
    card.reveal_value && card.value_cents != null ? `$${(card.value_cents / 100).toFixed(0)}` : null;
  const clickable = !!onPick && !card.is_taunt && !card.is_locked;

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => onPick?.(card)}
      className={`group text-left surface rounded-2xl overflow-hidden shadow-sm transition border-2 ${
        picked ? 'border-[var(--peek-accent)] ring-2 ring-[var(--peek-accent)]/30' : 'border-transparent'
      } ${clickable ? 'hover:-translate-y-0.5 cursor-pointer' : ''} disabled:cursor-default`}
    >
      <div className={`relative ${compact ? 'aspect-square' : 'aspect-[4/3]'} card-grain`}>
        {card.image_url ? (
          <img
            src={card.image_url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--peek-accent)]/30 to-[var(--peek-accent-2)]/30" />
        )}
        {card.is_taunt && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-center p-3 text-white font-display text-lg">
            {card.taunt_text || 'ha. denied.'}
          </div>
        )}
        {card.is_locked && (
          <div className="absolute top-2 right-2 rounded-full bg-black/70 text-white text-[10px] uppercase tracking-wider px-2 py-1">
            locked
          </div>
        )}
        {dollars && (
          <div className="absolute top-2 left-2 rounded-full bg-white/90 text-black text-[11px] font-medium px-2 py-1">
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
      </div>
      <div className="p-3">
        <div className={`font-display ${compact ? 'text-base' : 'text-lg'} leading-tight`}>
          {card.title}
        </div>
        {card.description && (
          <div className={`mt-1 text-[13px] opacity-70 ${compact ? 'line-clamp-2' : 'line-clamp-3'}`}>
            {card.description}
          </div>
        )}
        {showSource && card.source_retailer && (
          <div className="mt-1 text-[10px] uppercase tracking-wider opacity-40">
            (curator-only: {card.source_retailer})
          </div>
        )}
      </div>
    </button>
  );
}
