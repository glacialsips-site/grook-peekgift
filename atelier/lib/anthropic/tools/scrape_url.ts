import { z } from 'zod';
import { db } from '@/db/client';
import { events } from '@/db/schema';
import { scrapePipeline } from '@/lib/scrape/pipeline';
import { registerTool } from './index';

const InputSchema = z.object({
  url: z.string().url(),
});
type Input = z.infer<typeof InputSchema>;

type Output =
  | {
      ok: true;
      title: string;
      description?: string;
      image_url?: string;
      value_cents?: number;
      source_retailer?: string;
      source_url: string;
    }
  | { ok: false; error: string };

registerTool<Input, Output>({
  name: 'scrape_url',
  description:
    "Scrape a product/activity URL the curator pasted to pull title, description, image, price, and retailer. Returns fields you can pass directly into add_card (including source_url so we can affiliate-wrap on insert). Returns { ok: false, error } if the URL can't be fetched or no product can be extracted.",
  input_schema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Absolute URL to scrape.' },
    },
    required: ['url'],
  },
  handler: async (input, ctx): Promise<Output> => {
    const parsed = InputSchema.parse(input);

    await db.insert(events).values({
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      peekId: ctx.peekId,
      kind: 'scrape_url_requested',
      payload: { url: parsed.url },
    });

    const outcome = await scrapePipeline(parsed.url);
    if (!outcome.ok) {
      await db.insert(events).values({
        userId: ctx.userId,
        sessionId: ctx.sessionId,
        peekId: ctx.peekId,
        kind: 'scrape_complete',
        payload: { url: parsed.url, ok: false, error: outcome.error },
      });
      return { ok: false, error: outcome.error };
    }

    await db.insert(events).values({
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      peekId: ctx.peekId,
      kind: 'scrape_complete',
      payload: {
        url: parsed.url,
        ok: true,
        provider: outcome.provider,
        product: outcome.product,
      },
    });

    const result: Output = {
      ok: true,
      title: outcome.product.title,
      source_url: parsed.url,
    };
    if (outcome.product.description !== undefined) {
      result.description = outcome.product.description;
    }
    if (outcome.product.imageUrl !== undefined) {
      result.image_url = outcome.product.imageUrl;
    }
    if (outcome.product.valueCents !== undefined) {
      result.value_cents = outcome.product.valueCents;
    }
    if (outcome.product.sourceRetailer !== undefined) {
      result.source_retailer = outcome.product.sourceRetailer;
    }
    return result;
  },
});
