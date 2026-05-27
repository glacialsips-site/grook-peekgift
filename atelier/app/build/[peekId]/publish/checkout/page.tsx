import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseService } from '@/lib/supabase/service';
import { EmbeddedCheckoutPanel } from '@/components/build/embedded-checkout';

export const dynamic = 'force-dynamic';

export default async function PublishCheckoutPage({
  params,
}: {
  params: Promise<{ peekId: string }>;
}) {
  const { peekId } = await params;
  const { userId } = await auth();
  if (!userId) {
    redirect(`/sign-in?returnTo=/build/${peekId}/publish/checkout`);
  }

  const sb = getSupabaseService();
  const { data: peek, error } = await sb
    .from('peeks')
    .select('id, slug, curator_id, recipient_name, occasion, status')
    .eq('id', peekId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load peek: ${error.message}`);
  }
  if (!peek) notFound();
  if (peek.curator_id !== userId) notFound();
  if (peek.status === 'published' || peek.status === 'claimed') {
    redirect(`/build/${peekId}/publish/share`);
  }

  const headline = peek.recipient_name
    ? `Send ${peek.recipient_name}'s Peek`
    : 'Send your Peek';
  const subhead = peek.occasion
    ? `One-time $12 — for ${peek.occasion}.`
    : 'One-time $12 to publish the link.';

  return (
    <main
      id="main"
      className="min-h-[100dvh] bg-background px-4 py-10 sm:px-6"
      aria-label="Complete payment to publish your Peek"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{headline}</h1>
          <p className="text-sm text-muted-foreground">{subhead}</p>
        </header>
        <EmbeddedCheckoutPanel peekId={peekId} />
      </div>
    </main>
  );
}
