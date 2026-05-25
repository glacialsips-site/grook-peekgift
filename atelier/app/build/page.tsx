import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseService } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

function makeSlug(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

export default async function BuildLandingPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in?returnTo=/build');
  }

  const sb = getSupabaseService();
  const slug = makeSlug();

  const { data, error } = await sb
    .from('peeks')
    .insert({
      slug,
      curator_id: userId,
      status: 'draft',
      vibe: {},
      metadata: {},
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create draft peek: ${error?.message ?? 'unknown'}`);
  }

  const newId = (data as { id: string }).id;
  redirect(`/build/${newId}`);
}
