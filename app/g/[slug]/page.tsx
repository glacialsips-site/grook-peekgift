import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import RecipientView from './RecipientView';

export const dynamic = 'force-dynamic';

export default async function GiftPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = supabaseAdmin();

  const { data: peek } = await db
    .from('peeks')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (!peek) notFound();
  if (peek.status === 'draft' || peek.status === 'archived') notFound();

  const [{ data: cards }, { data: vgs }, { data: picks }] = await Promise.all([
    db.from('cards').select('*').eq('peek_id', peek.id).order('position'),
    db.from('variant_groups').select('*').eq('peek_id', peek.id),
    db.from('picks').select('card_id').eq('peek_id', peek.id)
  ]);

  return (
    <RecipientView
      peek={peek}
      cards={cards || []}
      variantGroups={vgs || []}
      pickedCardIds={(picks || []).map((p: any) => p.card_id)}
      slug={slug}
    />
  );
}
