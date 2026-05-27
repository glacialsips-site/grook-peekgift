'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
  RealtimePostgresDeletePayload,
} from '@supabase/supabase-js';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { subscribePostgresChanges } from './subscribe-postgres-changes';
import type {
  Card,
  CardType,
  Peek,
  PeekDraft,
  PeekStatus,
  RecipientProfile,
  UnlockRule,
  VariantGroup,
  VariantSelection,
  Vibe,
} from './types';

type RealtimeRow = Record<string, unknown>;

const CARD_TYPES: readonly CardType[] = [
  'product',
  'activity',
  'aspirational',
  'digital',
];
const PEEK_STATUSES: readonly PeekStatus[] = [
  'draft',
  'published',
  'claimed',
  'archived',
];
const VARIANT_SELECTIONS: readonly VariantSelection[] = [
  'pick_one',
  'pick_any',
  'pick_all',
];

function isCardType(value: unknown): value is CardType {
  return (
    typeof value === 'string' && (CARD_TYPES as readonly string[]).includes(value)
  );
}

function isPeekStatus(value: unknown): value is PeekStatus {
  return (
    typeof value === 'string' &&
    (PEEK_STATUSES as readonly string[]).includes(value)
  );
}

function isVariantSelection(value: unknown): value is VariantSelection {
  return (
    typeof value === 'string' &&
    (VARIANT_SELECTIONS as readonly string[]).includes(value)
  );
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : fallback;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function rowToPeek(row: RealtimeRow): Peek {
  const status = row['status'];
  const vibe = asRecord(row['vibe']) as Vibe;
  const profile = asRecord(row['recipient_profile']) as RecipientProfile;
  return {
    id: asString(row['id']),
    slug: asString(row['slug']),
    curatorId: asNullableString(row['curator_id']),
    recipientName: asNullableString(row['recipient_name']),
    relationship: asNullableString(row['relationship']),
    occasion: asNullableString(row['occasion']),
    giverNames: asStringArray(row['giver_names']),
    budgetCents: asNullableNumber(row['budget_cents']),
    recipientProfile: profile,
    vibe,
    heroImageUrl: asNullableString(row['hero_image_url']),
    heroImageSource: asNullableString(row['hero_image_source']),
    heroPrompt: asNullableString(row['hero_prompt']),
    noteMd: asNullableString(row['note_md']),
    status: isPeekStatus(status) ? status : 'draft',
    metadata: asRecord(row['metadata']),
    updatedAt: asString(row['updated_at'], new Date().toISOString()),
  };
}

function rowToCard(row: RealtimeRow): Card {
  const cardType = row['type'];
  const unlockRule = asRecord(row['unlock_rule']) as UnlockRule;
  return {
    id: asString(row['id']),
    peekId: asString(row['peek_id']),
    variantGroupId: asNullableString(row['variant_group_id']),
    position: asNumber(row['position']),
    type: isCardType(cardType) ? cardType : 'product',
    title: asString(row['title']),
    description: asNullableString(row['description']),
    imageUrl: asNullableString(row['image_url']),
    valueCents: asNullableNumber(row['value_cents']),
    revealValue: asBoolean(row['reveal_value']),
    isTaunt: asBoolean(row['is_taunt']),
    tauntText: asNullableString(row['taunt_text']),
    isLocked: asBoolean(row['is_locked']),
    unlockRule,
    proposedDate: asNullableString(row['proposed_date']),
    locationHint: asNullableString(row['location_hint']),
    addedByUserId: asNullableString(row['added_by_user_id']),
  };
}

function rowToVariantGroup(row: RealtimeRow): VariantGroup {
  const selection = row['selection'];
  return {
    id: asString(row['id']),
    peekId: asString(row['peek_id']),
    title: asString(row['title']),
    selection: isVariantSelection(selection) ? selection : 'pick_one',
    position: asNumber(row['position']),
  };
}

function sortByPosition<T extends { position: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position);
}

export interface UsePeekDraftResult {
  draft: PeekDraft;
  applySnapshot: (snapshot: PeekDraft) => void;
}

