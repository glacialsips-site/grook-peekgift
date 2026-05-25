import { z } from 'zod';
import { db } from '@/db/client';
import { cards, events } from '@/db/schema';
import { inngest } from '@/lib/inngest/client';
import { registerTool } from './index';

const InputSchema = z.object({
  url: z.string().url(),
});
type Input = z.infer<typeof InputSchema>;

type Output =
  | { ok: true; card_id: string; pending: true }
  | { ok: false; error: string };

registerTool<Input, Output>({
  name: 'scrape_url',
  description:
    'Scrape a product/activity URL the curator pasted to pull title, description, image, price, and retailer. Inserts a placeholder card immediately and queues the scrape — the card hydrates in-place when the worker resolves. Returns the card_id so you can refer to it later.',
  input_schema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Absolute URL to scrape.' },
    },
    required: ['url'],
  },
  handler: async (input, ctx): Promise<Output> => {
    const parsed = InputSchema.parse(input);

    const inserted = await db
      .insert(cards)
      .values({
        peekId: ctx.peekId,
        type: 'product',
        title: 'Scraping…',
        sourceUrl: parsed.url,
        addedByUserId: ctx.userId,
        metadata: { pending: true, scrapeUrl: parsed.url },
      })
      .returning({ id: cards.id });

    const placeholder = inserted[0];
    if (!placeholder) {
      return { ok: false, error: 'card_insert_failed' };
    }

    await db.insert(events).values({
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      peekId: ctx.peekId,
      kind: 'scrape_url_requested',
      payload: {
        url: parsed.url,
        placeholderCardId: placeholder.id,
      },
    });

    try {
      await inngest.send({
        name: 'peek/scrape.requested',
        data: {
          peekId: ctx.peekId,
          url: parsed.url,
          placeholderCardId: placeholder.id,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      await db.insert(events).values({
        userId: ctx.userId,
        sessionId: ctx.sessionId,
        peekId: ctx.peekId,
        kind: 'scrape_dispatch_failed',
        payload: { url: parsed.url, error: message, cardId: placeholder.id },
      });
    }

    return { ok: true, card_id: placeholder.id, pending: true };
  },
});
