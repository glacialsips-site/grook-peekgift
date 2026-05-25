import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import ChatBuilder from './ChatBuilder';

export const dynamic = 'force-dynamic';

export default async function BuildPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await currentUser();
  const db = supabaseAdmin();

  // Ensure curator row (with email/name for later notifications)
  await db
    .from('curators')
    .upsert({
      clerk_user_id: userId,
      email: user?.emailAddresses?.[0]?.emailAddress || null,
      display_name: user?.firstName || user?.username || null
    });

  // Pick an existing in-progress peek, otherwise start fresh on first message
  const { data: existing } = await db
    .from('peeks')
    .select('id')
    .eq('curator_id', userId)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return <ChatBuilder initialPeekId={existing?.id || null} />;
}
