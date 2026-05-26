import { z } from 'zod';
import { db } from '@/db/client';
import { cards } from '@/db/schema';
import { buildClickCustomId, wrapAffiliateLink } from '@/lib/affiliate/wrap';
import { trackFireAndForget } from '@/lib/analytics/facade';
import { inngest } from '@/lib/inngest/client';
import { registerTool } from './index';

const InputSchema = z
  .object({
    url: z.string().url(),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

type Output =
  | { ok: true; card_id: string; pending: true; affiliate_url?: string; affiliate_network?: 'skimlinks' | 'sovrn' | 'direct' }
  | { ok: false; error: string };

registerTool<Input, Output>({
  name: 'scrape_url',
  description:
    'Scrape a product/activity URL the curator pasted to pull title, description, image, price, and retailer. Inserts a placeholder card immediately (already affiliate-wrapped) and queues the scrape — the card hydrates in-place when the worker resolves. Returns the card_id so you can refer to it later.',
  input_schema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Absolute URL to scrape.' },
    },
    required: ['url'],
  },
  handler: async (input, ctx): Promise<Output> => {
    const parsed = InputSchema.parse(input);
    const wrapped = wrapAffiliateLink(
      parsed.url,
      buildClickCustomId(ctx.peekId),
    );

    trackFireAndForget({
      name: 'scrape_url_requested',
      peekId: ctx.peekId,
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      payload: { url: parsed.url },
    });

    const inserted = await db
      .insert(cards)
      .values({
        peekId: ctx.peekId,
        type: 'product',
        title: 'Scraping…',
        sourceUrl: parsed.url,
        affiliateUrl: wrapped.wrappedUrl,
        affiliateNetwork: wrapped.network,
        commissionPct:
          wrapped.commissionPctEstimate != null
            ? wrapped.commissionPctEstimate.toString()
            : null,
        addedByUserId: ctx.userId,
        metadata: { pending: true, scrapeUrl: parsed.url },
      })
      .returning({ id: cards.id });

    const placeholder = inserted[0];
    if (!placeholder) {
      return { ok: false, error: 'card_insert_failed' };
    }

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
      trackFireAndForget({
        name: 'scrape_complete',
        peekId: ctx.peekId,
        userId: ctx.userId,
        sessionId: ctx.sessionId,
        payload: { url: parsed.url, ok: false, error: `dispatch_failed: ${message}` },
      });
    }

    return {
      ok: true,
      card_id: placeholder.id,
      pending: true,
      affiliate_url: wrapped.wrappedUrl,
      affiliate_network: wrapped.network,
    };
  },
});
