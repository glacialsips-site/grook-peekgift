import 'server-only';
import { logger } from '@/lib/logger';
import { browserbaseScrape } from './browserbase';
import { extractProduct, type ScrapedProduct } from './extract';
import { zenrowsScrape } from './zenrows';
import { jinaScrape } from './jina';
import { anthropicFetchScrape } from './anthropic-fetch';
import { normalizeImageUrl } from './image';

const PIPELINE_TIMEOUT_MS = 45_000;
const log = logger.child({ component: 'scrape/pipeline' });

export type ScrapeProvider =
  | 'browserbase'
  | 'zenrows'
  | 'jina'
  | 'anthropic_fetch'
  | 'degraded';

export type ScrapeFailure =
  | 'scrape_failed'
  | 'extract_failed'
  | 'scrape_timeout';

export type ScrapeOutcome =
  | { ok: true; product: ScrapedProduct; provider: ScrapeProvider; degraded: boolean }
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

export interface ScrapePipelineOptions {
  peekId?: string | null;
  rehost?: boolean;
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return url;
  }
}

function degradedProduct(url: string): ScrapedProduct {
  const domain = domainFromUrl(url);
  return {
    title: domain,
    description: "Couldn't pull details — link still works.",
  };
}

export async function scrapePipeline(
  url: string,
  opts: ScrapePipelineOptions = {},
): Promise<ScrapeOutcome> {
  try {
    return await withTimeout(
      runPipeline(url, opts),
      PIPELINE_TIMEOUT_MS,
      'scrape_timeout',
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn('pipeline_timeout_or_throw', { url, err: message });
    if (message === 'scrape_timeout') {
      return {
        ok: true,
        product: degradedProduct(url),
        provider: 'degraded',
        degraded: true,
      };
    }
    return {
      ok: true,
      product: degradedProduct(url),
      provider: 'degraded',
      degraded: true,
    };
  }
}

async function tryRendererTier(
  label: ScrapeProvider,
  url: string,
  scrape: () => Promise<{ html: string } | null>,
): Promise<ScrapedProduct | null> {
  let page: { html: string } | null = null;
  try {
    page = await scrape();
  } catch (err) {
    log.warn('tier_threw', {
      tier: label,
      url,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
  if (!page) return null;
  try {
    return await extractProduct({ html: page.html, sourceUrl: url });
  } catch (err) {
    log.warn('extract_threw', {
      tier: label,
      url,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function runPipeline(
  url: string,
  opts: ScrapePipelineOptions,
): Promise<ScrapeOutcome> {
  const tiers: Array<{
    name: ScrapeProvider;
    run: () => Promise<ScrapedProduct | null>;
  }> = [
    {
      name: 'browserbase',
      run: () => tryRendererTier('browserbase', url, () => browserbaseScrape(url)),
    },
    {
      name: 'zenrows',
      run: () => tryRendererTier('zenrows', url, () => zenrowsScrape(url)),
    },
    {
      name: 'jina',
      run: () => tryRendererTier('jina', url, () => jinaScrape(url)),
    },
    {
      name: 'anthropic_fetch',
      run: () => anthropicFetchScrape(url),
    },
  ];

  for (const tier of tiers) {
    const product = await tier.run();
    if (!product) {
      log.debug('tier_returned_null', { tier: tier.name, url });
      continue;
    }
    log.info('tier_succeeded', { tier: tier.name, url });
    const finalImage = await normalizeImageUrl(
      product.imageUrl,
      opts.rehost === false ? null : opts.peekId ?? null,
    );
    const finalProduct: ScrapedProduct = { ...product };
    if (finalImage) {
      finalProduct.imageUrl = finalImage;
    } else {
      delete finalProduct.imageUrl;
    }
    return { ok: true, product: finalProduct, provider: tier.name, degraded: false };
  }

  log.warn('all_tiers_failed_degrading', { url });
  return {
    ok: true,
    product: degradedProduct(url),
    provider: 'degraded',
    degraded: true,
  };
}
