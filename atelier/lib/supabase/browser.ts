import { createBrowserClient } from '@supabase/ssr';
import { envClient } from '@/lib/env-client';
import type { Database } from './types';

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null;

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `[supabase/browser] Missing ${name} — set it in env (NEXT_PUBLIC_* vars must be present at build time).`,
    );
  }
  return value;
}

export function getSupabaseBrowser() {
  if (_client) return _client;
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL', envClient.NEXT_PUBLIC_SUPABASE_URL);
  const key = requireEnv(
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    envClient.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  _client = createBrowserClient<Database, 'peek_v2'>(url, key, {
    db: { schema: 'peek_v2' },
  });
  return _client;
}
