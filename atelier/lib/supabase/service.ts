import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Database } from './types';

let _client: SupabaseClient<Database> | null = null;

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`[supabase/service] Missing ${name} — set it in env.`);
  }
  return value;
}

export function getSupabaseService(): SupabaseClient<Database> {
  if (_client) return _client;
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL', env.NEXT_PUBLIC_SUPABASE_URL);
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY', env.SUPABASE_SERVICE_ROLE_KEY);
  _client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'peek_v2' },
  });
  return _client;
}
