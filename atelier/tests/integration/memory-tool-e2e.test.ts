// Full end-to-end Memory tool flow against an in-memory Supabase mock that
// mirrors the exact query patterns the production code (dispatchMemoryCommand
// + chat/route.ts curator_memory loader) emits.
//
// Six scenarios per the packet:
//   1. View namespace directory (with trailing slash) → empty listing.
//   2. Create profile.md → row lands in curator_memory.
//   3. Re-view profile.md → content round-trips.
//   4. New session, same clerk_user_id: load curator memory the same way
//      chat/route.ts does; verify the profile.md content shows up.
//   5. Cross-user namespace probe rejected with outside_namespace.
//   6. URL-encoded traversal rejected with encoded_traversal.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const TEST_USER = 'test_user_memory_e2e';
const OTHER_USER = 'test_user_memory_other';

type MemoryRow = {
  clerk_user_id: string;
  path: string;
  content: string;
  size_bytes: number;
  updated_at: string;
  created_at: string;
};

const store = new Map<string, MemoryRow>();

function rowKey(userId: string, path: string): string {
  return `${userId}::${path}`;
}

function buildFakeQuery(table: string) {
  if (table !== 'curator_memory') {
    throw new Error(`unexpected table: ${table}`);
  }

  type Filter =
    | { kind: 'eq'; col: string; val: unknown }
    | { kind: 'like'; col: string; pattern: string };
  const filters: Filter[] = [];
  let orderCol: string | null = null;
  let orderAsc = true;
  let limitN: number | null = null;
  let selectCount: 'exact' | null = null;
  let isHead = false;
  let isDelete = false;
  let deleteCount: 'exact' | null = null;
  let updatePatch: Record<string, unknown> | null = null;

  function pathMatches(row: MemoryRow): boolean {
    for (const f of filters) {
      if (f.kind === 'eq') {
        const v = (row as unknown as Record<string, unknown>)[f.col];
        if (v !== f.val) return false;
      } else {
        const v = String(
          (row as unknown as Record<string, unknown>)[f.col] ?? '',
        );
        const pattern = f.pattern;
        if (pattern.endsWith('%')) {
          const prefix = pattern.slice(0, -1);
          if (!v.startsWith(prefix)) return false;
        } else if (!v.includes(pattern.replace(/%/g, ''))) {
          return false;
        }
      }
    }
    return true;
  }

  function collect(): MemoryRow[] {
    const matches: MemoryRow[] = [];
    for (const row of store.values()) {
      if (pathMatches(row)) matches.push(row);
    }
    if (orderCol) {
      matches.sort((a, b) => {
        const av = (a as unknown as Record<string, unknown>)[orderCol!];
        const bv = (b as unknown as Record<string, unknown>)[orderCol!];
        const cmp = String(av).localeCompare(String(bv));
        return orderAsc ? cmp : -cmp;
      });
    }
    if (limitN !== null) return matches.slice(0, limitN);
    return matches;
  }

  async function executeRead(): Promise<{
    data: unknown;
    error: null;
    count?: number;
  }> {
    const matches = collect();
    if (selectCount === 'exact') {
      if (isHead) return { data: null, error: null, count: matches.length };
      return { data: matches, error: null, count: matches.length };
    }
    return { data: matches, error: null };
  }

  async function executeDelete(): Promise<{
    data: null;
    error: null;
    count?: number;
  }> {
    const matches = collect();
    for (const m of matches) store.delete(rowKey(m.clerk_user_id, m.path));
    if (deleteCount === 'exact') {
      return { data: null, error: null, count: matches.length };
    }
    return { data: null, error: null };
  }

  async function executeUpdate(): Promise<{ data: null; error: null }> {
    if (!updatePatch) return { data: null, error: null };
    const matches = collect();
    for (const m of matches) {
      const updated: MemoryRow = { ...m };
      for (const [k, v] of Object.entries(updatePatch)) {
        (updated as unknown as Record<string, unknown>)[k] = v;
      }
      store.set(rowKey(updated.clerk_user_id, updated.path), updated);
    }
    return { data: null, error: null };
  }

  const builder = {
    select(_cols?: string, opts?: { count?: 'exact'; head?: boolean }) {
      if (opts?.count === 'exact') selectCount = 'exact';
      if (opts?.head) isHead = true;
      return builder;
    },
    eq(col: string, val: unknown) {
      filters.push({ kind: 'eq', col, val });
      return builder;
    },
    like(col: string, pattern: string) {
      filters.push({ kind: 'like', col, pattern });
      return builder;
    },
    order(col: string, opts?: { ascending?: boolean }) {
      orderCol = col;
      orderAsc = opts?.ascending !== false;
      return builder;
    },
    limit(n: number) {
      limitN = n;
      return builder;
    },
    maybeSingle: async () => {
      const matches = collect();
      if (matches.length === 0) return { data: null, error: null };
      const m = matches[0] ?? null;
      return { data: m, error: null };
    },
    then<TResult1, TResult2>(
      onFulfilled?:
        | ((value: { data: unknown; error: null; count?: number }) =>
            | TResult1
            | PromiseLike<TResult1>)
        | null,
      onRejected?:
        | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
        | null,
    ): Promise<TResult1 | TResult2> {
      const promise = isDelete
        ? executeDelete()
        : updatePatch
          ? executeUpdate()
          : executeRead();
      return promise.then(onFulfilled, onRejected) as Promise<
        TResult1 | TResult2
      >;
    },
    async upsert(row: Partial<MemoryRow>) {
      if (!row.clerk_user_id || !row.path) {
        return { data: null, error: new Error('missing key') };
      }
      const nowIso = new Date().toISOString();
      const existing = store.get(rowKey(row.clerk_user_id, row.path));
      const merged: MemoryRow = {
        clerk_user_id: row.clerk_user_id,
        path: row.path,
        content: row.content ?? existing?.content ?? '',
        size_bytes: row.size_bytes ?? existing?.size_bytes ?? 0,
        updated_at: row.updated_at ?? existing?.updated_at ?? nowIso,
        created_at: existing?.created_at ?? nowIso,
      };
      store.set(rowKey(merged.clerk_user_id, merged.path), merged);
      return { data: null, error: null };
    },
    update(patch: Record<string, unknown>) {
      updatePatch = patch;
      return builder;
    },
    delete(opts?: { count?: 'exact' }) {
      isDelete = true;
      if (opts?.count === 'exact') deleteCount = 'exact';
      return builder;
    },
  };

  return builder;
}

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/service', () => ({
  getSupabaseService: () => ({
    from: (table: string) => buildFakeQuery(table),
  }),
}));
vi.mock('@/lib/env', () => ({
  env: {
    APP_URL: 'http://localhost:3000',
    NODE_ENV: 'test',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    MEMORY_MAX_FILES_PER_CURATOR: 100,
    MEMORY_MAX_FILE_KB: 50,
  },
}));

