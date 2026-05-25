import 'server-only';
import { eq } from 'drizzle-orm';
import { inngest, scrapeRequestedEvent } from '@/lib/inngest/client';
import { db } from '@/db/client';
import { cards } from '@/db/schema';
import { env } from '@/lib/env';

type ScrapeResponse = {
  title?: string;
  description?: string;
  imageUrl?: string;
  valueCents?: number;
  sourceRetailer?: string;
};

export const scrapeWorkerFn = inngest.createFunction(
  {
    id: 'scrape-worker',
    name: 'Async product scrape',
    retries: 3,
    triggers: [scrapeRequestedEvent],
  },
  async ({ event, step }) => {
    const { url, placeholderCardId } = event.data;

    const product = await step.run('scrape', async (): Promise<ScrapeResponse> => {
      const res = await fetch(`${env.APP_URL}/api/scrape`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        throw new Error(`scrape failed ${res.status}`);
      }
      return (await res.json()) as ScrapeResponse;
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
