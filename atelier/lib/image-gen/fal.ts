import 'server-only';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { withRetry } from '@/lib/retry';

const log = logger.child({ component: 'image-gen/fal' });

export type FalAspect = '16:9' | '4:3' | '1:1' | '9:16';

export type FalModel = 'fal-ai/flux/schnell' | 'fal-ai/flux/dev';

const ASPECT_TO_SIZE: Record<FalAspect, string> = {
  '16:9': 'landscape_16_9',
  '4:3': 'landscape_4_3',
  '1:1': 'square_hd',
  '9:16': 'portrait_16_9',
};

const QUEUE_BASE = 'https://queue.fal.run';
const DEFAULT_MODEL: FalModel = 'fal-ai/flux/schnell';
const POLL_INTERVAL_MS = 1_000;
const POLL_MAX_ATTEMPTS = 60;

export interface FalResult {
  ok: boolean;
  imageUrl?: string;
  contentType?: string;
  error?: string;
}

interface FalSubmitResponse {
  request_id: string;
  status_url: string;
  response_url: string;
}

interface FalStatusResponse {
  status: string;
}

interface FalImageBlock {
  url: string;
  content_type?: string;
}

interface FalFinalResponse {
  images?: FalImageBlock[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseSubmit(value: unknown): FalSubmitResponse | null {
  if (!isRecord(value)) return null;
  const { request_id, status_url, response_url } = value;
  if (
    typeof request_id === 'string' &&
    typeof status_url === 'string' &&
    typeof response_url === 'string'
  ) {
    return { request_id, status_url, response_url };
  }
  return null;
}

function parseStatus(value: unknown): FalStatusResponse | null {
  if (!isRecord(value)) return null;
  const { status } = value;
  if (typeof status === 'string') return { status };
  return null;
}

function parseFinal(value: unknown): FalFinalResponse | null {
  if (!isRecord(value)) return null;
  const images = value['images'];
  if (!Array.isArray(images)) return { images: [] };
  const out: FalImageBlock[] = [];
  for (const item of images) {
    if (!isRecord(item)) continue;
    const url = item['url'];
    const contentType = item['content_type'];
    if (typeof url !== 'string') continue;
    const block: FalImageBlock = { url };
    if (typeof contentType === 'string') block.content_type = contentType;
    out.push(block);
  }
  return { images: out };
}

export interface GenerateFalImageOptions {
  prompt: string;
  aspect?: FalAspect;
  model?: FalModel;
}

export async function generateFalImage(
  opts: GenerateFalImageOptions,
): Promise<FalResult> {
  if (!env.FAL_KEY) return { ok: false, error: 'fal_not_configured' };

  const aspect: FalAspect = opts.aspect ?? '16:9';
  const model: FalModel = opts.model ?? DEFAULT_MODEL;
  const size = ASPECT_TO_SIZE[aspect];
  const headers: Record<string, string> = {
    Authorization: `Key ${env.FAL_KEY}`,
    'Content-Type': 'application/json',
  };

  let submit: Response;
  try {
    submit = await withRetry(
      () =>
        fetch(`${QUEUE_BASE}/${model}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            prompt: opts.prompt,
            image_size: size,
            num_images: 1,
            enable_safety_checker: true,
          }),
        }),
      {
        label: 'fal.submit',
        attempts: 3,
        retryOn: (err) =>
          err instanceof Error &&
          /network|fetch|timeout|ECONN|ETIMEDOUT/i.test(err.message),
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn('submit_network_failed', { err: message });
    return { ok: false, error: `fal_submit_network: ${message}` };
  }

  if (!submit.ok) {
    const detail = await submit.text().catch(() => '');
    log.warn('submit_http_error', {
      status: submit.status,
      detail: detail.slice(0, 200),
    });
    return {
      ok: false,
      error: `fal_submit_${submit.status}: ${detail.slice(0, 200)}`,
    };
  }

  const submitJson = await submit.json().catch(() => null);
  const parsedSubmit = parseSubmit(submitJson);
  if (!parsedSubmit) return { ok: false, error: 'fal_submit_unparsable' };

  let completed = false;
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    let status: Response;
    try {
      status = await fetch(parsedSubmit.status_url, {
        headers: { Authorization: `Key ${env.FAL_KEY}` },
      });
    } catch {
      continue;
    }
    if (!status.ok) continue;
    const statusJson = await status.json().catch(() => null);
    const parsedStatus = parseStatus(statusJson);
    if (!parsedStatus) continue;
    if (parsedStatus.status === 'COMPLETED') {
      completed = true;
      break;
    }
    if (parsedStatus.status === 'FAILED') {
      return { ok: false, error: 'fal_generation_failed' };
    }
  }

  if (!completed) return { ok: false, error: 'fal_timeout' };

  let final: Response;
  try {
    final = await withRetry(
      () =>
        fetch(parsedSubmit.response_url, {
          headers: { Authorization: `Key ${env.FAL_KEY}` },
        }),
      {
        label: 'fal.response',
        attempts: 3,
        retryOn: (err) =>
          err instanceof Error &&
          /network|fetch|timeout|ECONN|ETIMEDOUT/i.test(err.message),
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn('response_network_failed', { err: message });
    return { ok: false, error: `fal_response_network: ${message}` };
  }
  if (!final.ok) {
    log.warn('response_http_error', { status: final.status });
    return { ok: false, error: `fal_response_${final.status}` };
  }
  const finalJson = await final.json().catch(() => null);
  const parsedFinal = parseFinal(finalJson);
  if (!parsedFinal) return { ok: false, error: 'fal_response_unparsable' };

  const first = parsedFinal.images?.[0];
  if (!first) return { ok: false, error: 'fal_no_image' };

  const result: FalResult = { ok: true, imageUrl: first.url };
  if (first.content_type) result.contentType = first.content_type;
  return result;
}
