import 'server-only';
import { env } from '@/lib/env';

export interface ScrapedPage {
  html: string;
  screenshotUrl?: string;
}

const SESSION_BASE = 'https://api.browserbase.com/v1';
const REQUEST_TIMEOUT_MS = 20_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function timedFetch(
  url: string,
  init: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    init.timeoutMs ?? REQUEST_TIMEOUT_MS,
  );
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

interface BrowserbaseSession {
  id: string;
  connectUrl?: string;
}

function parseSession(value: unknown): BrowserbaseSession | null {
  if (!isRecord(value)) return null;
  const id = value['id'];
  if (typeof id !== 'string') return null;
  const out: BrowserbaseSession = { id };
  const connectUrl = value['connectUrl'];
  if (typeof connectUrl === 'string') out.connectUrl = connectUrl;
  return out;
}

export async function browserbaseScrape(
  url: string,
): Promise<ScrapedPage | null> {
  if (!env.BROWSERBASE_API_KEY || !env.BROWSERBASE_PROJECT_ID) return null;

  const headers: Record<string, string> = {
    'X-BB-API-Key': env.BROWSERBASE_API_KEY,
    'Content-Type': 'application/json',
  };

  let sessionRes: Response;
  try {
    sessionRes = await timedFetch(`${SESSION_BASE}/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ projectId: env.BROWSERBASE_PROJECT_ID }),
    });
  } catch {
    return null;
  }
  if (!sessionRes.ok) return null;

  const sessionJson = await sessionRes.json().catch(() => null);
  const session = parseSession(sessionJson);
  if (!session) return null;

  try {
    const sessionId = session.id;
    let pageRes: Response;
    try {
      pageRes = await timedFetch(
        `${SESSION_BASE}/sessions/${sessionId}/page`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ url, waitUntil: 'networkidle' }),
        },
      );
    } catch {
      return null;
    }
    if (!pageRes.ok) return null;
    const pageJson = await pageRes.json().catch(() => null);
    if (!isRecord(pageJson)) return null;
    const html = pageJson['html'];
    if (typeof html !== 'string' || html.length === 0) return null;

    const result: ScrapedPage = { html };
    const screenshotUrl = pageJson['screenshotUrl'];
    if (typeof screenshotUrl === 'string') {
      result.screenshotUrl = screenshotUrl;
    }
    return result;
  } finally {
    try {
      await timedFetch(`${SESSION_BASE}/sessions/${session.id}`, {
        method: 'DELETE',
        headers,
        timeoutMs: 5_000,
      });
    } catch {
      // session cleanup failures are non-fatal
    }
  }
}
