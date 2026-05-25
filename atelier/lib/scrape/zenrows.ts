import 'server-only';
import { env } from '@/lib/env';
import type { ScrapedPage } from './browserbase';

const ZENROWS_ENDPOINT = 'https://api.zenrows.com/v1/';
const REQUEST_TIMEOUT_MS = 20_000;

export async function zenrowsScrape(url: string): Promise<ScrapedPage | null> {
  if (!env.ZENROWS_API_KEY) return null;

  const params = new URLSearchParams({
    url,
    apikey: env.ZENROWS_API_KEY,
    js_render: 'true',
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${ZENROWS_ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) return null;
  const html = await res.text().catch(() => '');
  if (!html) return null;
  return { html };
}
