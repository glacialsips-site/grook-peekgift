import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { ensureAnonSessionId, ensureCuratorRow } from '@/lib/auth/server';
import { getSupabaseService } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

function makeSlug(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

export default async function BuildLandingPage() {
  const { userId } = await auth();
  const sb = getSupabaseService();
  const slug = makeSlug();

  if (userId) {
    await ensureCuratorRow(userId);

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

    redirect(`/build/${data.id}`);
  }

  const anonSessionId = await ensureAnonSessionId();

  const { data, error } = await sb
    .from('peeks')
    .insert({
      slug,
      curator_id: null,
      status: 'draft',
      vibe: {},
      metadata: { anonymous_session_id: anonSessionId },
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create anonymous draft peek: ${error?.message ?? 'unknown'}`);
  }

  redirect(`/build/${data.id}`);
}
