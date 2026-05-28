/**
 * Regression test for the anonymous /build 500 bug.
 *
 * Before the fix, `app/build/page.tsx` called `ensureAnonSessionId()` which
 * invoked `cookies().set(...)` from within a Server Component. Next.js 16
 * forbids cookie writes during Server Component rendering, so the route threw
 * before reaching the Supabase insert. Result: every anon curator hitting
 * `/build` got a 500 (digest 3377218611). 0 of 26 production peeks had
 * `curator_id IS NULL`, confirming the insert path was completely broken.
 *
 * The fix moved cookie minting to `proxy.ts` middleware (which can write
 * cookies legally) and switched the SC to a read-only `readAnonSessionId()`.
 *
 * This test exercises the post-fix code path: simulate middleware having
 * already minted the anon-session cookie, render the Server Component, and
 * assert the anon peek insert succeeds and `redirect()` is called with the
 * new peek id.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface CapturedInsert {
  table: string;
  row: Record<string, unknown>;
}

const captured: { inserts: CapturedInsert[] } = { inserts: [] };

const ANON_COOKIE = 'middleware-minted-session-uuid';

// Track which cookie name was requested so the test fails loudly if the SC
// calls `.set(...)` (which is illegal in Next 16 SC contexts).
const cookieSets: unknown[] = [];

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'peek-anon-session' ? { value: ANON_COOKIE } : undefined,
    set: (...args: unknown[]) => {
      cookieSets.push(args);
      throw new Error(
        'Cookies can only be modified in a Server Action or Route Handler.',
      );
    },
  }),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: null })),
  clerkClient: vi.fn(),
  currentUser: vi.fn(),
}));

const redirectMock = vi.fn((_target: string) => {
  throw new Error('NEXT_REDIRECT');
});
vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

function makeFakeInsertResult(result: {
  data?: Record<string, unknown> | null;
  error?: { message: string; code?: string } | null;
}) {
  return {
    from(table: string) {
      return {
        insert(row: Record<string, unknown>) {
          captured.inserts.push({ table, row });
          return {
            select: (_cols: string) => ({
              single: async () => ({
                data: result.data ?? null,
                error: result.error ?? null,
              }),
            }),
          };
        },
      };
    },
  };
}

let supabaseImpl: ReturnType<typeof makeFakeInsertResult>;

vi.mock('@/lib/supabase/service', () => ({
  getSupabaseService: () => supabaseImpl,
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

beforeEach(() => {
  captured.inserts.length = 0;
  cookieSets.length = 0;
  redirectMock.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('anon /build SC insert path', () => {
  it('inserts a peek with curator_id null when middleware has minted cookie', async () => {
    supabaseImpl = makeFakeInsertResult({
      data: { id: 'peek-uuid-123' },
      error: null,
    });

    const { default: BuildLandingPage } = await import('@/app/build/page');

    // The SC calls `redirect()` on success, which throws NEXT_REDIRECT —
    // a normal Next.js control-flow throw, not a real error.
    await expect(BuildLandingPage()).rejects.toThrow('NEXT_REDIRECT');

    expect(captured.inserts).toHaveLength(1);
    const insert = captured.inserts[0]!;
    expect(insert.table).toBe('peeks');
    expect(insert.row['curator_id']).toBeNull();
    expect(insert.row['status']).toBe('draft');
    expect(insert.row['slug']).toBeTruthy();
    const meta = insert.row['metadata'] as Record<string, unknown>;
    expect(meta['anonymous_session_id']).toBe(ANON_COOKIE);

    expect(redirectMock).toHaveBeenCalledWith('/build/peek-uuid-123');

    // Cardinal rule: the SC must NEVER attempt a cookies.set() — that's what
    // caused the original 500. If this assertion fails, the regression returned.
    expect(cookieSets).toHaveLength(0);
  });

  it('throws a meaningful error if Supabase returns an error', async () => {
    supabaseImpl = makeFakeInsertResult({
      data: null,
      error: { message: 'simulated db failure', code: '42501' },
    });

    const { default: BuildLandingPage } = await import('@/app/build/page');

    await expect(BuildLandingPage()).rejects.toThrow(
      /Failed to create anonymous draft peek: simulated db failure/,
    );

    expect(redirectMock).not.toHaveBeenCalled();
  });
});
