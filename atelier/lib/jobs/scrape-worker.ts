import 'server-only';
import { eq } from 'drizzle-orm';
import { inngest, scrapeRequestedEvent } from '@/lib/inngest/client';
import { db } from '@/db/client';
import { cards } from '@/db/schema';
import { scrapePipeline } from '@/lib/scrape/pipeline';

export const scrapeWorkerFn = inngest.createFunction(
  {
    id: 'scrape-worker',
    name: 'Async product scrape',
    retries: 3,
    triggers: [scrapeRequestedEvent],
  },
  async ({ event, step }) => {
    const { url, placeholderCardId, peekId } = event.data;

    const outcome = await step.run('scrape', async () => {
      return scrapePipeline(url, { peekId: peekId ?? null });
    });

    await step.run('update-card', async () => {
      if (!outcome.ok) return;
      const product = outcome.product;
      await db
        .update(cards)
        .set({
          title: product.title,
          description: product.description ?? null,
          imageUrl: product.imageUrl ?? null,
          valueCents: product.valueCents ?? null,
          sourceRetailer: product.sourceRetailer ?? null,
          metadata: {
            scrape_provider: outcome.provider,
            scrape_degraded: outcome.degraded,
          },
        })
        .where(eq(cards.id, placeholderCardId));
    });

    return { placeholderCardId };
  },
);
