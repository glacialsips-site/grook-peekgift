import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PH_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

async function proxy(req: NextRequest, ctx: RouteContext): Promise<Response> {
  const { path } = await ctx.params;
  const target = `${PH_HOST.replace(/\/+$/, '')}/${path.join('/')}${req.nextUrl.search}`;

  const init: RequestInit = {
    method: req.method,
    headers: {
      'content-type':
        req.headers.get('content-type') ?? 'application/json',
      ...(req.headers.get('user-agent')
        ? { 'user-agent': req.headers.get('user-agent') as string }
        : {}),
    },
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer();
  }

  const res = await fetch(target, init);
  const body = await res.arrayBuffer();
  const headers = new Headers();
  const contentType = res.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const cacheControl = res.headers.get('cache-control');
  if (cacheControl) headers.set('cache-control', cacheControl);
  return new Response(body, { status: res.status, headers });
}

export async function GET(
  req: NextRequest,
  ctx: RouteContext,
): Promise<Response> {
  return proxy(req, ctx);
}

export async function POST(
  req: NextRequest,
  ctx: RouteContext,
): Promise<Response> {
  return proxy(req, ctx);
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204 });
}
