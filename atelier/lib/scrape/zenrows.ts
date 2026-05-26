import 'server-only';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { withRetry } from '@/lib/retry';
import type { ScrapedPage } from './browserbase';

const ZENROWS_ENDPOINT = 'https://api.zenrows.com/v1/';
const REQUEST_TIMEOUT_MS = 20_000;
const log = logger.child({ component: 'scrape/zenrows' });

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}

export async function zenrowsScrape(url: string): Promise<ScrapedPage | null> {
  if (!env.ZENROWS_API_KEY) return null;

  const params = new URLSearchParams({
    url,
    apikey: env.ZENROWS_API_KEY,
    js_render: 'true',
  });

  let res: Response;
  try {
    res = await withRetry(
      async () => {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          REQUEST_TIMEOUT_MS,
        );
        try {
          const r = await fetch(`${ZENROWS_ENDPOINT}?${params.toString()}`, {
            signal: controller.signal,
          });
          if (!r.ok) {
            throw new HttpError(r.status, `zenrows_${r.status}`);
          }
          return r;
        } finally {
          clearTimeout(timeout);
        }
      },
      { label: 'zenrows.scrape', attempts: 3 },
    );
  } catch (err) {
    log.warn('scrape_failed', {
      url,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
  const html = await res.text().catch(() => '');
  if (!html) return null;
  return { html };
}
