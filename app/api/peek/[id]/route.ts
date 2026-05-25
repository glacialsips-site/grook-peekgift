import { NextRequest } from 'next/server';
import { safeAuth as auth } from '@/lib/clerk-safe';
import { q, q1opt } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new Response('unauthorized', { status: 401 });

  const { id } = await ctx.params;

  const peek = await q1opt<any>(
    `SELECT * FROM peeks WHERE id = $1 AND curator_id = $2`,
    [id, userId]
  );
  if (!peek) return new Response('not_found', { status: 404 });

  const [cards, vgs] = await Promise.all([
    q<any>(`SELECT * FROM cards WHERE peek_id = $1 ORDER BY position ASC`, [id]),
    q<any>(`SELECT * FROM variant_groups WHERE peek_id = $1`, [id])
  ]);

  return Response.json({ peek, cards, variant_groups: vgs });
}
