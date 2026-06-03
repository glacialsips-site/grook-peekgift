// Card-resolution adapters for the studio, assembled into core's makeCardResolver cascade.
//
//  • url_scrape — LIVE. Reads a product page best-effort, richest source first: JSON-LD
//    (schema.org Product — what most retailers embed for Google, the most reliable price/
//    image/title) → OpenGraph/Twitter meta → <title>. A cheap direct fetch first, then a
//    ZenRows fallback when a page withholds data from bots (gated on ZENROWS_API_KEY;
//    js_render handles SPAs, and premium-proxy/antibot is opt-in via ZENROWS_PREMIUM=1 for the
//    hard retailers — costs more credits). http image urls are upgraded to https.
//  • retailer_api / research (web-search + vision) — honest stubs: they return not-ok so the
//    cascade falls through and the turn lets the model author the card itself. The research
//    tier (fuzzy ask → real products) is the PerfectPurchase core and is NOT built yet —
//    wiring it is the next big lever, not a patch.

import {
  makeCardResolver,
  type CardResolverPort,
  type ProductSourcePort,
  type ResearchPort,
  type CardData,
} from "@peek/core";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&nbsp;/g, " ");
}

function pickMeta(html: string, names: string[]): string | undefined {
  for (const n of names) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]+content=["']([^"']+)["']`, "i");
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${n}["']`, "i");
    const m = html.match(re1) ?? html.match(re2);
    if (m?.[1]) return decode(m[1]);
  }
  return undefined;
}

function pickTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1] ? decode(m[1].trim()) : undefined;
}

function hostnameOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

// Resolve relative urls against the page, and upgrade http→https so the image doesn't get
// blocked as mixed content on the https page.
function httpsify(u: string | undefined, base: string): string | undefined {
  if (!u) return undefined;
  let abs = u;
  if (!/^https?:\/\//i.test(u)) {
    try {
      abs = new URL(u, base).toString();
    } catch {
      return undefined;
    }
  }
  return abs.replace(/^http:\/\//i, "https://");
}

// Price string ("$1,299.00", "1299") → integer cents, comma/symbol-safe. (Number.parseFloat
// alone reads "1,299.00" as 1, since it stops at the comma — the bug this replaces.)
function priceToCents(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  const n = Number.parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : undefined;
}

// schema.org values are often arrays, or {url}/{name} objects — pull the first usable string.
function firstString(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    for (const x of v) {
      const s = firstString(x);
      if (s) return s;
    }
    return undefined;
  }
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.url === "string") return o.url;
    if (typeof o.name === "string") return o.name;
  }
  return undefined;
}

function offersPriceCents(offers: unknown): number | undefined {
  const first = Array.isArray(offers) ? offers[0] : offers;
  if (!first || typeof first !== "object") return undefined;
  const o = first as Record<string, unknown>;
  const spec =
    o.priceSpecification && typeof o.priceSpecification === "object"
      ? (o.priceSpecification as Record<string, unknown>)
      : undefined;
  return priceToCents(o.price ?? o.lowPrice ?? spec?.price);
}

// Find the first schema.org Product across all ld+json blocks (handles arrays + @graph nesting).
function pickJsonLdProduct(html: string): Record<string, unknown> | null {
  const blocks = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const b of blocks) {
    const raw = b[1];
    if (!raw) continue;
    let data: unknown;
    try {
      data = JSON.parse(raw.trim());
    } catch {
      continue;
    }
    const stack: unknown[] = [data];
    let guard = 0;
    while (stack.length && guard++ < 200) {
      const node = stack.shift();
      if (!node || typeof node !== "object") continue;
      if (Array.isArray(node)) {
        stack.push(...node);
        continue;
      }
      const o = node as Record<string, unknown>;
      if (Array.isArray(o["@graph"])) stack.push(...(o["@graph"] as unknown[]));
      const t = o["@type"];
      if (t === "Product" || (Array.isArray(t) && t.includes("Product"))) return o;
    }
  }
  return null;
}

// JSON-LD first (richest + most reliable), then OG/Twitter meta, then <title>.
function parseHtml(html: string, url: string): CardData | null {
  const ld = pickJsonLdProduct(html);
  const title =
    (ld ? firstString(ld.name) : undefined) ??
    pickMeta(html, ["og:title", "twitter:title"]) ??
    pickTitle(html);
  if (!title) return null;
  const value_cents =
    (ld ? offersPriceCents(ld.offers) : undefined) ??
    priceToCents(pickMeta(html, ["product:price:amount", "og:price:amount"]));
  const image =
    (ld ? firstString(ld.image) : undefined) ??
    pickMeta(html, ["og:image", "twitter:image", "og:image:url"]);
  const description =
    (ld ? firstString(ld.description) : undefined) ??
    pickMeta(html, ["og:description", "twitter:description", "description"]);
  const brand = ld ? firstString(ld.brand) : undefined;
  return {
    title: decode(title),
    description: description ? decode(description) : undefined,
    image_url: httpsify(image, url),
    value_cents,
    retailer: brand ?? pickMeta(html, ["og:site_name"]) ?? hostnameOf(url),
    source_url: url,
  };
}

async function fetchHtml(reqUrl: string, direct: boolean, timeoutMs = 12000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(reqUrl, {
      redirect: "follow",
      headers: direct ? { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" } : {},
      signal: ctrl.signal,
    });
    clearTimeout(t);
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

const productSource: ProductSourcePort = {
  async fromUrl(url) {
    let html = await fetchHtml(url, true);
    let card = html ? parseHtml(html, url) : null;
    const zKey = process.env.ZENROWS_API_KEY;
    // ZenRows fallback when the direct fetch was blocked/empty. js_render handles SPAs; the
    // premium proxy + antibot (opt-in, costs more credits) is what actually gets through the
    // hard retailers (Amazon/Nike/…). js_render can take >12s, so give it room.
    if (!card?.title && zKey) {
      const premium = process.env.ZENROWS_PREMIUM === "1" ? "&premium_proxy=true&antibot=true" : "";
      const zUrl = `https://api.zenrows.com/v1/?apikey=${encodeURIComponent(zKey)}&url=${encodeURIComponent(url)}&js_render=true${premium}`;
      html = await fetchHtml(zUrl, false, 35000);
      card = html ? parseHtml(html, url) : null;
    }
    if (card?.title) return { ok: true, card };
    return { ok: false, error: "couldn't read a product from that URL", retryable: true };
  },
};

const research: ResearchPort = {
  async resolveFromDescription() {
    return { ok: false, error: "research tier (web-search + vision) not wired yet" };
  },
};

export const cardResolver: CardResolverPort = makeCardResolver({ productSource, research });
