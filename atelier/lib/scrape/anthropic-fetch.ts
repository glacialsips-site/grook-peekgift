import 'server-only';
import { anthropic, FAST_MODEL } from '@/lib/anthropic/client';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { withRetry } from '@/lib/retry';
import type { ScrapedProduct } from './extract';

const log = logger.child({ component: 'scrape/anthropic-fetch' });
const MAX_TOKENS = 800;

const SYSTEM_PROMPT =
  'You fetch a product or activity page and pull out structured data for a gift-curation app. Use the web_fetch tool with the provided URL, then respond with ONLY a JSON object (no prose, no code fence). Shape: {"title": string, "description"?: string (1-2 sentences), "imageUrl"?: string (absolute https URL of the primary product photo), "valueCents"?: integer (price in cents, USD), "sourceRetailer"?: string (brand name)}. If you cannot identify a product, respond with {"title": ""}.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractJson(rawText: string): unknown {
  const trimmed = rawText.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1]);
    } catch {
      // continue
    }
  }
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    try {
      return JSON.parse(trimmed.slice(first, last + 1));
    } catch {
      return null;
    }
  }
  return null;
}

function resolveUrl(maybeUrl: string, base: string): string | undefined {
  try {
    return new URL(maybeUrl, base).toString();
  } catch {
    return undefined;
  }
}

function parseProduct(value: unknown, sourceUrl: string): ScrapedProduct | null {
  if (!isRecord(value)) return null;
  const title = value['title'];
  if (typeof title !== 'string' || title.trim().length === 0) return null;
  const product: ScrapedProduct = { title: title.trim() };
  const description = value['description'];
  if (typeof description === 'string' && description.trim().length > 0) {
    product.description = description.trim();
  }
  const imageUrl = value['imageUrl'];
  if (typeof imageUrl === 'string' && imageUrl.length > 0) {
    const resolved = resolveUrl(imageUrl, sourceUrl);
    if (resolved && /^https?:\/\//i.test(resolved)) {
      product.imageUrl = resolved;
    }
  }
  const valueCents = value['valueCents'];
  if (typeof valueCents === 'number' && Number.isFinite(valueCents) && valueCents >= 0) {
    product.valueCents = Math.round(valueCents);
  }
  const sourceRetailer = value['sourceRetailer'];
  if (typeof sourceRetailer === 'string' && sourceRetailer.trim().length > 0) {
    product.sourceRetailer = sourceRetailer.trim();
  }
  return product;
}

export async function anthropicFetchScrape(
  url: string,
): Promise<ScrapedProduct | null> {
  if (!env.ANTHROPIC_API_KEY) return null;

  let res: Awaited<ReturnType<typeof anthropic.messages.create>>;
  try {
    res = await withRetry(
      () =>
        anthropic.messages.create({
          model: FAST_MODEL,
          max_tokens: MAX_TOKENS,
          system: SYSTEM_PROMPT,
          tools: [
            {
              type: 'web_fetch_20250910',
              name: 'web_fetch',
              max_uses: 2,
            } as never,
          ],
          messages: [
            {
              role: 'user',
              content: `Fetch this URL and extract product info as JSON: ${url}`,
            },
          ],
        }),
      { label: 'anthropic.scrape.web_fetch', attempts: 2 },
    );
  } catch (err) {
    log.warn('web_fetch_failed', {
      url,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }

  for (const block of res.content) {
    if (block.type !== 'text') continue;
    const parsed = extractJson(block.text);
    const product = parseProduct(parsed, url);
    if (product) return product;
  }
  return null;
}
