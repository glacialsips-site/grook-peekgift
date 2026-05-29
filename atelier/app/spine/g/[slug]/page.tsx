import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseService } from '@/lib/supabase/service';
import {
  CARD_COLUMNS,
  PEEK_COLUMNS,
  rowsToState,
  type SpineCardRow,
  type SpinePeekRow,
} from '@/lib/spine/wire';
import { deriveSpinePage } from '@/lib/spine/derive';
import { SlugRenderer } from '@/components/renderer/slug-renderer';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sb = getSupabaseService();
  const { data } = await sb
    .from('peeks')
    .select('recipient_name, occasion')
    .eq('slug', slug)
    .maybeSingle();
  const title = data?.recipient_name
    ? `A Peek for ${data.recipient_name}`
    : 'A Peek for you';
  return { title, description: data?.occasion ?? 'Open your Peek.' };
}

export default async function SpineRecipientPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sb = getSupabaseService();

  const peekRes = await sb
    .from('peeks')
    .select(PEEK_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();
  if (peekRes.error || !peekRes.data) notFound();

  const peekRow = peekRes.data as unknown as SpinePeekRow;

  if (peekRow.status !== 'published' && peekRow.status !== 'claimed') {
    return (
      <main style={{ padding: 48, textAlign: 'center', fontFamily: 'sans-serif' }}>
        <p>This Peek isn’t ready yet.</p>
      </main>
    );
  }

  const cardsRes = await sb
    .from('cards')
    .select(CARD_COLUMNS)
    .eq('peek_id', peekRow.id);

  const state = rowsToState(
    peekRow,
    (cardsRes.data ?? []) as unknown as SpineCardRow[],
  );
  const page = deriveSpinePage(state);

  return <SlugRenderer page={page} data-mount="recipient" />;
}
