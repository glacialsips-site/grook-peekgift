import { auth as rawAuth, currentUser as rawCurrentUser } from '@clerk/nextjs/server';

export async function safeAuth(): Promise<{ userId: string | null }> {
  try {
    const a = await rawAuth();
    return { userId: a.userId };
  } catch (e: any) {
    console.error('[clerk-safe] auth threw:', e?.message || e);
    return { userId: null };
  }
}

export async function safeCurrentUser(): Promise<any | null> {
  try {
    return await rawCurrentUser();
  } catch (e: any) {
    console.error('[clerk-safe] currentUser threw:', e?.message || e);
    return null;
  }
}
