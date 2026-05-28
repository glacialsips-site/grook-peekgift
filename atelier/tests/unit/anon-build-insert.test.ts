import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface CapturedInsert {
  table: string;
  row: Record<string, unknown>;
}

const captured: { inserts: CapturedInsert[] } = { inserts: [] };

const ANON_COOKIE = 'middleware-minted-session-uuid';

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