import { dispatchMemoryCommand } from '@/lib/anthropic/memory/store';

async function loadCuratorMemoryAsChatRouteWould(
  userId: string,
): Promise<string | null> {
  const { getSupabaseService } = await import('@/lib/supabase/service');
  const sb = getSupabaseService();
  const { data: rows } = (await sb
    .from('curator_memory')
    .select('path, content')
    .eq('clerk_user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(50)) as {
    data: Array<{ path: string; content: string }> | null;
  };
  if (!rows || rows.length === 0) return null;
  const profilePath = `/memories/${userId}/profile.md`;
  const kvPrefix = `/memories/${userId}/kv/`;
  const profile = rows.find((r) => r.path === profilePath);
  const kv = rows.filter((r) => r.path.startsWith(kvPrefix));
  const parts: string[] = [];
  if (profile?.content) parts.push(`Curator profile:\n${profile.content}`);
  if (kv.length > 0) {
    const nowMs = Date.now();
    const kvPairs = kv
      .map((r) => {
        try {
          const parsed = JSON.parse(r.content ?? '') as {
            value: unknown;
            expires_at?: string | null;
          };
          if (parsed.expires_at) {
            const expMs = Date.parse(parsed.expires_at);
            if (Number.isFinite(expMs) && expMs <= nowMs) return null;
          }
          const key = r.path.replace(kvPrefix, '').replace(/\.json$/, '');
          return `- ${key}: ${JSON.stringify(parsed.value)}`;
        } catch {
          return null;
        }
      })
      .filter((s): s is string => s !== null);
    if (kvPairs.length > 0) parts.push(`Curator facts:\n${kvPairs.join('\n')}`);
  }
  return parts.length > 0 ? parts.join('\n\n') : null;
}

describe('Memory tool E2E (6 scenarios)', () => {
  beforeEach(() => {
    for (const key of Array.from(store.keys())) {
      if (key.startsWith(TEST_USER + '::') || key.startsWith(OTHER_USER + '::')) {
        store.delete(key);
      }
    }
  });

  it('1. view /memories/<user>/ on a fresh namespace returns empty', async () => {
    const out = await dispatchMemoryCommand(
      { clerkUserId: TEST_USER },
      { command: 'view', path: `/memories/${TEST_USER}/` },
    );
    expect(out).toContain(`Directory contents of /memories/${TEST_USER}/`);
    expect(out).toContain('(empty)');
  });

  it('2. create /memories/<user>/profile.md persists a row in curator_memory', async () => {
    const profileText =
      'Curator prefers playful tone. Recipient: Mira (sister). Birthday on 2026-07-12.';
    const out = await dispatchMemoryCommand(
      { clerkUserId: TEST_USER },
      {
        command: 'create',
        path: `/memories/${TEST_USER}/profile.md`,
        file_text: profileText,
      },
    );
    expect(out).toBe(`File created successfully at: /memories/${TEST_USER}/profile.md`);

    const row = store.get(rowKey(TEST_USER, `/memories/${TEST_USER}/profile.md`));
    expect(row).toBeDefined();
    expect(row?.content).toBe(profileText);
    expect(row?.size_bytes).toBe(Buffer.byteLength(profileText, 'utf8'));
  });

  it('3. same session: view profile.md round-trips the content with line numbers', async () => {
    const profileText = 'Line one.\nLine two.';
    await dispatchMemoryCommand(
      { clerkUserId: TEST_USER },
      {
        command: 'create',
        path: `/memories/${TEST_USER}/profile.md`,
        file_text: profileText,
      },
    );
    const out = await dispatchMemoryCommand(
      { clerkUserId: TEST_USER },
      { command: 'view', path: `/memories/${TEST_USER}/profile.md` },
    );
    expect(out).toContain('Line one.');
    expect(out).toContain('Line two.');
    expect(out).toMatch(/\s+1\tLine one\./);
    expect(out).toMatch(/\s+2\tLine two\./);
  });

  it('4. second curator session: chat route memory loader surfaces profile.md content', async () => {
    const profileText =
      'Recipient: Mira, sister. Voice: playful, lightly sarcastic. Avoid: religious themes.';
    await dispatchMemoryCommand(
      { clerkUserId: TEST_USER },
      {
        command: 'create',
        path: `/memories/${TEST_USER}/profile.md`,
        file_text: profileText,
      },
    );

    const curatorMemory = await loadCuratorMemoryAsChatRouteWould(TEST_USER);
    expect(curatorMemory).not.toBeNull();
    expect(curatorMemory).toContain('Curator profile:');
    expect(curatorMemory).toContain(profileText);
  });

  it('5. cross-user namespace probe → rejected with outside_namespace', async () => {
    await expect(
      dispatchMemoryCommand(
        { clerkUserId: TEST_USER },
        { command: 'view', path: `/memories/${OTHER_USER}/` },
      ),
    ).rejects.toThrow(/outside_namespace/);

    const leaked = Array.from(store.values()).filter(
      (r) => r.clerk_user_id === OTHER_USER,
    );
    expect(leaked.length).toBe(0);
  });

  it('6. URL-encoded traversal (%2e%2e%2f) → rejected with encoded_traversal', async () => {
    await expect(
      dispatchMemoryCommand(
        { clerkUserId: TEST_USER },
        {
          command: 'view',
          path: `/memories/${TEST_USER}/%2e%2e%2fother`,
        },
      ),
    ).rejects.toThrow(/encoded_traversal/);
  });
});
