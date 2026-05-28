import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

const loggerWarn = vi.fn();
const loggerInfo = vi.fn();
const loggerError = vi.fn();
const loggerDebug = vi.fn();

vi.mock('@/lib/logger', () => ({
  logger: {
    child: () => ({
      info: loggerInfo,
      warn: loggerWarn,
      error: loggerError,
      debug: loggerDebug,
    }),
  },
}));

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env['SKIMLINKS_WEBHOOK_SECRET'];
  delete process.env['CLERK_WEBHOOK_SIGNING_SECRET'];
  delete process.env['STRIPE_WEBHOOK_SECRET'];
  delete process.env['INNGEST_EVENT_KEY'];
  delete process.env['INNGEST_SIGNING_KEY'];
  delete process.env['NEXT_PUBLIC_POSTHOG_KEY'];
  loggerWarn.mockReset();
  loggerInfo.mockReset();
  loggerError.mockReset();
  loggerDebug.mockReset();
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  return JSON.parse(text) as Record<string, unknown>;
}

describe('webhook routes — graceful no-op when service keys are unset', () => {
  it('skimlinks → 200 + skipped: service_not_configured', async () => {
    const { POST } = await import('@/app/api/webhooks/skimlinks/route');
    const req = new Request('https://example.com/api/webhooks/skimlinks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ transaction_id: 't1', sale_amount: 1, commission_amount: 1 }),
    });
    const res = await POST(req as unknown as Parameters<typeof POST>[0]);
    expect(res.status).toBe(200);
    expect(res.status).not.toBe(500);
    expect(await readJson(res)).toMatchObject({
      received: true,
      skipped: 'service_not_configured',
    });
    expect(loggerWarn).toHaveBeenCalledWith(
      'webhook_unconfigured',
      expect.any(Object),
    );
  });

  it('clerk → 200 + skipped: service_not_configured', async () => {
    const { POST } = await import('@/app/api/webhooks/clerk/route');
    const req = new Request('https://example.com/api/webhooks/clerk', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'user.created', data: {} }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.status).not.toBe(500);
    expect(await readJson(res)).toMatchObject({
      received: true,
      skipped: 'service_not_configured',
    });
    expect(loggerWarn).toHaveBeenCalledWith(
      'webhook_unconfigured',
      expect.any(Object),
    );
  });

  it('stripe → 200 + skipped: service_not_configured', async () => {
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const req = new Request('https://example.com/api/stripe/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    const res = await POST(req as unknown as Parameters<typeof POST>[0]);
    expect(res.status).toBe(200);
    expect(res.status).not.toBe(500);
    expect(await readJson(res)).toMatchObject({
      received: true,
      skipped: 'service_not_configured',
    });
    expect(loggerWarn).toHaveBeenCalledWith(
      'webhook_unconfigured',
      expect.any(Object),
    );
  });

  it('inngest POST → 200 + skipped: service_not_configured', async () => {
    const { POST } = await import('@/app/api/inngest/route');
    const req = new Request('https://example.com/api/inngest', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    const res = await POST(req as unknown as Parameters<typeof POST>[0], {});
    expect(res.status).toBe(200);
    expect(res.status).not.toBe(500);
    expect(await readJson(res)).toMatchObject({
      received: true,
      skipped: 'service_not_configured',
    });
    expect(loggerWarn).toHaveBeenCalledWith(
      'webhook_unconfigured',
      expect.any(Object),
    );
  });

  it('inngest GET → 200 + skipped: service_not_configured', async () => {
    const { GET } = await import('@/app/api/inngest/route');
    const req = new Request('https://example.com/api/inngest', { method: 'GET' });
    const res = await GET(req as unknown as Parameters<typeof GET>[0], {});
    expect(res.status).toBe(200);
    expect(res.status).not.toBe(500);
  });

  it('posthog proxy POST → 200 + skipped: service_not_configured', async () => {
    const mod = await import('@/app/api/posthog/[...path]/route');
    const req = new Request('https://example.com/api/posthog/capture', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    const ctx = { params: Promise.resolve({ path: ['capture'] }) };
    const res = await mod.POST(
      req as unknown as Parameters<typeof mod.POST>[0],
      ctx,
    );
    expect(res.status).toBe(200);
    expect(res.status).not.toBe(500);
    expect(await readJson(res)).toMatchObject({
      received: true,
      skipped: 'service_not_configured',
    });
    expect(loggerWarn).toHaveBeenCalledWith(
      'proxy_unconfigured',
      expect.any(Object),
    );
  });

  it('posthog proxy GET → 200 + skipped: service_not_configured', async () => {
    const mod = await import('@/app/api/posthog/[...path]/route');
    const req = new Request(
      'https://example.com/api/posthog/decide?v=3',
      { method: 'GET' },
    );
    const ctx = { params: Promise.resolve({ path: ['decide'] }) };
    const res = await mod.GET(
      req as unknown as Parameters<typeof mod.GET>[0],
      ctx,
    );
    expect(res.status).toBe(200);
    expect(res.status).not.toBe(500);
  });
});
