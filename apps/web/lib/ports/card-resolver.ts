// Card-resolution adapters for the studio, assembled into core's makeCardResolver cascade.
//
//  • url_scrape — LIVE. The proven OG/meta fetch (lifted from app/api/scrape): a cheap direct
//    fetch first, then a ZenRows JS-render fallback when a page withholds tags from bots
//    (gated on ZENROWS_API_KEY). http image urls are upgraded to https (mixed-content guard).
//  • retailer_api / research (web-search + vision) — honest stubs: they return not-ok so the
//    cascade falls through and the turn lets the model author the card itself, instead of
//    faking a resolve. Light a tier up by giving it a real adapter — zero core changes.

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

function parseHtml(html: string, url: string): CardData | null {
  const title = pickMeta(html, ["og:title", "twitter:title"]) ?? pickTitle(html);
  if (!title) return null;
  const priceStr = pickMeta(html, ["product:price:amount", "og:price:amount"]);
  const price = priceStr ? Number.parseFloat(priceStr) : Number.NaN;
  return {
    title,
    description: pickMeta(html, ["og:description", "twitter:description", "description"]),
    image_url: httpsify(pickMeta(html, ["og:image", "twitter:image", "og:image:url"]), url),
    value_cents: Number.isFinite(price) ? Math.round(price * 100) : undefined,
    retailer: pickMeta(html, ["og:site_name"]) ?? hostnameOf(url),
    source_url: url,
  };
}

async function fetchHtml(reqUrl: string, direct: boolean): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
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
    if (!card?.title && zKey) {
      const zUrl = `https://api.zenrows.com/v1/?apikey=${encodeURIComponent(zKey)}&url=${encodeURIComponent(url)}&js_render=true`;
      html = await fetchHtml(zUrl, false);
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
