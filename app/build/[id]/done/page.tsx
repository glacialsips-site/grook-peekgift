import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { q1opt } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Done({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const { id } = await params;
  const peek = await q1opt<{
    slug: string; status: string; recipient_name: string | null; share_url: string | null;
  }>(
    `SELECT slug, status, recipient_name, share_url FROM peeks WHERE id = $1 AND curator_id = $2`,
    [id, userId]
  );
  if (!peek) redirect('/build');

  const base = process.env.APP_URL || '';
  const url = peek.share_url || (peek.slug ? `${base}/g/${peek.slug}` : null);

  return (
    <main className="min-h-dvh chrome-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full text-white text-center">
        <div className="text-5xl mb-4">🎁</div>
        <div className="font-display text-3xl">it&apos;s live.</div>
        <div className="opacity-70 mt-1">
          share this with {peek.recipient_name || 'them'}. they pick — you ship the truth.
        </div>
        {url && <div className="mt-6 rounded-2xl bg-white/10 p-3 text-sm break-all">{url}</div>}
        <div className="mt-6 flex flex-col gap-2">
          {url && (
            <Link href={url} className="rounded-full bg-[var(--peek-accent)] text-black px-5 py-2.5 font-medium">
              open the peek
            </Link>
          )}
          <Link href="/dashboard" className="rounded-full border border-white/15 px-5 py-2.5 text-sm">
            my peeks
          </Link>
        </div>
      </div>
    </main>
  );
}
