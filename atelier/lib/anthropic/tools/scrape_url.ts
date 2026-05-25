import { z } from 'zod';
import { db } from '@/db/client';
import { events } from '@/db/schema';
import { buildClickCustomId, wrapAffiliateLink } from '@/lib/affiliate/wrap';
import { registerTool } from './index';

const InputSchema = z.object({
  url: z.string().url(),
});
type Input = z.infer<typeof InputSchema>;

type Output =
  | {
      ok: true;
      image_url?: string;
      title?: string;
      description?: string;
      value_cents?: number;
      source_retailer?: string;
      affiliate_url?: string;
      affiliate_network?: 'skimlinks' | 'sovrn' | 'direct';
    }
  | { ok: false; error: string };

registerTool<Input, Output>({
  name: 'scrape_url',
  description:
    "Scrape a product/activity URL the curator pasted to pull title, description, image, price, and retailer. Returns fields you can pass directly into add_card, plus an affiliate_url that's already commission-wrapped — pass it through unchanged. Currently returns { ok: false, error: 'scrape_pending_implementation' } until the /api/scrape endpoint lands — still call it when a URL appears so the URL is logged for the future endpoint.",
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
    await db.insert(events).values({
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      peekId: ctx.peekId,
      kind: 'scrape_url_requested',
      payload: {
        url: parsed.url,
        affiliate_url: wrapped.wrappedUrl,
        affiliate_network: wrapped.network,
        note: 'scrape endpoint pending implementation in future packet',
      },
    });
    return { ok: false, error: 'scrape_pending_implementation' };
  },
});
