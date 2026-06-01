import 'server-only';
import { eventType, Inngest, staticSchema } from 'inngest';
import { env } from '@/lib/env';

export const scrapeRequestedEvent = eventType('peek/scrape.requested', {
  schema: staticSchema<{
    peekId: string;
    url: string;
    placeholderCardId: string;
  }>(),
});

export const nudgeDailyEvent = eventType('peek/nudge.daily', {
  schema: staticSchema<Record<string, never>>(),
});

export const webhookReceivedEvent = eventType('peek/webhook.received', {
  schema: staticSchema<{
    source: string;
    payload: Record<string, unknown>;
    success: boolean;
  }>(),
});

export const inngest = new Inngest({
  id: 'peek-gift-vnext',
  eventKey: env.INNGEST_EVENT_KEY,
  signingKey: env.INNGEST_SIGNING_KEY,
});
