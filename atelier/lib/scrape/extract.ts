import 'server-only';
import { anthropic, assertAnthropicConfigured, FAST_MODEL } from '@/lib/anthropic/client';
import { withRetry } from '@/lib/retry';

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

const JSONLD_SCRIPT_RE =
  /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

const CURRENCY_TO_USD: Record<string, number> = {
  USD: 1,
  CAD: 0.74,
  EUR: 1.08,
  GBP: 1.27,
  AUD: 0.66,
  JPY: 0.0067,
  MXN: 0.058,
  CHF: 1.13,
};

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function findJsonLdScripts(html: string): string[] {
  const out: string[] = [];
  let match: RegExpExecArray | null;
  JSONLD_SCRIPT_RE.lastIndex = 0;
  while ((match = JSONLD_SCRIPT_RE.exec(html)) !== null) {
    const body = match[1];
    if (body && body.trim().length > 0) out.push(body);
  }
  return out;
}

function parseJsonLdBlock(raw: string): unknown[] {
  const candidates = [raw.trim(), decodeHtmlEntities(raw).trim()];
  for (const text of candidates) {
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      continue;
    }
  }
  return [];
}

function isProductType(typeField: unknown): boolean {
  if (typeof typeField === 'string') return /(^|\/)Product$/i.test(typeField);
  if (Array.isArray(typeField)) {
    return typeField.some(
      (t) => typeof t === 'string' && /(^|\/)Product$/i.test(t),
    );
  }
  return false;
}

function collectProductNodes(node: unknown): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!isRecord(value)) return;
    if (isProductType(value['@type'])) found.push(value);
    const graph = value['@graph'];
    if (Array.isArray(graph)) {
      for (const item of graph) visit(item);
    }
  };
  visit(node);
  return found;
}

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const s = firstString(item);
      if (s) return s;
    }
  }
  if (isRecord(value)) {
    const url = value['url'];
    if (typeof url === 'string' && url.trim().length > 0) return url.trim();
    const name = value['name'];
    if (typeof name === 'string' && name.trim().length > 0) return name.trim();
  }
  return undefined;
}

function pickPriceFromOffer(
  offer: Record<string, unknown>,
): { price?: number; currency?: string } {
  const priceRaw = offer['price'] ?? offer['lowPrice'] ?? offer['highPrice'];
  let price: number | undefined;
  if (typeof priceRaw === 'number' && Number.isFinite(priceRaw)) {
    price = priceRaw;
  } else if (typeof priceRaw === 'string') {
    const cleaned = priceRaw.replace(/[^\d.\-]/g, '');
    const num = Number.parseFloat(cleaned);
    if (Number.isFinite(num)) price = num;
  }
  const currencyRaw =
    offer['priceCurrency'] ??
    (isRecord(offer['priceSpecification'])
      ? (offer['priceSpecification'] as Record<string, unknown>)['priceCurrency']
      : undefined);
  const currency =
    typeof currencyRaw === 'string' ? currencyRaw.toUpperCase() : undefined;

  if (price === undefined && isRecord(offer['priceSpecification'])) {
    const spec = offer['priceSpecification'] as Record<string, unknown>;
    const specPrice = spec['price'];
    if (typeof specPrice === 'number' && Number.isFinite(specPrice)) {
      price = specPrice;
    } else if (typeof specPrice === 'string') {
      const num = Number.parseFloat(specPrice.replace(/[^\d.\-]/g, ''));
      if (Number.isFinite(num)) price = num;
    }
  }
  return { price, currency };
}

function priceToUsdCents(price: number, currency: string | undefined): number | undefined {
  if (!Number.isFinite(price) || price < 0) return undefined;
  const code = (currency ?? 'USD').toUpperCase();
  const rate = CURRENCY_TO_USD[code];
  if (!rate) return undefined;
  return Math.round(price * rate * 100);
}

function extractPriceFromOffers(
  offers: unknown,
): { price?: number; currency?: string } {
  if (!offers) return {};
  if (Array.isArray(offers)) {
    for (const offer of offers) {
      if (isRecord(offer)) {
        const got = pickPriceFromOffer(offer);
        if (got.price !== undefined) return got;
      }
    }
    return {};
  }
  if (isRecord(offers)) {
    const direct = pickPriceFromOffer(offers);
    if (direct.price !== undefined) return direct;
    if (Array.isArray(offers['offers'])) {
      for (const offer of offers['offers']) {
        if (isRecord(offer)) {
          const got = pickPriceFromOffer(offer);
          if (got.price !== undefined) return got;
        }
      }
    }
  }
  return {};
}

function brandToString(brand: unknown): string | undefined {
  if (typeof brand === 'string') return brand.trim() || undefined;
  if (Array.isArray(brand)) {
    for (const item of brand) {
      const s = brandToString(item);
      if (s) return s;
    }
    return undefined;
  }
  if (isRecord(brand)) {
    const name = brand['name'];
    if (typeof name === 'string' && name.trim().length > 0) return name.trim();
  }
  return undefined;
}

function buildProductFromJsonLd(
  node: Record<string, unknown>,
  sourceUrl: string,
): ScrapedProduct | null {
  const name = firstString(node['name']);
  if (!name) return null;

  const product: ScrapedProduct = { title: name };

  const description = firstString(node['description']);
  if (description) product.description = description;

  const image = firstString(node['image']);
  if (image) {
    const resolved = resolveUrl(image, sourceUrl);
    if (resolved && /^https?:\/\//i.test(resolved)) {
      product.imageUrl = resolved;
    }
  }

  const { price, currency } = extractPriceFromOffers(node['offers']);
  if (price !== undefined) {
    const cents = priceToUsdCents(price, currency);
    if (cents !== undefined) product.valueCents = cents;
  }

  const brand = brandToString(node['brand']);
  if (brand) product.sourceRetailer = brand;

  return product;
}

export function parseJsonLdProduct(
  html: string,
  sourceUrl: string,
): ScrapedProduct | null {
  if (!html || html.length === 0) return null;
  const scripts = findJsonLdScripts(html);
  for (const raw of scripts) {
    const blocks = parseJsonLdBlock(raw);
    for (const block of blocks) {
      const products = collectProductNodes(block);
      for (const node of products) {
        const built = buildProductFromJsonLd(node, sourceUrl);
        if (built) return built;
      }
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
  const jsonLd = parseJsonLdProduct(opts.html, opts.sourceUrl);
  if (jsonLd) return jsonLd;

  assertAnthropicConfigured();
  const trimmed = trimHtml(opts.html);

  const res = await withRetry(
    () =>
      anthropic.messages.create({
        model: FAST_MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `URL: ${opts.sourceUrl}\n\nHTML:\n${trimmed}`,
          },
        ],
      }),
    { label: 'anthropic.scrape.extract', attempts: 3 },
  );

  const textBlock = res.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') return null;
  const parsed = extractJsonText(textBlock.text);
  return parseProduct(parsed, opts.sourceUrl);
}
