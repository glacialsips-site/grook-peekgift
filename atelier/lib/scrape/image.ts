import 'server-only';
import { logger } from '@/lib/logger';
import { rehostImage } from '@/lib/image-gen/rehost';

const HEAD_TIMEOUT_MS = 3_000;
const log = logger.child({ component: 'scrape/image' });

export async function isImageReachable(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!res.ok) {
      log.debug('head_not_ok', { url, status: res.status });
      return false;
    }
    const ct = res.headers.get('content-type') ?? '';
    if (ct && !/^image\//i.test(ct) && !/octet-stream/i.test(ct)) {
      log.debug('head_not_image', { url, ct });
      return false;
    }
    return true;
  } catch (err) {
    log.debug('head_failed', {
      url,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function rehostScrapedImage(
  sourceUrl: string,
  peekId: string,
): Promise<string | null> {
  try {
    const result = await rehostImage({
      sourceUrl,
      pathPrefix: `scrape/${peekId}`,
    });
    return result.publicUrl;
  } catch (err) {
    log.warn('rehost_failed', {
      url: sourceUrl,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function normalizeImageUrl(
  imageUrl: string | undefined,
  peekId: string | null,
): Promise<string | null> {
  if (!imageUrl) return null;
  const reachable = await isImageReachable(imageUrl);
  if (!reachable) return null;
  if (!peekId) return imageUrl;
  const rehosted = await rehostScrapedImage(imageUrl, peekId);
  return rehosted ?? imageUrl;
}