export function usePeekDraft(
  peekId: string,
  initial: PeekDraft,
): UsePeekDraftResult {
  const [draft, setDraft] = useState<PeekDraft>(initial);

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  const applySnapshot = useCallback((snapshot: PeekDraft) => {
    setDraft({
      peek: snapshot.peek,
      cards: sortByPosition(snapshot.cards),
      variantGroups: sortByPosition(snapshot.variantGroups),
    });
  }, []);

  useEffect(() => {
    const sb = getSupabaseBrowser();
    const channel = sb.channel(`peek:${peekId}`);
    subscribePostgresChanges<RealtimeRow>(
      channel,
      {
        event: '*',
        schema: 'peek_v2',
        table: 'peeks',
        filter: `id=eq.${peekId}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const next = rowToPeek(
            (payload as RealtimePostgresUpdatePayload<RealtimeRow>).new,
          );
          setDraft((prev) => ({ ...prev, peek: next }));
        }
      },
    );
    subscribePostgresChanges<RealtimeRow>(
      channel,
      {
        event: '*',
        schema: 'peek_v2',
        table: 'cards',
        filter: `peek_id=eq.${peekId}`,
      },
      (payload) => {
        setDraft((prev) => {
          if (payload.eventType === 'INSERT') {
            const card = rowToCard(
              (payload as RealtimePostgresInsertPayload<RealtimeRow>).new,
            );
            const exists = prev.cards.some((c) => c.id === card.id);
            const nextCards = exists
              ? prev.cards.map((c) => (c.id === card.id ? card : c))
              : [...prev.cards, card];
            return { ...prev, cards: sortByPosition(nextCards) };
          }
          if (payload.eventType === 'UPDATE') {
            const card = rowToCard(
              (payload as RealtimePostgresUpdatePayload<RealtimeRow>).new,
            );
            return {
              ...prev,
              cards: sortByPosition(
                prev.cards.map((c) => (c.id === card.id ? card : c)),
              ),
            };
          }
          if (payload.eventType === 'DELETE') {
            const oldRow = (payload as RealtimePostgresDeletePayload<RealtimeRow>)
              .old;
            const oldIdRaw = oldRow ? oldRow['id'] : null;
            const oldId = typeof oldIdRaw === 'string' ? oldIdRaw : '';
            return {
              ...prev,
              cards: prev.cards.filter((c) => c.id !== oldId),
            };
          }
          return prev;
        });
      },
    );
    subscribePostgresChanges<RealtimeRow>(
      channel,
      {
        event: '*',
        schema: 'peek_v2',
        table: 'variant_groups',
        filter: `peek_id=eq.${peekId}`,
      },
      (payload) => {
        setDraft((prev) => {
          if (payload.eventType === 'INSERT') {
            const vg = rowToVariantGroup(
              (payload as RealtimePostgresInsertPayload<RealtimeRow>).new,
            );
            const exists = prev.variantGroups.some((g) => g.id === vg.id);
            const nextGroups = exists
              ? prev.variantGroups.map((g) => (g.id === vg.id ? vg : g))
              : [...prev.variantGroups, vg];
            return { ...prev, variantGroups: sortByPosition(nextGroups) };
          }
          if (payload.eventType === 'UPDATE') {
            const vg = rowToVariantGroup(
              (payload as RealtimePostgresUpdatePayload<RealtimeRow>).new,
            );
            return {
              ...prev,
              variantGroups: sortByPosition(
                prev.variantGroups.map((g) => (g.id === vg.id ? vg : g)),
              ),
            };
          }
          if (payload.eventType === 'DELETE') {
            const oldRow = (payload as RealtimePostgresDeletePayload<RealtimeRow>)
              .old;
            const oldIdRaw = oldRow ? oldRow['id'] : null;
            const oldId = typeof oldIdRaw === 'string' ? oldIdRaw : '';
            return {
              ...prev,
              variantGroups: prev.variantGroups.filter((g) => g.id !== oldId),
            };
          }
          return prev;
        });
      },
    );
    channel.subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [peekId]);

  return { draft, applySnapshot };
}
