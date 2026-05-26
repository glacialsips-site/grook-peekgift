import type { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getUserId } from '@/lib/auth/server';
import { assertPeekAccess, recordEvent } from '@/lib/chat/session';
import { uploadAsset } from '@/lib/supabase/storage';
import {
  enforceRateLimit,
  limiters,
  rateLimitResponse,
} from '@/lib/rate-limit/redis';
import { getClientIp } from '@/lib/security/client-ip';
import { isOriginAllowed, originRejectionResponse } from '@/lib/security/origin';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'api/upload' });

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const MAX_SIZE = 8 * 1024 * 1024;
const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function POST(req: NextRequest): Promise<Response> {
  if (!isOriginAllowed(req)) {
    return originRejectionResponse();
  }

  const peekId = req.nextUrl.searchParams.get('peekId');
  if (!peekId) {
    return Response.json({ error: 'peekId required' }, { status: 400 });
  }

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
    return Response.json({ error: 'too_large' }, { status: 413 });
  }
  if (!ALLOWED.has(file.type)) {
    return Response.json(
      { error: 'unsupported_type', type: file.type },
      { status: 415 },
    );
  }

  const ext = EXT_BY_TYPE[file.type] ?? 'bin';
  const path = `chat-uploads/${peekId}/${randomUUID()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  let result: { path: string; publicUrl: string };
  try {
    result = await uploadAsset({ path, data: buf, contentType: file.type });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('uploadAsset failed', { peekId, error: message });
    return Response.json({ error: 'upload_failed', message }, { status: 500 });
  }

  await recordEvent({
    peekId,
    userId,
    sessionId,
    kind: 'upload',
    payload: {
      path: result.path,
      contentType: file.type,
      sizeBytes: file.size,
    },
  });

  return Response.json({
    url: result.publicUrl,
    path: result.path,
    contentType: file.type,
    sizeBytes: file.size,
  });
}
