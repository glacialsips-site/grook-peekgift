import 'server-only';
import { auth, currentUser } from '@clerk/nextjs/server';

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
