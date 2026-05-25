import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { q } from '@/lib/db';
import { SignedIn, UserButton } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const peeks = await q<{
    id: string; slug: string; status: string;
    recipient_name: string | null; occasion: string | null;
    hero_image_url: string | null; vibe: any;
    share_url: string | null; updated_at: string;
    card_count: number; pick_count: number; view_count: number;
  }>(
    `SELECT p.id, p.slug, p.status, p.recipient_name, p.occasion, p.hero_image_url, p.vibe, p.share_url, p.updated_at,
       (SELECT COUNT(*)::int FROM cards c WHERE c.peek_id = p.id) AS card_count,
       (SELECT COUNT(*)::int FROM picks pk WHERE pk.peek_id = p.id) AS pick_count,
       (SELECT COUNT(*)::int FROM recipient_views v WHERE v.peek_id = p.id) AS view_count
     FROM peeks p
     WHERE p.curator_id = $1 AND p.status != 'archived'
     ORDER BY p.updated_at DESC
     LIMIT 50`,
    [userId]
  );

  const draftCount = peeks.filter((p) => p.status === 'draft').length;
  const publishedCount = peeks.filter((p) => p.status === 'published').length;
  const claimedCount = peeks.filter((p) => p.status === 'claimed').length;

  return (
    <main className="min-h-dvh chrome-bg">
      <header className="px-5 py-4 flex items-center justify-between border-b chrome-line">
        <Link href="/" className="font-display text-xl">
          peek<span className="text-[var(--peek-accent)]">.</span>gift
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/build" className="rounded-full bg-[var(--peek-accent)] text-black px-4 py-2 text-sm font-medium">
            new peek
          </Link>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-8">
        <h1 className="font-display text-3xl">your peeks</h1>
        <div className="mt-2 text-sm text-[var(--chrome-mute)]">
          {peeks.length === 0
            ? "you haven't built one yet. start with the button above."
            : `${peeks.length} total · ${draftCount} draft · ${publishedCount} live · ${claimedCount} picked`}
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {peeks.map((p) => {
            const accent = p.vibe?.palette?.accent || '#ff5a3c';
            const ink = p.vibe?.palette?.ink || '#111';
            const bg = p.vibe?.palette?.bg || '#fafaf8';
            return (
              <Link
                key={p.id}
                href={p.status === 'draft' ? '/build' : `/g/${p.slug}`}
                className="group rounded-2xl overflow-hidden border chrome-line hover:-translate-y-0.5 transition"
                style={{ background: bg, color: ink }}
              >
                <div className="aspect-[16/10] relative card-grain">
                  {p.hero_image_url ? (
                    <img src={p.hero_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${accent}40, ${accent}10)` }} />
                  )}
                  <div className="absolute top-2 left-2 rounded-full text-[10px] uppercase tracking-wider px-2 py-1"
                    style={{
                      background: p.status === 'claimed' ? '#3a9d5d' : p.status === 'published' ? accent : '#999',
                      color: p.status === 'published' || p.status === 'claimed' ? '#000' : '#fff'
                    }}>
                    {p.status === 'draft' ? 'draft' : p.status === 'claimed' ? 'picked' : 'live'}
                  </div>
                </div>
                <div className="p-3">
                  <div className="text-[10px] uppercase tracking-wider opacity-50">{p.occasion || 'no occasion'}</div>
                  <div className="font-display text-lg leading-tight mt-0.5">
                    for {p.recipient_name || 'someone'}
                  </div>
                  <div className="mt-2 text-xs opacity-60 flex gap-3">
                    <span>{p.card_count} cards</span>
                    <span>·</span>
                    <span>{p.view_count} views</span>
                    {p.pick_count > 0 && (
                      <>
                        <span>·</span>
                        <span style={{ color: accent }}>{p.pick_count} picks</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
