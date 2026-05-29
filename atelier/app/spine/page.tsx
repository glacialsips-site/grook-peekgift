import { redirect } from 'next/navigation';
import { getSupabaseService } from '@/lib/supabase/service';
import { DEFAULT_VIBE } from '@/lib/vibe/defaults';

export const dynamic = 'force-dynamic';

function makeSlug(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

export default async function SpineEntryPage() {
  const sb = getSupabaseService();
  const slug = makeSlug();

  const { data, error } = await sb
    .from('peeks')
    .insert({
      slug,
      curator_id: null,
      status: 'draft',
      vibe: DEFAULT_VIBE,
      metadata: { spine: true },
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`spine: failed to create draft peek: ${error?.message ?? 'unknown'}`);
  }

  redirect(`/spine/${data.id}`);
}
