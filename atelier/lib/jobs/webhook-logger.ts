import 'server-only';
import { inngest, webhookReceivedEvent } from '@/lib/inngest/client';
import { db } from '@/db/client';
import { webhookLog } from '@/db/schema';

export const webhookLoggerFn = inngest.createFunction(
  {
    id: 'webhook-logger',
    name: 'Log webhook events',
    triggers: [webhookReceivedEvent],
  },
  async ({ event }) => {
    await db.insert(webhookLog).values({
      source: event.data.source,
      payload: event.data.payload,
      success: event.data.success,
    });
    return { logged: true };
  },
);
