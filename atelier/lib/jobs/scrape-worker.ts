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
    const { url, placeholderCardId } = event.data;

    const product = await step.run('scrape', async () => {
      const outcome = await scrapePipeline(url);
      if (!outcome.ok) {
        throw new Error(outcome.error);
      }
      return outcome.product;
    });

    await step.run('update-card', async () => {
      await db
        .update(cards)
        .set({
          title: product.title ?? 'Scrape failed',
          description: product.description ?? null,
          imageUrl: product.imageUrl ?? null,
          valueCents: product.valueCents ?? null,
          sourceRetailer: product.sourceRetailer ?? null,
        })
        .where(eq(cards.id, placeholderCardId));
    });

    return { placeholderCardId };
  },
);
