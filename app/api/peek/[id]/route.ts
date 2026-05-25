import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new Response('unauthorized', { status: 401 });

  const { id } = await ctx.params;
  const db = supabaseAdmin();

  const { data: peek, error: peekErr } = await db
    .from('peeks')
    .select('*')
    .eq('id', id)
    .eq('curator_id', userId)
    .maybeSingle();
  if (peekErr || !peek) return new Response('not_found', { status: 404 });

  const [{ data: cards }, { data: vgs }] = await Promise.all([
    db.from('cards').select('*').eq('peek_id', id).order('position', { ascending: true }),
    db.from('variant_groups').select('*').eq('peek_id', id)
  ]);

  return Response.json({ peek, cards: cards || [], variant_groups: vgs || [] });
}
