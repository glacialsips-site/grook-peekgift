'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  RealtimePostgresChangesPayload,
  RealtimePostgresDeletePayload,
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
} from '@supabase/supabase-js';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

type AnyRow = Record<string, unknown>;

export type RecipientPick = {
  pickId: string;
  cardId: string;
  begMessage: string | null;
  recipientNote: string | null;
};

type PickRow = {
  id?: string | null;
  card_id?: string | null;
  beg_message?: string | null;
  recipient_note?: string | null;
};

type FetchPickRow = {
  id: string;
  card_id: string;
  beg_message: string | null;
  recipient_note: string | null;
};

function rowToPick(row: AnyRow): RecipientPick | null {
  const r = row as PickRow;
  if (!r.id || !r.card_id) return null;
  return {
    pickId: String(r.id),
    cardId: String(r.card_id),
    begMessage: (r.beg_message as string | null) ?? null,
    recipientNote: (r.recipient_note as string | null) ?? null,
  };
}

export function usePeekPicks(
  peekId: string,
  recipientSessionId: string,
  initial: RecipientPick[],
) {
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
    const rows = data as unknown as FetchPickRow[];
    setPicks(
      rows
        .map((r): RecipientPick | null => {
          if (!r.id || !r.card_id) return null;
          return {
            pickId: r.id,
            cardId: r.card_id,
            begMessage: r.beg_message,
            recipientNote: r.recipient_note,
          };
        })
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
        (payload: RealtimePostgresChangesPayload<AnyRow>) => {
          setPicks((prev) => {
            if (payload.eventType === 'INSERT') {
              const next = rowToPick(
                (payload as RealtimePostgresInsertPayload<AnyRow>).new,
              );
              if (!next) return prev;
              const exists = prev.some((p) => p.pickId === next.pickId);
              return exists
                ? prev.map((p) => (p.pickId === next.pickId ? next : p))
                : [...prev, next];
            }
            if (payload.eventType === 'UPDATE') {
              const next = rowToPick(
                (payload as RealtimePostgresUpdatePayload<AnyRow>).new,
              );
              if (!next) return prev;
              return prev.map((p) => (p.pickId === next.pickId ? next : p));
            }
            if (payload.eventType === 'DELETE') {
              const oldRow = (payload as RealtimePostgresDeletePayload<AnyRow>)
                .old;
              const oldId = oldRow ? String(oldRow.id ?? '') : '';
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
  }, [peekId, recipientSessionId]);

  const mutate = useMemo(
    () => ({ setPending, refresh }),
    [setPending, refresh],
  );

  return { picks, pendingCardIds, mutate };
}
