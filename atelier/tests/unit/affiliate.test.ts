import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

async function loadWrap(): Promise<typeof import('@/lib/affiliate/wrap')> {
  return await import('@/lib/affiliate/wrap');
}

describe('wrapAffiliateLink', () => {
  it('wraps via Skimlinks when SKIMLINKS_PUBLISHER_ID is set', async () => {
    process.env.SKIMLINKS_PUBLISHER_ID = 'pub-123';
    const { wrapAffiliateLink } = await loadWrap();
    const result = wrapAffiliateLink('https://amazon.com/dp/B0', 'peek-1');
    expect(result.network).toBe('skimlinks');
    expect(result.wrappedUrl).toContain('skimresources.com');
    expect(result.wrappedUrl).toContain('id=pub-123');
    expect(result.wrappedUrl).toContain('xs=peek-1');
    expect(result.commissionPctEstimate).toBe(5);
  });

  it('falls back to Sovrn when only SOVRN_API_KEY is set', async () => {
    delete process.env.SKIMLINKS_PUBLISHER_ID;
    process.env.SOVRN_API_KEY = 'sovrn-abc';
    const { wrapAffiliateLink } = await loadWrap();
    const result = wrapAffiliateLink('https://etsy.com/listing/123', 'peek-2');
    expect(result.network).toBe('sovrn');
    expect(result.wrappedUrl).toContain('viglink.com');
    expect(result.wrappedUrl).toContain('key=sovrn-abc');
    expect(result.wrappedUrl).toContain('cid=peek-2');
    expect(result.commissionPctEstimate).toBe(4);
  });

  it('returns direct passthrough when no affiliate network is configured', async () => {
    delete process.env.SKIMLINKS_PUBLISHER_ID;
    delete process.env.SOVRN_API_KEY;
    const { wrapAffiliateLink } = await loadWrap();
    const original = 'https://example.com/product/42';
    const result = wrapAffiliateLink(original);
    expect(result.network).toBe('direct');
    expect(result.wrappedUrl).toBe(original);
    expect(result.commissionPctEstimate).toBeNull();
  });

  it('prefers Skimlinks over Sovrn when both are configured', async () => {
    process.env.SKIMLINKS_PUBLISHER_ID = 'pub-1';
    process.env.SOVRN_API_KEY = 'sovrn-1';
    const { wrapAffiliateLink } = await loadWrap();
    const result = wrapAffiliateLink('https://example.com/p');
    expect(result.network).toBe('skimlinks');
  });

  it('omits xs param when customId is undefined', async () => {
    process.env.SKIMLINKS_PUBLISHER_ID = 'pub-1';
    const { wrapAffiliateLink } = await loadWrap();
    const result = wrapAffiliateLink('https://example.com/p');
    expect(result.wrappedUrl).not.toContain('xs=');
  });
});

describe('buildClickCustomId', () => {
  it('returns peekId alone when cardId is omitted', async () => {
    const { buildClickCustomId } = await loadWrap();
    expect(buildClickCustomId('peek-abc')).toBe('peek-abc');
  });

  it('joins peekId and cardId with a colon when both present', async () => {
    const { buildClickCustomId } = await loadWrap();
    expect(buildClickCustomId('peek-abc', 'card-xyz')).toBe('peek-abc:card-xyz');
  });
});

describe('parseClickCustomId', () => {
  it('returns null for null/undefined/empty input', async () => {
    const { parseClickCustomId } = await loadWrap();
    expect(parseClickCustomId(null)).toBeNull();
    expect(parseClickCustomId(undefined)).toBeNull();
    expect(parseClickCustomId('')).toBeNull();
  });

  it('parses peekId only', async () => {
    const { parseClickCustomId } = await loadWrap();
    expect(parseClickCustomId('peek-abc')).toEqual({
      peekId: 'peek-abc',
      cardId: null,
    });
  });

  it('parses peekId:cardId pair', async () => {
    const { parseClickCustomId } = await loadWrap();
    expect(parseClickCustomId('peek-abc:card-xyz')).toEqual({
      peekId: 'peek-abc',
      cardId: 'card-xyz',
    });
  });
});
