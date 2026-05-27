import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { cards } from '@/db/schema';
import { buildClickCustomId, wrapAffiliateLink } from '@/lib/affiliate/wrap';
import { trackFireAndForget } from '@/lib/analytics/facade';
import { logger } from '@/lib/logger';
import { scrapePipeline } from '@/lib/scrape/pipeline';
import { registerTool } from './index';

const log = logger.child({ component: 'tool/scrape_url' });

const InputSchema = z
  .object({
    url: z.string().url(),
  })
  .strict();
type Input = z.infer<typeof InputSchema>;

type Output =
  | {
      ok: true;
      card_id: string;
      title: string;
      image_url: string | null;
      description: string | null;
      provider: string;
      degraded: boolean;
      affiliate_url?: string;
      affiliate_network?: 'skimlinks' | 'sovrn' | 'direct';
    }
  | { ok: false; error: string };

registerTool<Input, Output>({
  name: 'scrape_url',
  description:
    "Fetch a product/activity URL and create a card from it — pulls title, image, description, price, retailer, and affiliate-wraps the link. Use freely whenever the curator drops a link. Cascades through providers (Browserbase → ZenRows → Jina → web fetch) and always returns something useful — even a domain stub for hostile sites; check the `degraded` flag and ask for a screenshot if the result is thin.",
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

    const outcome = await scrapePipeline(parsed.url, {
      peekId: ctx.peekId,
      userId: ctx.userId,
      sessionId: ctx.sessionId,
    });
    if (!outcome.ok) {
      log.warn('pipeline_returned_not_ok', { url: parsed.url, error: outcome.error });
      return { ok: false, error: outcome.error };
    }

    const product = outcome.product;

    const inserted = await db
      .insert(cards)
      .values({
        peekId: ctx.peekId,
        type: 'product',
        title: product.title,
        description: product.description ?? null,
        imageUrl: product.imageUrl ?? null,
        sourceUrl: parsed.url,
        sourceRetailer: product.sourceRetailer ?? null,
        valueCents: product.valueCents ?? null,
        affiliateUrl: wrapped.wrappedUrl,
        affiliateNetwork: wrapped.network,
        commissionPct:
          wrapped.commissionPctEstimate != null
            ? wrapped.commissionPctEstimate.toString()
            : null,
        addedByUserId: ctx.userId,
        metadata: { scrape_provider: outcome.provider, scrape_degraded: outcome.degraded },
      })
      .returning({ id: cards.id });

    const placeholder = inserted[0];
    if (!placeholder) {
      return { ok: false, error: 'card_insert_failed' };
    }

    if (wrapped && placeholder.id) {
      const refinedCustomId = buildClickCustomId(ctx.peekId, placeholder.id);
      const refined = wrapAffiliateLink(parsed.url, refinedCustomId);
      if (refined.wrappedUrl !== wrapped.wrappedUrl) {
        await db
          .update(cards)
          .set({ affiliateUrl: refined.wrappedUrl })
          .where(eq(cards.id, placeholder.id));
      }
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
        degraded: outcome.degraded,
        product: {
          title: product.title,
          description: product.description ?? null,
          imageUrl: product.imageUrl ?? null,
          valueCents: product.valueCents ?? null,
          sourceRetailer: product.sourceRetailer ?? null,
        },
      },
    });

    return {
      ok: true,
      card_id: placeholder.id,
      title: product.title,
      image_url: product.imageUrl ?? null,
      description: product.description ?? null,
      provider: outcome.provider,
      degraded: outcome.degraded,
      affiliate_url: wrapped.wrappedUrl,
      affiliate_network: wrapped.network,
    };
  },
});
