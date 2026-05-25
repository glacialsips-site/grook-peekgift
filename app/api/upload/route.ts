import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin, STORAGE_BUCKET } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Accepts a multipart form with file=<File>. Returns the public URL.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response('unauthorized', { status: 401 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return Response.json({ ok: false, error: 'no_file' }, { status: 400 });

  const db = supabaseAdmin();
  // Make sure the bucket exists. Idempotent — ignore "already exists".
  const { error: bucketErr } = await db.storage.createBucket(STORAGE_BUCKET, { public: true });
  if (bucketErr && !/already exists/i.test(bucketErr.message)) {
    return Response.json({ ok: false, error: 'bucket_failed: ' + bucketErr.message }, { status: 500 });
  }

  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `u/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || 'bin'}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await db.storage.from(STORAGE_BUCKET).upload(path, buf, {
    contentType: file.type || 'application/octet-stream',
    upsert: false
  });
  if (upErr) return Response.json({ ok: false, error: upErr.message }, { status: 500 });

  const { data: pub } = db.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return Response.json({ ok: true, url: pub.publicUrl, path });
}
