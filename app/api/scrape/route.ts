import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Pull title, image, price from an arbitrary URL.
// Strategy: cheap HTML fetch first; if it looks blocked/empty, fall back to ZenRows.
// Browserbase is the heavyweight fallback but we skip it here for speed — wire later if needed.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response('unauthorized', { status: 401 });

  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  if (!url || !/^https?:\/\//.test(url)) return Response.json({ ok: false, error: 'bad_url' });

  const data = await tryFetch(url);
  if (data?.title) return Response.json({ ok: true, ...data });

  if (process.env.ZENROWS_API_KEY) {
    const zen = await tryZenrows(url);
    if (zen?.title) return Response.json({ ok: true, ...zen });
  }

  return Response.json({ ok: false, error: 'scrape_empty', url });
}

interface Scraped {
  title?: string;
  description?: string;
  image_url?: string;
  price_cents?: number;
  retailer?: string;
}

async function tryFetch(url: string): Promise<Scraped | null> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml'
      }
    });
    if (!res.ok) return null;
    const html = await res.text();
    return parseHtml(html, url);
  } catch {
    return null;
  }
}

async function tryZenrows(url: string): Promise<Scraped | null> {
  const key = process.env.ZENROWS_API_KEY!;
  try {
    const res = await fetch(
      `https://api.zenrows.com/v1/?apikey=${encodeURIComponent(key)}&url=${encodeURIComponent(url)}&js_render=true`
    );
    if (!res.ok) return null;
    const html = await res.text();
    return parseHtml(html, url);
  } catch {
    return null;
  }
}

function parseHtml(html: string, url: string): Scraped {
  const out: Scraped = {};
  out.title = pickMeta(html, ['og:title', 'twitter:title']) || pickTitle(html);
  out.description = pickMeta(html, ['og:description', 'twitter:description', 'description']);
  out.image_url = pickMeta(html, ['og:image', 'twitter:image', 'og:image:url']);
  const price = pickMeta(html, ['product:price:amount', 'og:price:amount']);
  if (price) {
    const num = parseFloat(price);
    if (!isNaN(num)) out.price_cents = Math.round(num * 100);
  }
  out.retailer = pickMeta(html, ['og:site_name']) || hostnameOf(url);
  // Resolve relative image URLs
  if (out.image_url && !/^https?:\/\//.test(out.image_url)) {
    try {
      out.image_url = new URL(out.image_url, url).toString();
    } catch {}
  }
  return out;
}

function pickMeta(html: string, names: string[]): string | undefined {
  for (const n of names) {
    const re1 = new RegExp(
      `<meta[^>]+(?:property|name)=["']${n}["'][^>]+content=["']([^"']+)["']`,
      'i'
    );
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${n}["']`,
      'i'
    );
    const m = html.match(re1) || html.match(re2);
    if (m) return decode(m[1]);
  }
  return undefined;
}

function pickTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? decode(m[1].trim()) : undefined;
}

function hostnameOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}
