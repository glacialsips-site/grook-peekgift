import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { env } from '@/lib/env';
import type { Database } from './types';

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`[supabase/server] Missing ${name} — set it in env.`);
  }
  return value;
}

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  const { getToken } = await auth();
  const token = await getToken({ template: 'supabase' }).catch(() => null);

  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL', env.NEXT_PUBLIC_SUPABASE_URL);
  const key = requireEnv(
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
        }
      },
    },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
}
