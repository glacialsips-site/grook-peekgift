import type { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'api/posthog' });

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PH_HOST =
  process.env['NEXT_PUBLIC_POSTHOG_HOST'] ?? 'https://us.i.posthog.com';

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

function isConfigured(): boolean {
  return Boolean(process.env['NEXT_PUBLIC_POSTHOG_KEY']);
}

function unconfiguredResponse(): Response {
  log.warn('proxy_unconfigured', {
    reason: 'NEXT_PUBLIC_POSTHOG_KEY unset',
  });
  return Response.json(
    { received: true, skipped: 'service_not_configured' },
    { status: 200 },
  );
}

const FORWARD_HEADERS = new Set([
  'content-type',
  'user-agent',
  'accept',
  'accept-encoding',
  'accept-language',
  'referer',
  'cookie',
]);

// PostHog parses x-forwarded-for as the canonical client IP; normalize to a
// single value or its parser picks the Netlify edge node by accident.
function resolveClientIp(req: NextRequest): string | null {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return null;
}

async function proxy(req: NextRequest, ctx: RouteContext): Promise<Response> {
  const { path } = await ctx.params;
  const target = `${PH_HOST.replace(/\/+$/, '')}/${path.join('/')}${req.nextUrl.search}`;

  const outHeaders = new Headers();
  outHeaders.set(
    'content-type',
    req.headers.get('content-type') ?? 'application/json',
  );

  req.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (FORWARD_HEADERS.has(k)) {
      outHeaders.set(k, value);
    }
  });

  const clientIp = resolveClientIp(req);
  if (clientIp) {
    outHeaders.set('x-forwarded-for', clientIp);
    // Mirror to cf-connecting-ip so PostHog's Cloudflare-aware paths also see it.
    outHeaders.set('cf-connecting-ip', clientIp);
  }

  const init: RequestInit = {
    method: req.method,
    headers: outHeaders,
    redirect: 'manual',
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer();
  }

  const res = await fetch(target, init);
  const body = await res.arrayBuffer();

  const resHeaders = new Headers();
  const contentType = res.headers.get('content-type');
  if (contentType) resHeaders.set('content-type', contentType);
  const cacheControl = res.headers.get('cache-control');
  if (cacheControl) resHeaders.set('cache-control', cacheControl);

  // Preserve PostHog's Set-Cookie headers (session-replay handshake).
  // getSetCookie() keeps multiple cookies from being collapsed.
  const setCookieFn = (
    res.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie;
  if (typeof setCookieFn === 'function') {
    for (const cookie of setCookieFn.call(res.headers)) {
      resHeaders.append('set-cookie', cookie);
    }
  } else {
    const sc = res.headers.get('set-cookie');
    if (sc) resHeaders.set('set-cookie', sc);
  }

  return new Response(body, { status: res.status, headers: resHeaders });
}

export async function GET(
  req: NextRequest,
  ctx: RouteContext,
): Promise<Response> {
  if (!isConfigured()) return unconfiguredResponse();
  return proxy(req, ctx);
}

export async function POST(
  req: NextRequest,
  ctx: RouteContext,
): Promise<Response> {
  if (!isConfigured()) return unconfiguredResponse();
  return proxy(req, ctx);
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204 });
}
