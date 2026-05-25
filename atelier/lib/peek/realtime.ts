'use client';

import { useEffect, useState } from 'react';
import type {
  RealtimePostgresChangesPayload,
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
  RealtimePostgresDeletePayload,
} from '@supabase/supabase-js';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import type { Card, Peek, PeekDraft, VariantGroup } from './types';

type AnyRow = Record<string, unknown>;

function rowToPeek(row: AnyRow): Peek {
  return {
    id: String(row.id ?? ''),
    slug: String(row.slug ?? ''),
    curatorId: (row.curator_id as string | null) ?? null,
    recipientName: (row.recipient_name as string | null) ?? null,
    relationship: (row.relationship as string | null) ?? null,
    occasion: (row.occasion as string | null) ?? null,
    vibe: ((row.vibe as Peek['vibe']) ?? {}) as Peek['vibe'],
    heroImageUrl: (row.hero_image_url as string | null) ?? null,
    heroImageSource: (row.hero_image_source as string | null) ?? null,
    heroPrompt: (row.hero_prompt as string | null) ?? null,
    noteMd: (row.note_md as string | null) ?? null,
    status: ((row.status as Peek['status']) ?? 'draft') as Peek['status'],
    metadata: ((row.metadata as Record<string, unknown>) ?? {}) as Record<
      string,
      unknown
    >,
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function rowToCard(row: AnyRow): Card {
  return {
    id: String(row.id ?? ''),
    peekId: String(row.peek_id ?? ''),
    variantGroupId: (row.variant_group_id as string | null) ?? null,
    position: Number(row.position ?? 0),
    type: (row.type as Card['type']) ?? 'product',
    title: String(row.title ?? ''),
    description: (row.description as string | null) ?? null,
    imageUrl: (row.image_url as string | null) ?? null,
    valueCents:
      row.value_cents == null ? null : Number(row.value_cents as number),
    revealValue: Boolean(row.reveal_value ?? false),
    isTaunt: Boolean(row.is_taunt ?? false),
    tauntText: (row.taunt_text as string | null) ?? null,
    isLocked: Boolean(row.is_locked ?? false),
    unlockRule: ((row.unlock_rule as Card['unlockRule']) ??
      {}) as Card['unlockRule'],
    proposedDate: (row.proposed_date as string | null) ?? null,
    locationHint: (row.location_hint as string | null) ?? null,
    addedByUserId: (row.added_by_user_id as string | null) ?? null,
  };
}

function rowToVariantGroup(row: AnyRow): VariantGroup {
  return {
    id: String(row.id ?? ''),
    peekId: String(row.peek_id ?? ''),
    title: String(row.title ?? ''),
    selection: (row.selection as VariantGroup['selection']) ?? 'pick_one',
    position: Number(row.position ?? 0),
  };
}

function sortByPosition<T extends { position: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position);
}

export function usePeekDraft(peekId: string, initial: PeekDraft): PeekDraft {
  const [draft, setDraft] = useState<PeekDraft>(initial);

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  useEffect(() => {
    const sb = getSupabaseBrowser();
    const channel = sb
      .channel(`peek:${peekId}`)
      .on(
        'postgres_changes' as never,
        {
          event: '*',
          schema: 'peek_v2',
          table: 'peeks',
          filter: `id=eq.${peekId}`,
        },
        (payload: RealtimePostgresChangesPayload<AnyRow>) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const next = rowToPeek(
              (payload as RealtimePostgresUpdatePayload<AnyRow>).new,
            );
            setDraft((prev) => ({ ...prev, peek: next }));
          }
        },
      )
      .on(
        'postgres_changes' as never,
        {
          event: '*',
          schema: 'peek_v2',
          table: 'cards',
          filter: `peek_id=eq.${peekId}`,
        },
        (payload: RealtimePostgresChangesPayload<AnyRow>) => {
          setDraft((prev) => {
            if (payload.eventType === 'INSERT') {
              const card = rowToCard(
                (payload as RealtimePostgresInsertPayload<AnyRow>).new,
              );
              const exists = prev.cards.some((c) => c.id === card.id);
              const nextCards = exists
                ? prev.cards.map((c) => (c.id === card.id ? card : c))
                : [...prev.cards, card];
              return { ...prev, cards: sortByPosition(nextCards) };
            }
            if (payload.eventType === 'UPDATE') {
              const card = rowToCard(
                (payload as RealtimePostgresUpdatePayload<AnyRow>).new,
              );
              return {
                ...prev,
                cards: sortByPosition(
                  prev.cards.map((c) => (c.id === card.id ? card : c)),
                ),
              };
            }
            if (payload.eventType === 'DELETE') {
              const oldRow = (payload as RealtimePostgresDeletePayload<AnyRow>)
                .old;
              const oldId = oldRow ? String(oldRow.id ?? '') : '';
              return {
                ...prev,
                cards: prev.cards.filter((c) => c.id !== oldId),
              };
            }
            return prev;
          });
        },
      )
      .on(
        'postgres_changes' as never,
        {
          event: '*',
          schema: 'peek_v2',
          table: 'variant_groups',
          filter: `peek_id=eq.${peekId}`,
        },
        (payload: RealtimePostgresChangesPayload<AnyRow>) => {
          setDraft((prev) => {
            if (payload.eventType === 'INSERT') {
              const vg = rowToVariantGroup(
                (payload as RealtimePostgresInsertPayload<AnyRow>).new,
              );
              const exists = prev.variantGroups.some((g) => g.id === vg.id);
              const nextGroups = exists
                ? prev.variantGroups.map((g) => (g.id === vg.id ? vg : g))
                : [...prev.variantGroups, vg];
              return { ...prev, variantGroups: sortByPosition(nextGroups) };
            }
            if (payload.eventType === 'UPDATE') {
              const vg = rowToVariantGroup(
                (payload as RealtimePostgresUpdatePayload<AnyRow>).new,
              );
              return {
                ...prev,
                variantGroups: sortByPosition(
                  prev.variantGroups.map((g) => (g.id === vg.id ? vg : g)),
                ),
              };
            }
            if (payload.eventType === 'DELETE') {
              const oldRow = (payload as RealtimePostgresDeletePayload<AnyRow>)
                .old;
              const oldId = oldRow ? String(oldRow.id ?? '') : '';
              return {
                ...prev,
                variantGroups: prev.variantGroups.filter((g) => g.id !== oldId),
              };
            }
            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [peekId]);

  return draft;
}
