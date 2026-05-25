import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { env } from '@/lib/env';
import type { Database } from './types';

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  const { getToken } = await auth();
  const token = await getToken({ template: 'supabase' }).catch(() => null);

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
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
            // server-component context — cookies are read-only here
          }
        },
      },
      global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    },
  );
}
