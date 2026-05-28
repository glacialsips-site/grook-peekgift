import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { peeks } from '@/db/schema';
import { getUserId } from '@/lib/auth/server';
import { assertPeekAccess } from '@/lib/chat/session';
import { uploadToFilesApi } from '@/lib/anthropic/files-api';
import {
  enforceRateLimit,
  limiters,
  rateLimitResponse,
} from '@/lib/rate-limit/redis';
import { getClientIp } from '@/lib/security/client-ip';
import { isOriginAllowed, originRejectionResponse } from '@/lib/security/origin';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'api/upload/anthropic' });

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const MAX_SIZE = 500 * 1024 * 1024;

const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
]);

const PURPOSES = new Set([
  'hero_candidate_album',
  'recipient_voice_memo',
  'recipient_pdf',
  'inspiration_doc',
]);

export async function POST(req: NextRequest): Promise<Response> {
  if (!isOriginAllowed(req)) return originRejectionResponse();

  const peekId = req.nextUrl.searchParams.get('peekId');
  const purposeRaw = req.nextUrl.searchParams.get('purpose');
  if (!peekId) {
    return Response.json({ error: 'peekId required' }, { status: 400 });
  }
  if (!purposeRaw || !PURPOSES.has(purposeRaw)) {
    return Response.json({ error: 'invalid_purpose' }, { status: 400 });
  }
  const purpose = purposeRaw;

  const userId = await getUserId();
  const sessionId = req.cookies.get('peek-anon-session')?.value ?? '';

  const access = await assertPeekAccess({ peekId, userId, sessionId });
  if (!access.ok) {
    return Response.json(
      { error: access.reason },
      { status: access.reason === 'forbidden' ? 403 : 404 },
    );
  }

  const ip = getClientIp(req);
  const limitKey = userId ?? `ip:${ip}:${sessionId || 'anon'}`;
  const verdict = await enforceRateLimit(limiters.uploadPerUser(), limitKey);
  if (!verdict.ok) return rateLimitResponse(verdict);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: 'invalid_form' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return Response.json({ error: 'file field required' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return Response.json(
      { error: 'too_large', max_bytes: MAX_SIZE },
      { status: 413 },
    );
  }
  if (!ALLOWED.has(file.type)) {
    return Response.json(
      { error: 'unsupported_type', type: file.type },
      { status: 415 },
    );
  }

  let fileMeta;
  try {
    fileMeta = await uploadToFilesApi(file);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('files_api_upload_failed', { peekId, message: msg });
    return Response.json(
      { error: 'upload_failed', message: msg },
      { status: 502 },
    );
  }

  try {
    const [row] = await db
      .select({ metadata: peeks.metadata })
      .from(peeks)
      .where(eq(peeks.id, peekId));
    const meta = (row?.metadata as Record<string, unknown>) ?? {};
    const existing = Array.isArray(meta['uploaded_files'])
      ? (meta['uploaded_files'] as unknown[])
      : [];
    const entry = {
      file_id: fileMeta.id,
      original_name: fileMeta.filename,
      mime: fileMeta.mime_type,
      size_bytes: fileMeta.size_bytes,
      uploaded_at: fileMeta.created_at,
      purpose,
    };
    await db
      .update(peeks)
      .set({
        metadata: { ...meta, uploaded_files: [...existing, entry] },
        updatedAt: new Date(),
      })
      .where(eq(peeks.id, peekId));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('files_api_metadata_persist_failed', { peekId, message: msg });
  }

  return Response.json({
    ok: true,
    file_id: fileMeta.id,
    purpose,
    original_name: fileMeta.filename,
    mime: fileMeta.mime_type,
    size_bytes: fileMeta.size_bytes,
  });
}
