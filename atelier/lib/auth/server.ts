import 'server-only';
import { randomUUID } from 'node:crypto';
import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { getSupabaseService } from '@/lib/supabase/service';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'lib/auth/server' });

export const ANON_SESSION_COOKIE = 'peek-anon-session';
const ANON_SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export async function getUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

export async function requireUserId(): Promise<string> {
  const userId = await getUserId();
  if (!userId) throw new Error('UNAUTHORIZED');
  return userId;
}

export async function getCurrentUser() {
  return currentUser();
}

export async function readAnonSessionId(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(ANON_SESSION_COOKIE)?.value;
  return value && value.length > 0 ? value : null;
}

/**
 * Ensures the anon session cookie exists, minting it if not.
 *
 * IMPORTANT: Next 16 forbids cookie WRITES inside Server Components. The /build*
 * routes rely on `proxy.ts` middleware to mint the cookie before the SC renders,
 * so SCs only call `readAnonSessionId`. This helper remains for Route Handlers
 * and Server Actions, which may still write cookies. If called from a context
 * where writes are forbidden, we swallow the write error and return the value
 * (the cookie won't persist beyond this request, but the caller still gets an id).
 */
export async function ensureAnonSessionId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(ANON_SESSION_COOKIE)?.value;
  if (existing && existing.length > 0) return existing;
  const fresh = randomUUID();
  try {
    jar.set({
      name: ANON_SESSION_COOKIE,
      value: fresh,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env['NODE_ENV'] === 'production',
      path: '/',
      maxAge: ANON_SESSION_MAX_AGE,
    });
  } catch (err) {
    log.warn('ensure_anon_session_set_failed', {
      err: err instanceof Error ? err.message : String(err),
    });
  }
  return fresh;
}

export async function ensureCuratorRow(clerkUserId: string): Promise<void> {
  let email: string | null = null;
  let displayName: string | null = null;
  let avatarUrl: string | null = null;

  try {
    const client = await clerkClient();
    const u = await client.users.getUser(clerkUserId);
    email =
      u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)
        ?.emailAddress ?? null;
    displayName = [u.firstName, u.lastName].filter(Boolean).join(' ') || null;
    avatarUrl = u.imageUrl ?? null;
  } catch (err) {
    log.warn('clerk_get_user_failed', {
      clerkUserId,
      err: err instanceof Error ? err.message : String(err),
    });
  }

  const sb = getSupabaseService();
  const { error } = await sb.from('users').upsert(
    {
      clerk_user_id: clerkUserId,
      email: email ?? `${clerkUserId}@unknown.peek.gift`,
      display_name: displayName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'clerk_user_id', ignoreDuplicates: true },
  );

  if (error) {
    log.warn('ensure_curator_row_upsert_failed', {
      clerkUserId,
      err: error.message,
    });
  }
}
