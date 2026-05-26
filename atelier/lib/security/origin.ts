import 'server-only';
import { env } from '@/lib/env';

function normalizeOrigin(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

function allowedOrigins(): Set<string> {
  const out = new Set<string>();
  const app = normalizeOrigin(env.APP_URL);
  if (app) out.add(app);
  if (env.NODE_ENV !== 'production') {
    out.add('http://localhost:3000');
    out.add('http://127.0.0.1:3000');
  }
  return out;
}

export function isOriginAllowed(req: {
  headers: { get(name: string): string | null };
}): boolean {
  const allowed = allowedOrigins();
  if (allowed.size === 0) return true;
  const origin = normalizeOrigin(req.headers.get('origin'));
  if (origin && allowed.has(origin)) return true;
  const referer = normalizeOrigin(req.headers.get('referer'));
  if (referer && allowed.has(referer)) return true;
  return false;
}

export function originRejectionResponse(): Response {
  return new Response(
    JSON.stringify({ error: 'forbidden_origin' }),
    {
      status: 403,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    },
  );
}
