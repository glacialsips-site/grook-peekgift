import { notFound } from 'next/navigation';
import { getSupabaseService } from '@/lib/supabase/service';
import {
  CARD_COLUMNS,
  PEEK_COLUMNS,
  rowsToState,
  type SpineCardRow,
  type SpinePeekRow,
} from '@/lib/spine/wire';
import { SpineBuilder } from '@/components/spine/spine-builder';

export const dynamic = 'force-dynamic';

export default async function SpineBuilderPage({
  params,
}: {
  params: Promise<{ peekId: string }>;
}) {
  const { peekId } = await params;
  const sb = getSupabaseService();

  const [peekRes, cardsRes] = await Promise.all([
    sb.from('peeks').select(PEEK_COLUMNS).eq('id', peekId).maybeSingle(),
    sb.from('cards').select(CARD_COLUMNS).eq('peek_id', peekId),
  ]);

  if (peekRes.error || !peekRes.data) notFound();

  const state = rowsToState(
    peekRes.data as unknown as SpinePeekRow,
    (cardsRes.data ?? []) as unknown as SpineCardRow[],
  );

  return <SpineBuilder initialState={state} />;
}
