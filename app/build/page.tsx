import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { q, q1opt } from '@/lib/db';
import ChatBuilder from './ChatBuilder';

export const dynamic = 'force-dynamic';

export default async function BuildPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

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

  const existing = await q1opt<{ id: string }>(
    `SELECT id FROM peeks WHERE curator_id = $1 AND status = 'draft' ORDER BY updated_at DESC LIMIT 1`,
    [userId]
  );

  return <ChatBuilder initialPeekId={existing?.id || null} />;
}
