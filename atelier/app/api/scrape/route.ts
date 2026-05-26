import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { getUserId } from '@/lib/auth/server';
import { getSupabaseService } from '@/lib/supabase/service';
import type { DbInsert } from '@/lib/supabase/database.types';
import { scrapePipeline } from '@/lib/scrape/pipeline';
import type { ScrapedProduct } from '@/lib/scrape/extract';
import {
  enforceRateLimit,
  limiters,
  rateLimitResponse,
} from '@/lib/rate-limit/redis';
import { isOriginAllowed, originRejectionResponse } from '@/lib/security/origin';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const BodySchema = z
  .object({
    url: z.string().url(),
    peekId: z.string().uuid().optional(),
    sessionId: z.string().min(1).max(200).optional(),
  })
  .strict();

const CACHE_KIND = 'scrape_complete';

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseCachedProduct(payload: unknown): ScrapedProduct | null {
  if (!isRecord(payload)) return null;
  const product = payload['product'];
  if (!isRecord(product)) return null;
  const title = product['title'];
  if (typeof title !== 'string' || title.length === 0) return null;
  const out: ScrapedProduct = { title };
  const description = product['description'];
  if (typeof description === 'string') out.description = description;
  const imageUrl = product['imageUrl'];
  if (typeof imageUrl === 'string') out.imageUrl = imageUrl;
  const valueCents = product['valueCents'];
  if (typeof valueCents === 'number') out.valueCents = valueCents;
  const sourceRetailer = product['sourceRetailer'];
  if (typeof sourceRetailer === 'string') out.sourceRetailer = sourceRetailer;
  return out;
}

async function lookupCachedProduct(
  sb: ReturnType<typeof getSupabaseService>,
  url: string,
): Promise<ScrapedProduct | null> {
  const { data, error } = await sb
    .from('events')
    .select('payload')
    .eq('kind', CACHE_KIND)
    .contains('payload', { url })
    .order('ts', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  if (!data) return null;
  return parseCachedProduct(data.payload);
}

interface ScrapeRequestContext {
  userId: string;
  peekId: string | null;
  sessionId: string | null;
}

async function recordScrapeEvent(
  sb: ReturnType<typeof getSupabaseService>,
  ctx: ScrapeRequestContext,
  payload: Record<string, unknown>,
): Promise<void> {
  const row: DbInsert<'events'> = {
    user_id: ctx.userId,
    kind: CACHE_KIND,
    payload,
  };
  if (ctx.peekId) row.peek_id = ctx.peekId;
  if (ctx.sessionId) row.session_id = ctx.sessionId;
  await sb.from('events').insert(row);
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!isOriginAllowed(req)) {
    return originRejectionResponse();
  }

  const userId = await getUserId();
  if (!userId) {
    return jsonResponse({ ok: false, error: 'unauthorized' }, 401);
  }

  const verdict = await enforceRateLimit(limiters.scrapePerUser(), userId);
  if (!verdict.ok) return rateLimitResponse(verdict);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonResponse(
      {
        ok: false,
        error: 'bad_request',
        issues: parsed.error.flatten().fieldErrors,
      },
      400,
    );
  }
  const { url, peekId, sessionId } = parsed.data;

  const sb = getSupabaseService();
  const ctx: ScrapeRequestContext = {
    userId,
    peekId: peekId ?? null,
    sessionId: sessionId ?? null,
  };

  const cached = await lookupCachedProduct(sb, url);
  if (cached) {
    return jsonResponse(
      { ok: true, product: cached, source: { cached: true } },
      200,
    );
  }

  const outcome = await scrapePipeline(url);
  if (!outcome.ok) {
    await recordScrapeEvent(sb, ctx, {
      url,
      ok: false,
      error: outcome.error,
    });
    return jsonResponse(
      {
        ok: false,
        error: outcome.error,
        friendly_message:
          "We couldn't pull this product. You can add the details by hand and keep going.",
      },
      502,
    );
  }

  await recordScrapeEvent(sb, ctx, {
    url,
    ok: true,
    provider: outcome.provider,
    product: outcome.product,
  });

  return jsonResponse(
    {
      ok: true,
      product: outcome.product,
      source: { cached: false, provider: outcome.provider },
    },
    200,
  );
}
