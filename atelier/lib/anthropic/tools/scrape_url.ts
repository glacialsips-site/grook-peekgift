import { z } from 'zod';
import { scrapePipeline } from '@/lib/scrape/pipeline';
import { buildClickCustomId, wrapAffiliateLink } from '@/lib/affiliate/wrap';
import { trackFireAndForget } from '@/lib/analytics/facade';
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
      affiliate_url?: string;
      affiliate_network?: 'skimlinks' | 'sovrn' | 'direct';
    }
  | { ok: false; error: string };

registerTool<Input, Output>({
  name: 'scrape_url',
  description:
    "Scrape a product/activity URL the curator pasted to pull title, description, image, price, and retailer. Returns fields you can pass directly into add_card (including source_url so we can affiliate-wrap on insert) plus an affiliate_url that's already commission-wrapped. Returns { ok: false, error } if the URL can't be fetched or no product can be extracted.",
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

    const outcome = await scrapePipeline(parsed.url);
    if (!outcome.ok) {
      trackFireAndForget({
        name: 'scrape_complete',
        peekId: ctx.peekId,
        userId: ctx.userId,
        sessionId: ctx.sessionId,
        payload: { url: parsed.url, ok: false, error: outcome.error },
      });
      return { ok: false, error: outcome.error };
    }

    trackFireAndForget({
      name: 'scrape_complete',
      peekId: ctx.peekId,
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      payload: {
        url: parsed.url,
        ok: true,
        provider: outcome.provider,
        product: outcome.product,
        affiliate_url: wrapped.wrappedUrl,
        affiliate_network: wrapped.network,
      },
    });

    const result: Output = {
      ok: true,
      title: outcome.product.title,
      source_url: parsed.url,
      affiliate_url: wrapped.wrappedUrl,
      affiliate_network: wrapped.network,
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
