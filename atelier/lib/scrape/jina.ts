import 'server-only';
import { logger } from '@/lib/logger';
import { withRetry } from '@/lib/retry';
import type { ScrapedPage } from './browserbase';

const JINA_BASE = 'https://r.jina.ai/';
const REQUEST_TIMEOUT_MS = 15_000;
const log = logger.child({ component: 'scrape/jina' });

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}

function isBlocked(body: string): boolean {
  const lower = body.toLowerCase();
  if (lower.includes('performing security verification')) return true;
  if (lower.includes('cloudflare') && lower.includes('verify you are')) return true;
  if (lower.includes('target url returned error 403')) return true;
  if (lower.includes('target url returned error 404')) return true;
  if (lower.includes('access denied')) return true;
  return false;
}

export async function jinaScrape(url: string): Promise<ScrapedPage | null> {
  const target = `${JINA_BASE}${url}`;
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
          const r = await fetch(target, {
            signal: controller.signal,
            headers: {
              'X-Return-Format': 'markdown',
              Accept: 'text/plain, text/markdown',
            },
          });
          if (!r.ok) {
            throw new HttpError(r.status, `jina_${r.status}`);
          }
          return r;
        } finally {
          clearTimeout(timeout);
        }
      },
      { label: 'jina.scrape', attempts: 2 },
    );
  } catch (err) {
    log.warn('scrape_failed', {
      url,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }

  const body = await res.text().catch(() => '');
  if (!body || body.length < 50) return null;
  if (isBlocked(body)) {
    log.debug('blocked_or_empty', { url, len: body.length });
    return null;
  }
  return { html: body };
}
