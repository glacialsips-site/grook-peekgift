/**
 * Regression test for the recipient_segment_error 500 on /g/[slug].
 *
 * Root cause: the Server Component called `ensureRecipientSessionCookie()`
 * which invoked `cookies().set(...)` from inside a Server Component. Next 16
 * forbids cookie writes during Server Component rendering — every recipient
 * hitting a published peek got a 500 with digest 3668081153.
 *
 * The fix moved cookie minting to `proxy.ts` middleware (legal context for
 * cookie writes) and switched the Server Component to a read-only path via
 * `readRecipientSessionFromCookies()`.
 *
 * This test exercises the post-fix code path: simulate middleware having
 * already minted a signed recipient_session cookie, render the SC for a
 * published peek, and assert the RecipientView renders with the recipient
 * name embedded. Also asserts the SC never attempts a cookies.set().
 */
import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const TEST_SECRET =
  'test-secret-32-chars-or-longer-for-zod-min-check-padding';
process.env['GUEST_CLAIM_TOKEN_SECRET'] =
  process.env['GUEST_CLAIM_TOKEN_SECRET'] ?? TEST_SECRET;

const PUBLISHED_SLUG = 'pub-slug-1234';
const PEEK_ID = '00000000-0000-0000-0000-000000000001';
const RECIPIENT_NAME = 'Dorothy';
const SESSION_ID = '11111111-1111-1111-1111-111111111111';
const RECIPIENT_COOKIE_NAME = 'recipient_session';
const SIGNATURE = createHmac(
  'sha256',
  process.env['GUEST_CLAIM_TOKEN_SECRET'] as string,
)
  .update(SESSION_ID)
  .digest('hex');
const COOKIE_VALUE = `${SESSION_ID}.${SIGNATURE}`;

const cookieSets: unknown[] = [];

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === RECIPIENT_COOKIE_NAME ? { value: COOKIE_VALUE } : undefined,
    set: (...args: unknown[]) => {
      cookieSets.push(args);
      throw new Error(
        'Cookies can only be modified in a Server Action or Route Handler.',
      );
    },
  }),
}));

const notFoundMock = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    child: () => ({
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    }),
  },
}));

type RowResult<T> = { data: T | null; error: { message: string } | null };

type PeekFixture = {
  id: string;
  slug: string;
  curator_id: string;
  recipient_name: string;
  relationship: string;
  occasion: string;
  giver_names: string[];
  budget_cents: number | null;
  recipient_profile: Record<string, unknown>;
  vibe: Record<string, unknown>;
  hero_image_url: string | null;
  hero_image_source: string | null;
  hero_prompt: string | null;
  note_md: string;
  status: 'draft' | 'ready_for_publish' | 'published' | 'claimed' | 'archived';
  metadata: Record<string, unknown>;
  updated_at: string;
};

const publishedPeek: PeekFixture = {
  id: PEEK_ID,
  slug: PUBLISHED_SLUG,
  curator_id: 'user_test',
  recipient_name: RECIPIENT_NAME,
  relationship: 'friend',
  occasion: 'Birthday',
  giver_names: ['Alex'],
  budget_cents: null,
  recipient_profile: {},
  vibe: { tone: 'warm', motion: 'soft' },
  hero_image_url: 'https://example.test/hero.jpg',
  hero_image_source: null,
  hero_prompt: null,
  note_md: 'Happy birthday from us.',
  status: 'published',
  metadata: {},
  updated_at: new Date().toISOString(),
};

function makeFakeService(peekRow: PeekFixture | null) {
  return {
    from(table: string) {
      if (table === 'peeks') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async (): Promise<RowResult<PeekFixture>> => ({
                data: peekRow,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'cards' || table === 'variant_groups') {
        return {
          select: () => ({
            eq: async (): Promise<RowResult<unknown[]>> => ({
              data: [],
              error: null,
            }),
          }),
        };
      }
      if (table === 'picks') {
        return {
          select: () => ({
            eq: () => ({
              eq: async (): Promise<RowResult<unknown[]>> => ({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

let serviceImpl: ReturnType<typeof makeFakeService>;

vi.mock('@/lib/supabase/service', () => ({
  getSupabaseService: () => serviceImpl,
}));

beforeEach(() => {
  cookieSets.length = 0;
  notFoundMock.mockClear();
  serviceImpl = makeFakeService(publishedPeek);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('GET /g/[slug] Server Component render', () => {
  it('renders RecipientView for a published peek without writing cookies', async () => {
    const { default: RecipientPage } = await import('@/app/g/[slug]/page');

    const node = await RecipientPage({
      params: Promise.resolve({ slug: PUBLISHED_SLUG }),
    });

    const html = renderToStaticMarkup(node as React.ReactElement);

    expect(html).toContain(RECIPIENT_NAME);
    expect(html.toLowerCase()).toContain('peek');

    expect(cookieSets).toHaveLength(0);
  });

  it('renders the AlmostReady fallback for a draft peek', async () => {
    serviceImpl = makeFakeService({ ...publishedPeek, status: 'draft' });
    const { default: RecipientPage } = await import('@/app/g/[slug]/page');

    const node = await RecipientPage({
      params: Promise.resolve({ slug: PUBLISHED_SLUG }),
    });

    const html = renderToStaticMarkup(node as React.ReactElement);

    expect(html).toContain(RECIPIENT_NAME);
    expect(html.toLowerCase()).toContain('almost ready');

    expect(cookieSets).toHaveLength(0);
  });

  it('calls notFound() for an unknown slug', async () => {
    serviceImpl = makeFakeService(null);
    const { default: RecipientPage } = await import('@/app/g/[slug]/page');

    await expect(
      RecipientPage({ params: Promise.resolve({ slug: 'nope' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(cookieSets).toHaveLength(0);
  });
});
