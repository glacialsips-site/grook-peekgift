import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';

export default function Landing() {
  return (
    <main className="min-h-dvh chrome-bg flex flex-col">
      <header className="px-5 py-4 flex items-center justify-between">
        <div className="font-display text-2xl tracking-tight">peek<span className="text-[var(--peek-accent)]">.</span>gift</div>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </header>

      <section className="flex-1 px-5 pt-8 pb-20 max-w-2xl mx-auto w-full">
        <h1 className="font-display text-[44px] leading-[1.05] tracking-tight sm:text-6xl">
          Make a gift
          <br />
          <span className="italic text-[var(--peek-accent)]">they actually want.</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-[var(--chrome-mute)] max-w-md">
          Don&apos;t guess. Build a page in 2 minutes &mdash; a few cards they pick from, with your own
          rules, jokes, and the one thing they&apos;d never let you buy them.
        </p>

        <div className="mt-10">
          <SignedOut>
            <SignInButton mode="modal" forceRedirectUrl="/build">
              <button className="rounded-full bg-[var(--peek-accent)] text-black px-7 py-3 text-base font-medium hover:opacity-90 transition">
                Start a peek &rarr;
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/build"
              className="inline-block rounded-full bg-[var(--peek-accent)] text-black px-7 py-3 text-base font-medium hover:opacity-90 transition"
            >
              Start a peek &rarr;
            </Link>
          </SignedIn>
          <p className="mt-3 text-xs text-[var(--chrome-mute)]">$12 to publish. No subscriptions.</p>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { t: 'You curate', d: 'Real items, things to do together, even jokes — your call.' },
            { t: 'They pick', d: 'Variants get resolved (which color?). The wrong gift goes away.' },
            { t: 'You ship the truth', d: 'You get an email with exactly what they picked.' }
          ].map((b) => (
            <div key={b.t} className="rounded-2xl border chrome-line p-5">
              <div className="font-display text-xl">{b.t}</div>
              <div className="mt-2 text-sm text-[var(--chrome-mute)]">{b.d}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-5 py-6 text-xs text-[var(--chrome-mute)]">peek.gift &middot; vNext</footer>
    </main>
  );
}
