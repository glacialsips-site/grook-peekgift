import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseService } from '@/lib/supabase/service';
import { PaymentElementForm } from '@/components/build/payment-element-form';

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
    ? `Publish ${peek.recipient_name}’s Peek`
    : 'Publish your Peek';
  const subhead = peek.occasion
    ? `One-time — for ${peek.occasion}. Share with as many people as you want.`
    : 'One-time. Share with as many people as you want.';

  return (
    <main
      id="main"
      className="min-h-[100dvh] bg-background px-4 py-10 sm:px-6"
      aria-label="Complete payment to publish your Peek"
    >
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <header className="flex flex-col gap-1.5 text-center">
          <h1 className="font-[var(--peek-font-heading)] text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {headline}
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">{subhead}</p>
        </header>
        <PaymentElementForm peekId={peekId} mode="payment" />
      </div>
    </main>
  );
}
