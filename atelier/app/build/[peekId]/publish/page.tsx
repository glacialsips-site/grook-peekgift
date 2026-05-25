import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseService } from '@/lib/supabase/service';
import { PublishStatus } from './publish-status';

export const dynamic = 'force-dynamic';

type PeekRow = {
  id: string;
  slug: string;
  curator_id: string | null;
  status: 'draft' | 'published' | 'claimed' | 'archived';
  share_url: string | null;
};

type SearchParams = {
  session_id?: string;
  mock?: string;
};

export default async function PublishPage({
  params,
  searchParams,
}: {
  params: Promise<{ peekId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { peekId } = await params;
  const { session_id: sessionId, mock } = await searchParams;
  const { userId } = await auth();
  if (!userId) {
    redirect(`/sign-in?returnTo=/build/${peekId}/publish`);
  }

  const sb = getSupabaseService();
  const { data: peekData, error: peekErr } = await sb
    .from('peeks')
    .select('id, slug, curator_id, status, share_url')
    .eq('id', peekId)
    .maybeSingle();

  if (peekErr) {
    throw new Error(`Failed to load peek: ${peekErr.message}`);
  }
  if (!peekData) notFound();

  const peek = peekData as PeekRow;
  if (peek.curator_id !== userId) {
    notFound();
  }

  return (
    <PublishStatus
      peekId={peekId}
      initialStatus={peek.status}
      initialShareUrl={peek.share_url}
      initialSlug={peek.slug}
      sessionId={sessionId ?? null}
      mock={mock === '1'}
    />
  );
}
