import 'server-only';
import { anthropic, assertAnthropicConfigured, FAST_MODEL } from '@/lib/anthropic/client';

export interface ScrapedProduct {
  title: string;
  description?: string;
  imageUrl?: string;
  valueCents?: number;
  sourceRetailer?: string;
}

const MAX_HTML_CHARS = 30_000;
const MAX_TOKENS = 600;

const SYSTEM_PROMPT =
  'Extract product info from HTML for a gift-curation app. Respond with ONLY a JSON object — no prose, no code fence. Shape: {"title": string, "description"?: string (1-2 sentences), "imageUrl"?: string (absolute https URL), "valueCents"?: integer (price in cents, USD; convert other currencies to USD using ~current rates), "sourceRetailer"?: string (brand name)}. If you cannot identify a product, respond with {"title": ""}.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function trimHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .slice(0, MAX_HTML_CHARS);
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

function extractJsonText(rawText: string): unknown {
  const trimmed = rawText.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // continue to fenced/braced extraction
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1]);
    } catch {
      // fall through
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

export interface ExtractInput {
  html: string;
  sourceUrl: string;
}

export async function extractProduct(
  opts: ExtractInput,
): Promise<ScrapedProduct | null> {
  assertAnthropicConfigured();
  const trimmed = trimHtml(opts.html);

  const res = await anthropic.messages.create({
    model: FAST_MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `URL: ${opts.sourceUrl}\n\nHTML:\n${trimmed}`,
      },
    ],
  });

  const textBlock = res.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') return null;
  const parsed = extractJsonText(textBlock.text);
  return parseProduct(parsed, opts.sourceUrl);
}
