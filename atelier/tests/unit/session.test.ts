import { beforeEach, describe, expect, it, vi } from 'vitest';

type CannedRow = Record<string, unknown> | null;

interface CannedResult {
  data?: CannedRow;
  error?: { message: string } | null;
  count?: number;
}

interface SelectScope {
  results: CannedResult[];
  inserts: Array<{ table: string; row: unknown }>;
}

function makeFakeSupabase(scope: SelectScope) {
  let nextResultIdx = 0;
  function popResult(): CannedResult {
    const r = scope.results[nextResultIdx] ?? { data: null, error: null };
    nextResultIdx += 1;
    return r;
  }
  return {
    from(table: string) {
      return {
        select(_columns?: string, _opts?: { count?: string; head?: boolean }) {
          return {
            eq(_col: string, _val: unknown) {
              return {
                eq(_col2: string, _val2: unknown) {
                  return {
                    is: (_col3: string, _val3: unknown) => {
                      const r = popResult();
                      return Promise.resolve({
                        data: r.data ?? null,
                        error: r.error ?? null,
                        count: r.count ?? null,
                      });
                    },
                  };
                },
                maybeSingle: () => {
                  const r = popResult();
                  return Promise.resolve({
                    data: r.data ?? null,
                    error: r.error ?? null,
                  });
                },
                is: (_col2: string, _val2: unknown) => {
                  const r = popResult();
                  return Promise.resolve({
                    data: r.data ?? null,
                    error: r.error ?? null,
                    count: r.count ?? null,
                  });
                },
              };
            },
          };
        },
        insert(row: unknown) {
          scope.inserts.push({ table, row });
          const r = popResult();
          return Promise.resolve({
            data: r.data ?? null,
            error: r.error ?? null,
          });
        },
      };
    },
  };
}

const scope: SelectScope = { results: [], inserts: [] };

vi.mock('@/lib/supabase/service', () => ({
  getSupabaseService: () => makeFakeSupabase(scope),
}));

beforeEach(() => {
  scope.results.length = 0;
  scope.inserts.length = 0;
});

describe('assertPeekAccess', () => {
  it('returns not_found when DB query errors', async () => {
    scope.results.push({ error: { message: 'boom' } });
    const { assertPeekAccess } = await import('@/lib/chat/session');
    const result = await assertPeekAccess({
      peekId: 'peek-1',
      userId: null,
      sessionId: 's1',
    });
    expect(result).toEqual({ ok: false, reason: 'not_found' });
  });

  it('returns not_found when peek does not exist', async () => {
    scope.results.push({ data: null });
    const { assertPeekAccess } = await import('@/lib/chat/session');
    const result = await assertPeekAccess({
      peekId: 'peek-x',
      userId: null,
      sessionId: 's1',
    });
    expect(result).toEqual({ ok: false, reason: 'not_found' });
  });

  it('returns ok when userId matches curator_id', async () => {
    scope.results.push({
      data: { curator_id: 'user-1', metadata: {} },
    });
    const { assertPeekAccess } = await import('@/lib/chat/session');
    const result = await assertPeekAccess({
      peekId: 'peek-1',
      userId: 'user-1',
      sessionId: 's1',
    });
    expect(result).toEqual({ ok: true });
  });

  it('returns forbidden when userId mismatches curator', async () => {
    scope.results.push({
      data: { curator_id: 'user-1', metadata: {} },
    });
    const { assertPeekAccess } = await import('@/lib/chat/session');
    const result = await assertPeekAccess({
      peekId: 'peek-1',
      userId: 'user-2',
      sessionId: 's1',
    });
    expect(result).toEqual({ ok: false, reason: 'forbidden' });
  });

  it('returns forbidden for anon when curator_id is set', async () => {
    scope.results.push({
      data: { curator_id: 'user-1', metadata: {} },
    });
    const { assertPeekAccess } = await import('@/lib/chat/session');
    const result = await assertPeekAccess({
      peekId: 'peek-1',
      userId: null,
      sessionId: 's1',
    });
    expect(result).toEqual({ ok: false, reason: 'forbidden' });
  });

  it('returns ok for anon when anonymous_session_id matches', async () => {
    scope.results.push({
      data: {
        curator_id: null,
        metadata: { anonymous_session_id: 's1' },
      },
    });
    const { assertPeekAccess } = await import('@/lib/chat/session');
    const result = await assertPeekAccess({
      peekId: 'peek-1',
      userId: null,
      sessionId: 's1',
    });
    expect(result).toEqual({ ok: true });
  });

  it('returns forbidden for anon when sessionId does not match', async () => {
    scope.results.push({
      data: {
        curator_id: null,
        metadata: { anonymous_session_id: 's-other' },
      },
    });
    const { assertPeekAccess } = await import('@/lib/chat/session');
    const result = await assertPeekAccess({
      peekId: 'peek-1',
      userId: null,
      sessionId: 's1',
    });
    expect(result).toEqual({ ok: false, reason: 'forbidden' });
  });
});

describe('anonymousTurnCount', () => {
  it('returns count from supabase', async () => {
    scope.results.push({ count: 3 });
    const { anonymousTurnCount } = await import('@/lib/chat/session');
    const count = await anonymousTurnCount('s1');
    expect(count).toBe(3);
  });

  it('returns 0 on error', async () => {
    scope.results.push({ error: { message: 'fail' } });
    const { anonymousTurnCount } = await import('@/lib/chat/session');
    const count = await anonymousTurnCount('s1');
    expect(count).toBe(0);
  });

  it('returns 0 when count is null', async () => {
    scope.results.push({ count: undefined });
    const { anonymousTurnCount } = await import('@/lib/chat/session');
    const count = await anonymousTurnCount('s1');
    expect(count).toBe(0);
  });
});

describe('anonymousTurnExceeded', () => {
  it('is false below the cap', async () => {
    const { anonymousTurnExceeded, ANON_TURN_CAP } = await import(
      '@/lib/chat/session'
    );
    expect(anonymousTurnExceeded(ANON_TURN_CAP - 1)).toBe(false);
  });

  it('is true at the cap', async () => {
    const { anonymousTurnExceeded, ANON_TURN_CAP } = await import(
      '@/lib/chat/session'
    );
    expect(anonymousTurnExceeded(ANON_TURN_CAP)).toBe(true);
  });

  it('is true above the cap', async () => {
    const { anonymousTurnExceeded, ANON_TURN_CAP } = await import(
      '@/lib/chat/session'
    );
    expect(anonymousTurnExceeded(ANON_TURN_CAP + 1)).toBe(true);
  });
});

describe('recordEvent', () => {
  it('inserts into events table without throwing on success', async () => {
    scope.results.push({ error: null });
    const { recordEvent } = await import('@/lib/chat/session');
    await expect(
      recordEvent({
        peekId: 'p1',
        userId: null,
        sessionId: 's1',
        kind: 'chat_turn',
        payload: { foo: 'bar' },
      }),
    ).resolves.toBeUndefined();
    expect(scope.inserts).toHaveLength(1);
    expect(scope.inserts[0]?.table).toBe('events');
  });

  it('does not throw when insert errors', async () => {
    scope.results.push({ error: { message: 'db down' } });
    const { recordEvent } = await import('@/lib/chat/session');
    await expect(
      recordEvent({
        peekId: 'p1',
        userId: 'u1',
        sessionId: 's1',
        kind: 'card_added',
      }),
    ).resolves.toBeUndefined();
  });
});
