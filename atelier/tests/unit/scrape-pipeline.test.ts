import { beforeEach, describe, expect, it, vi } from 'vitest';

const browserbaseMock = vi.fn();
const zenrowsMock = vi.fn();
const jinaMock = vi.fn();
const anthropicFetchMock = vi.fn();
const extractMock = vi.fn();
const normalizeImageUrlMock = vi.fn();

vi.mock('@/lib/scrape/browserbase', () => ({
  browserbaseScrape: browserbaseMock,
}));
vi.mock('@/lib/scrape/zenrows', () => ({
  zenrowsScrape: zenrowsMock,
}));
vi.mock('@/lib/scrape/jina', () => ({
  jinaScrape: jinaMock,
}));
vi.mock('@/lib/scrape/anthropic-fetch', () => ({
  anthropicFetchScrape: anthropicFetchMock,
}));
vi.mock('@/lib/scrape/extract', () => ({
  extractProduct: extractMock,
}));
vi.mock('@/lib/scrape/image', () => ({
  normalizeImageUrl: normalizeImageUrlMock,
}));

beforeEach(() => {
  browserbaseMock.mockReset();
  zenrowsMock.mockReset();
  jinaMock.mockReset();
  anthropicFetchMock.mockReset();
  extractMock.mockReset();
  normalizeImageUrlMock.mockReset();
  normalizeImageUrlMock.mockImplementation((url: string | undefined) =>
    Promise.resolve(url ?? null),
  );
});

describe('scrapePipeline cascade', () => {
  it('returns browserbase result when first tier succeeds', async () => {
    browserbaseMock.mockResolvedValueOnce({ html: '<html>bb</html>' });
    extractMock.mockResolvedValueOnce({
      title: 'BB Product',
      imageUrl: 'https://example.com/bb.jpg',
    });
    const { scrapePipeline } = await import('@/lib/scrape/pipeline');
    const out = await scrapePipeline('https://example.com');
    expect(out.ok).toBe(true);
    if (!out.ok) throw new Error('expected ok');
    expect(out.provider).toBe('browserbase');
    expect(out.product.title).toBe('BB Product');
    expect(out.degraded).toBe(false);
    expect(zenrowsMock).not.toHaveBeenCalled();
    expect(jinaMock).not.toHaveBeenCalled();
    expect(anthropicFetchMock).not.toHaveBeenCalled();
  });

  it('falls through to zenrows when browserbase returns null', async () => {
    browserbaseMock.mockResolvedValueOnce(null);
    zenrowsMock.mockResolvedValueOnce({ html: '<html>zr</html>' });
    extractMock.mockResolvedValueOnce({ title: 'ZR Product' });
    const { scrapePipeline } = await import('@/lib/scrape/pipeline');
    const out = await scrapePipeline('https://example.com');
    expect(out.ok).toBe(true);
    if (!out.ok) throw new Error('expected ok');
    expect(out.provider).toBe('zenrows');
  });

  it('falls through to jina when browserbase and zenrows fail', async () => {
    browserbaseMock.mockResolvedValueOnce(null);
    zenrowsMock.mockResolvedValueOnce(null);
    jinaMock.mockResolvedValueOnce({ html: '# Jina markdown' });
    extractMock.mockResolvedValueOnce({ title: 'Jina Product' });
    const { scrapePipeline } = await import('@/lib/scrape/pipeline');
    const out = await scrapePipeline('https://example.com');
    expect(out.ok).toBe(true);
    if (!out.ok) throw new Error('expected ok');
    expect(out.provider).toBe('jina');
  });

  it('falls through to anthropic_fetch when renderer tiers fail', async () => {
    browserbaseMock.mockResolvedValueOnce(null);
    zenrowsMock.mockResolvedValueOnce(null);
    jinaMock.mockResolvedValueOnce(null);
    anthropicFetchMock.mockResolvedValueOnce({
      title: 'Anthropic Product',
      imageUrl: 'https://example.com/ant.jpg',
    });
    const { scrapePipeline } = await import('@/lib/scrape/pipeline');
    const out = await scrapePipeline('https://example.com');
    expect(out.ok).toBe(true);
    if (!out.ok) throw new Error('expected ok');
    expect(out.provider).toBe('anthropic_fetch');
  });

  it('gracefully degrades when every tier fails', async () => {
    browserbaseMock.mockResolvedValueOnce(null);
    zenrowsMock.mockResolvedValueOnce(null);
    jinaMock.mockResolvedValueOnce(null);
    anthropicFetchMock.mockResolvedValueOnce(null);
    const { scrapePipeline } = await import('@/lib/scrape/pipeline');
    const out = await scrapePipeline('https://example.com/some/path');
    expect(out.ok).toBe(true);
    if (!out.ok) throw new Error('expected ok');
    expect(out.provider).toBe('degraded');
    expect(out.degraded).toBe(true);
    expect(out.product.title).toBe('example.com');
    expect(out.product.imageUrl).toBeUndefined();
  });

  it('strips imageUrl when normalize returns null', async () => {
    browserbaseMock.mockResolvedValueOnce({ html: '<html>bb</html>' });
    extractMock.mockResolvedValueOnce({
      title: 'Broken Image Product',
      imageUrl: 'https://example.com/broken.jpg',
    });
    normalizeImageUrlMock.mockResolvedValueOnce(null);
    const { scrapePipeline } = await import('@/lib/scrape/pipeline');
    const out = await scrapePipeline('https://example.com');
    if (!out.ok) throw new Error('expected ok');
    expect(out.product.imageUrl).toBeUndefined();
  });

  it('skips a tier that throws and continues', async () => {
    browserbaseMock.mockRejectedValueOnce(new Error('boom'));
    zenrowsMock.mockResolvedValueOnce({ html: '<html>zr</html>' });
    extractMock.mockResolvedValueOnce({ title: 'After Throw' });
    const { scrapePipeline } = await import('@/lib/scrape/pipeline');
    const out = await scrapePipeline('https://example.com');
    if (!out.ok) throw new Error('expected ok');
    expect(out.provider).toBe('zenrows');
  });
});
