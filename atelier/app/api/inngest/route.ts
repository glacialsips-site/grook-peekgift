import type { NextRequest } from 'next/server';
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { env } from '@/lib/env';
import { dailyNudgeFn } from '@/lib/jobs/nudge-relationships';
import { scrapeWorkerFn } from '@/lib/jobs/scrape-worker';
import { webhookLoggerFn } from '@/lib/jobs/webhook-logger';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'api/inngest' });

const handlers = serve({
  client: inngest,
  functions: [dailyNudgeFn, scrapeWorkerFn, webhookLoggerFn],
});

function unconfiguredResponse(): Response {
  log.warn('webhook_unconfigured', {
    reason: 'INNGEST_EVENT_KEY/INNGEST_SIGNING_KEY unset',
  });
  return Response.json(
    { received: true, skipped: 'service_not_configured' },
    { status: 200 },
  );
}

function isConfigured(): boolean {
  // Without at least one key, the serve handler throws when Inngest cloud
  // probes the endpoint. Refuse to engage instead.
  return Boolean(env.INNGEST_EVENT_KEY ?? env.INNGEST_SIGNING_KEY);
}

export async function GET(req: NextRequest, ctx: unknown): Promise<Response> {
  if (!isConfigured()) return unconfiguredResponse();
  return handlers.GET(req, ctx);
}

export async function POST(req: NextRequest, ctx: unknown): Promise<Response> {
  if (!isConfigured()) return unconfiguredResponse();
  return handlers.POST(req, ctx);
}

export async function PUT(req: NextRequest, ctx: unknown): Promise<Response> {
  if (!isConfigured()) return unconfiguredResponse();
  return handlers.PUT(req, ctx);
}
