import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { ensureCuratorRow, readAnonSessionId } from '@/lib/auth/server';
import { getSupabaseService } from '@/lib/supabase/service';
import { logger } from '@/lib/logger';
import { DEFAULT_VIBE } from '@/lib/peek/types';

const log = logger.child({ component: 'build/page' });

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
        vibe: DEFAULT_VIBE,
        metadata: {},
      })
      .select('id')
      .single();

    if (error || !data) {
      log.error('create_authed_peek_failed', {
        userId,
        slug,
        message: error?.message ?? 'unknown',
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
      throw new Error(`Failed to create draft peek: ${error?.message ?? 'unknown'}`);
    }

    redirect(`/build/${data.id}`);
  }

  // Anonymous curators: middleware mints the cookie BEFORE this Server Component
  // renders (Server Components cannot set cookies in Next 16). We just read it.
  const anonSessionId = await readAnonSessionId();
  if (!anonSessionId) {
    log.error('anon_session_cookie_missing', { slug });
    throw new Error('Anonymous session cookie missing — middleware did not mint one.');
  }

  const { data, error } = await sb
    .from('peeks')
    .insert({
      slug,
      curator_id: null,
      status: 'draft',
      vibe: DEFAULT_VIBE,
      metadata: { anonymous_session_id: anonSessionId },
    })
    .select('id')
    .single();

  if (error || !data) {
    log.error('create_anon_peek_failed', {
      anonSessionId,
      slug,
      message: error?.message ?? 'unknown',
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
    });
    throw new Error(`Failed to create anonymous draft peek: ${error?.message ?? 'unknown'}`);
  }

  redirect(`/build/${data.id}`);
}
