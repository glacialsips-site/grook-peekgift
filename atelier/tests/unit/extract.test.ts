import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createMock = vi.fn();

vi.mock('@/lib/anthropic/client', () => ({
  anthropic: {
    messages: {
      create: createMock,
    },
  },
  assertAnthropicConfigured: vi.fn(),
  DEFAULT_MODEL: 'claude-opus-4-7',
  FAST_MODEL: 'claude-haiku-4-5',
}));

function fixture(name: string): string {
  return readFileSync(
    path.join(process.cwd(), 'tests/fixtures/scrape', name),
    'utf8',
  );
}

function mockTextResponse(text: string) {
  createMock.mockResolvedValueOnce({
    content: [{ type: 'text', text }],
    usage: { input_tokens: 100, output_tokens: 50 },
    stop_reason: 'end_turn',
    model: 'claude-haiku-4-5',
  });
}

beforeEach(() => {
  createMock.mockReset();
});

describe('extractProduct', () => {
  it('parses a clean JSON response into a ScrapedProduct', async () => {
    mockTextResponse(
      JSON.stringify({
        title: 'Wireless Headphones',
        description: 'Studio-grade noise canceling.',
        imageUrl: 'https://shop.example.com/images/headphones.jpg',
        valueCents: 24999,
        sourceRetailer: 'Acme',
      }),
    );
    const { extractProduct } = await import('@/lib/scrape/extract');
    const result = await extractProduct({
      html: fixture('product-simple.html'),
      sourceUrl: 'https://shop.example.com/headphones',
    });
    expect(result).toEqual({
      title: 'Wireless Headphones',
      description: 'Studio-grade noise canceling.',
      imageUrl: 'https://shop.example.com/images/headphones.jpg',
      valueCents: 24999,
      sourceRetailer: 'Acme',
    });
    expect(createMock).toHaveBeenCalledOnce();
    const call = createMock.mock.calls[0]?.[0] as {
      messages: Array<{ content: string }>;
    };
    expect(call.messages[0]?.content).not.toContain('<script');
    expect(call.messages[0]?.content).not.toContain('<style');
  });

  it('extracts JSON wrapped in a code fence', async () => {
    mockTextResponse(
      '```json\n{"title":"Cozy Knit Blanket","description":"Handmade"}\n```',
    );
    const { extractProduct } = await import('@/lib/scrape/extract');
    const result = await extractProduct({
      html: fixture('product-noisy.html'),
      sourceUrl: 'https://shop.example.com/blanket',
    });
    expect(result?.title).toBe('Cozy Knit Blanket');
    expect(result?.description).toBe('Handmade');
  });

  it('resolves relative imageUrl against sourceUrl', async () => {
    mockTextResponse(
      JSON.stringify({
        title: 'Mug',
        imageUrl: '/imgs/mug.png',
      }),
    );
    const { extractProduct } = await import('@/lib/scrape/extract');
    const result = await extractProduct({
      html: '<html></html>',
      sourceUrl: 'https://shop.example.com/products/mug',
    });
    expect(result?.imageUrl).toBe('https://shop.example.com/imgs/mug.png');
  });

  it('returns null when title is empty', async () => {
    mockTextResponse(JSON.stringify({ title: '' }));
    const { extractProduct } = await import('@/lib/scrape/extract');
    const result = await extractProduct({
      html: '<html></html>',
      sourceUrl: 'https://shop.example.com',
    });
    expect(result).toBeNull();
  });

  it('returns null when response is not parseable JSON', async () => {
    mockTextResponse('This is not JSON at all, just prose');
    const { extractProduct } = await import('@/lib/scrape/extract');
    const result = await extractProduct({
      html: '<html></html>',
      sourceUrl: 'https://shop.example.com',
    });
    expect(result).toBeNull();
  });

  it('returns null when no text block in response', async () => {
    createMock.mockResolvedValueOnce({
      content: [],
      usage: { input_tokens: 10, output_tokens: 0 },
      stop_reason: 'end_turn',
      model: 'claude-haiku-4-5',
    });
    const { extractProduct } = await import('@/lib/scrape/extract');
    const result = await extractProduct({
      html: '<html></html>',
      sourceUrl: 'https://shop.example.com',
    });
    expect(result).toBeNull();
  });

  it('ignores non-https imageUrls', async () => {
    mockTextResponse(
      JSON.stringify({
        title: 'Thing',
        imageUrl: 'data:image/png;base64,abc',
      }),
    );
    const { extractProduct } = await import('@/lib/scrape/extract');
    const result = await extractProduct({
      html: '<html></html>',
      sourceUrl: 'https://shop.example.com',
    });
    expect(result?.imageUrl).toBeUndefined();
  });

  it('rounds non-integer valueCents', async () => {
    mockTextResponse(
      JSON.stringify({
        title: 'Coffee',
        valueCents: 449.5,
      }),
    );
    const { extractProduct } = await import('@/lib/scrape/extract');
    const result = await extractProduct({
      html: '<html></html>',
      sourceUrl: 'https://shop.example.com',
    });
    expect(result?.valueCents).toBe(450);
  });
});
