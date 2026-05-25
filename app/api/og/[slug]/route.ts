import { NextRequest } from 'next/server';
import { q1opt } from '@/lib/db';
import { generateOgImage } from '@/lib/imagegen';
import { getBytes } from '@/lib/storage';

export const runtime = 'nodejs';

// Returns the OG image bytes for a peek by slug. Generates lazily on miss.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const peek = await q1opt<{ id: string }>(
    `SELECT id FROM peeks WHERE slug = $1 AND status IN ('published','claimed')`,
    [slug]
  );
  if (!peek) return new Response('not_found', { status: 404 });

  const cached = await q1opt<{ image_key: string }>(
    `SELECT image_key FROM og_images WHERE peek_id = $1`,
    [peek.id]
  );
  let key = cached?.image_key;
  if (!key) {
    const url = await generateOgImage(peek.id);
    if (!url) return new Response('gen_failed', { status: 500 });
    const re = await q1opt<{ image_key: string }>(
      `SELECT image_key FROM og_images WHERE peek_id = $1`,
      [peek.id]
    );
    key = re?.image_key;
  }
  if (!key) return new Response('gen_failed', { status: 500 });

  const result = await getBytes(key);
  if (!result) return new Response('not_found', { status: 404 });
  return new Response(result.bytes as any, {
    headers: {
      'Content-Type': result.contentType || 'image/svg+xml',
      'Cache-Control': 'public, max-age=300, s-maxage=300'
    }
  });
}
