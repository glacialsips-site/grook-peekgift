import 'server-only';
import { browserbaseScrape } from './browserbase';
import { extractProduct, type ScrapedProduct } from './extract';
import { zenrowsScrape } from './zenrows';

const PIPELINE_TIMEOUT_MS = 25_000;

export type ScrapeFailure =
  | 'scrape_failed'
  | 'extract_failed'
  | 'scrape_timeout';

export type ScrapeOutcome =
  | { ok: true; product: ScrapedProduct; provider: 'browserbase' | 'zenrows' }
  | { ok: false; error: ScrapeFailure };

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(label)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function scrapePipeline(url: string): Promise<ScrapeOutcome> {
  try {
    return await withTimeout(runPipeline(url), PIPELINE_TIMEOUT_MS, 'scrape_timeout');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'scrape_timeout') return { ok: false, error: 'scrape_timeout' };
    return { ok: false, error: 'scrape_failed' };
  }
}

async function runPipeline(url: string): Promise<ScrapeOutcome> {
  let provider: 'browserbase' | 'zenrows' | null = null;
  let page = await browserbaseScrape(url);
  if (page) {
    provider = 'browserbase';
  } else {
    page = await zenrowsScrape(url);
    if (page) provider = 'zenrows';
  }
  if (!page || !provider) return { ok: false, error: 'scrape_failed' };

  const product = await extractProduct({ html: page.html, sourceUrl: url });
  if (!product) return { ok: false, error: 'extract_failed' };
  return { ok: true, product, provider };
}
