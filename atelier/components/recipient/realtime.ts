'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  RealtimePostgresChangesPayload,
  RealtimePostgresDeletePayload,
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
} from '@supabase/supabase-js';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import type { DbRow } from '@/lib/supabase/database.types';

type PickRow = DbRow<'picks'>;
type RealtimeRow = Record<string, unknown>;

export type RecipientPick = {
  pickId: string;
  cardId: string;
  begMessage: string | null;
  recipientNote: string | null;
};

function rowToPick(row: RealtimeRow): RecipientPick | null {
  const id = row['id'];
  const cardId = row['card_id'];
  if (typeof id !== 'string' || typeof cardId !== 'string') return null;
  const begMessage = row['beg_message'];
  const recipientNote = row['recipient_note'];
  return {
    pickId: id,
    cardId,
    begMessage: typeof begMessage === 'string' ? begMessage : null,
    recipientNote: typeof recipientNote === 'string' ? recipientNote : null,
  };
}

export function usePeekPicks(peekId: string, initial: RecipientPick[]) {
  const [picks, setPicks] = useState<RecipientPick[]>(initial);
  const [pendingCardIds, setPendingCardIds] = useState<Set<string>>(
    () => new Set(),
  );
  const initialRef = useRef(initial);

  useEffect(() => {
    initialRef.current = initial;
    setPicks(initial);
  }, [initial]);

  const setPending = useCallback((cardId: string, isPending: boolean) => {
    setPendingCardIds((prev) => {
      const next = new Set(prev);
      if (isPending) next.add(cardId);
      else next.delete(cardId);
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    const sb = getSupabaseBrowser();
    const { data, error } = await sb
      .from('picks')
      .select('id, card_id, beg_message, recipient_note')
      .eq('peek_id', peekId);
    if (error || !data) return;
    const rows: Pick<
      PickRow,
      'id' | 'card_id' | 'beg_message' | 'recipient_note'
    >[] = data;
    setPicks(
      rows
        .map((r): RecipientPick | null => ({
          pickId: r.id,
          cardId: r.card_id,
          begMessage: r.beg_message,
          recipientNote: r.recipient_note,
        }))
        .filter((v): v is RecipientPick => v !== null),
    );
  }, [peekId]);

  useEffect(() => {
    const sb = getSupabaseBrowser();
    const channel = sb
      .channel(`peek-picks:${peekId}`)
      .on(
        'postgres_changes' as never,
        {
          event: '*',
          schema: 'peek_v2',
          table: 'picks',
          filter: `peek_id=eq.${peekId}`,
        },
        (payload: RealtimePostgresChangesPayload<RealtimeRow>) => {
          setPicks((prev) => {
            if (payload.eventType === 'INSERT') {
              const next = rowToPick(
                (payload as RealtimePostgresInsertPayload<RealtimeRow>).new,
              );
              if (!next) return prev;
              const exists = prev.some((p) => p.pickId === next.pickId);
              return exists
                ? prev.map((p) => (p.pickId === next.pickId ? next : p))
                : [...prev, next];
            }
            if (payload.eventType === 'UPDATE') {
              const next = rowToPick(
                (payload as RealtimePostgresUpdatePayload<RealtimeRow>).new,
              );
              if (!next) return prev;
              return prev.map((p) => (p.pickId === next.pickId ? next : p));
            }
            if (payload.eventType === 'DELETE') {
              const oldRow = (payload as RealtimePostgresDeletePayload<RealtimeRow>)
                .old;
              const oldIdRaw = oldRow ? oldRow['id'] : null;
              const oldId = typeof oldIdRaw === 'string' ? oldIdRaw : '';
              if (!oldId) return prev;
              return prev.filter((p) => p.pickId !== oldId);
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

  const mutate = useMemo(
    () => ({ setPending, refresh }),
    [setPending, refresh],
  );

  return { picks, pendingCardIds, mutate };
}
