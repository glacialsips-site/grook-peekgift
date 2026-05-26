import { createBrowserClient } from '@supabase/ssr';
import { envClient } from '@/lib/env-client';
import type { Database } from './types';

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowser() {
  if (_client) return _client;
  _client = createBrowserClient<Database>(
    envClient.NEXT_PUBLIC_SUPABASE_URL!,
    envClient.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  return _client;
}
