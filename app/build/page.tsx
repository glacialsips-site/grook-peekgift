import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { q, q1opt } from '@/lib/db';
import ChatBuilder from './ChatBuilder';

export const dynamic = 'force-dynamic';

export default async function BuildPage({
  searchParams
}: {
  searchParams: Promise<{ peek_id?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const sp = await searchParams;

  const user = await currentUser();

  await q(
    `INSERT INTO curators (clerk_user_id, email, display_name)
     VALUES ($1,$2,$3)
     ON CONFLICT (clerk_user_id) DO UPDATE SET email = EXCLUDED.email, display_name = EXCLUDED.display_name`,
    [
      userId,
      user?.emailAddresses?.[0]?.emailAddress || null,
      user?.firstName || user?.username || null
    ]
  );

  // Prefer explicit peek_id from query (e.g. arriving from a co-curator invite)
  let initialPeekId: string | null = null;
  if (sp.peek_id) {
    // Allow if user is curator OR co-curator on this peek
    const access = await q1opt<{ id: string }>(
      `SELECT p.id FROM peeks p
       LEFT JOIN contributors c ON c.peek_id = p.id AND c.clerk_user_id = $1
       WHERE p.id = $2 AND (p.curator_id = $1 OR c.id IS NOT NULL)`,
      [userId, sp.peek_id]
    );
    if (access) initialPeekId = access.id;
  }
  if (!initialPeekId) {
    const existing = await q1opt<{ id: string }>(
      `SELECT id FROM peeks WHERE curator_id = $1 AND status = 'draft' ORDER BY updated_at DESC LIMIT 1`,
      [userId]
    );
    initialPeekId = existing?.id || null;
  }

  return <ChatBuilder initialPeekId={initialPeekId} />;
}
