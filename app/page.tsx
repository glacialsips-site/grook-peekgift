import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';

export default function Landing() {
  return (
    <main className="min-h-dvh chrome-bg flex flex-col">
      <header className="px-5 py-4 flex items-center justify-between">
        <div className="font-display text-2xl tracking-tight">
          peek<span className="text-[var(--peek-accent)]">.</span>gift
        </div>
        <div className="flex items-center gap-3">
          <SignedIn>
            <Link href="/dashboard" className="text-sm text-[var(--chrome-mute)] hover:text-white">
              my peeks
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal" forceRedirectUrl="/build">
              <button className="text-sm text-[var(--chrome-mute)] hover:text-white">sign in</button>
            </SignInButton>
          </SignedOut>
        </div>
      </header>

      <section className="flex-1 px-5 pt-10 pb-20 max-w-3xl mx-auto w-full">
        <div className="text-[11px] uppercase tracking-[0.32em] text-[var(--chrome-mute)] mb-4">
          a gift, reimagined
        </div>
        <h1 className="font-display text-[44px] leading-[1.02] tracking-tight sm:text-[72px]">
          stop guessing.
          <br />
          <span className="italic text-[var(--peek-accent)]">make them peek.</span>
        </h1>

        <p className="mt-6 text-base sm:text-xl text-[var(--chrome-mute)] max-w-xl leading-relaxed">
          two minutes of texting builds a custom gift page for one person —
          things you found, things you'll do together, jokes, the one item they'd
          never let you buy. they pick. you ship the truth.
        </p>

        <div className="mt-10 flex flex-wrap gap-3 items-center">
          <SignedOut>
            <SignInButton mode="modal" forceRedirectUrl="/build">
              <button className="rounded-full bg-[var(--peek-accent)] text-black px-7 py-3.5 text-base font-medium hover:opacity-90 transition">
                start a peek &rarr;
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/build"
              className="rounded-full bg-[var(--peek-accent)] text-black px-7 py-3.5 text-base font-medium hover:opacity-90 transition"
            >
              start a peek &rarr;
            </Link>
          </SignedIn>
          <span className="text-xs text-[var(--chrome-mute)]">$12 once. no subs. no ads.</span>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { n: '01', t: 'you text peek', d: 'tell us who & what. we build the page as you talk. no forms.' },
            { n: '02', t: 'they get a link', d: 'a custom unwrap moment — note, vibe, cards. nothing screams amazon.' },
            { n: '03', t: 'you ship the truth', d: 'no more "thanks i love it" smiles for stuff that misses.' }
          ].map((b) => (
            <div key={b.t} className="rounded-2xl border chrome-line p-5">
              <div className="text-[var(--peek-accent)] font-display text-2xl">{b.n}</div>
              <div className="font-display text-xl mt-3">{b.t}</div>
              <div className="mt-2 text-sm text-[var(--chrome-mute)] leading-relaxed">{b.d}</div>
            </div>
          ))}
        </div>

        <div className="mt-20 rounded-2xl border chrome-line p-6 sm:p-8">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--chrome-mute)] mb-3">
            what you can put on a peek
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {[
              ['real stuff', 'the t-shirt — in 4 colors, pick one'],
              ['together', '"dinner at the place"'],
              ['the bit', 'a ferrari, marked off-limits'],
              ['the rule', '"beg in DM to unlock"']
            ].map(([h, d]) => (
              <div key={h} className="rounded-xl bg-white/5 p-3">
                <div className="text-[var(--peek-accent)] uppercase tracking-wider text-[10px]">{h}</div>
                <div className="mt-1.5 text-white/90">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-5 py-6 text-xs text-[var(--chrome-mute)] flex items-center justify-between border-t chrome-line">
        <div>peek.gift</div>
        <div className="opacity-60">made for people who care.</div>
      </footer>
    </main>
  );
}
