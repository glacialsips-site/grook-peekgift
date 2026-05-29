import { getSupabaseService } from '@/lib/supabase/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  let peekId: string;
  try {
    const body = (await req.json()) as { peekId?: unknown };
    if (typeof body.peekId !== 'string') {
      return Response.json({ error: 'peekId required' }, { status: 400 });
    }
    peekId = body.peekId;
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  const sb = getSupabaseService();
  const appUrl = process.env['APP_URL'] ?? '';

  const current = await sb
    .from('peeks')
    .select('slug')
    .eq('id', peekId)
    .maybeSingle();
  if (current.error || !current.data) {
    return Response.json({ error: 'peek not found' }, { status: 404 });
  }
  const slug = current.data.slug;

  const { error } = await sb
    .from('peeks')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      share_url: appUrl ? `${appUrl}/spine/g/${slug}` : `/spine/g/${slug}`,
    })
    .eq('id', peekId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ slug, url: `/spine/g/${slug}` });
}
