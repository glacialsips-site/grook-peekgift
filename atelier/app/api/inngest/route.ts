import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { dailyNudgeFn } from '@/lib/jobs/nudge-relationships';
import { scrapeWorkerFn } from '@/lib/jobs/scrape-worker';
import { webhookLoggerFn } from '@/lib/jobs/webhook-logger';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [dailyNudgeFn, scrapeWorkerFn, webhookLoggerFn],
});
