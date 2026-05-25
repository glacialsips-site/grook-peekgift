import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { putBytes, blobKey } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response('unauthorized', { status: 401 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return Response.json({ ok: false, error: 'no_file' }, { status: 400 });

  if (file.size > 12 * 1024 * 1024) {
    return Response.json({ ok: false, error: 'too_large' }, { status: 413 });
  }

  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const key = blobKey('upload', userId, ext);
  const stored = await putBytes(key, bytes, { contentType: file.type || 'application/octet-stream' });
  return Response.json({ ok: true, url: stored.publicUrl, key: stored.key });
}
