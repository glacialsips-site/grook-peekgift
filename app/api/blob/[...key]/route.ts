import { NextRequest } from 'next/server';
import { getBytes } from '@/lib/storage';

export const runtime = 'nodejs';

// Serves blob bytes back. Public — anyone with the (random) key can fetch.
// Acceptable for image/audio assets; we add long-lived cache headers.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  const fullKey = key.map(decodeURIComponent).join('/');
  const result = await getBytes(fullKey);
  if (!result) return new Response('not_found', { status: 404 });
  return new Response(result.bytes as any, {
    headers: {
      'Content-Type': result.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}
