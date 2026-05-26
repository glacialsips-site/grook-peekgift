import 'server-only';
import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import { getSupabaseService } from '@/lib/supabase/service';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'lib/auth/server' });

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
