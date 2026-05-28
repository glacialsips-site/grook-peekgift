import Link from 'next/link';
import { ScrollToButton } from './scroll-to-button';

export function Hero() {
  return (
    <section
      id="hero"
      className="relative isolate flex min-h-[88dvh] flex-col items-center justify-center px-6 pb-16 pt-24 text-center sm:min-h-[80dvh] sm:pt-28"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-1/2 top-1/3 h-[60vmax] w-[60vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--peek-accent2)/0.18),transparent_60%)] blur-3xl" />
        <div className="absolute right-[-10vmax] top-[-10vmax] h-[40vmax] w-[40vmax] rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--peek-accent)/0.14),transparent_65%)] blur-3xl" />
      </div>

      <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--peek-accent))]" />
        peek.gift
      </p>

      <h1 className="max-w-[18ch] text-balance font-[family-name:var(--font-display)] text-5xl font-medium leading-[1.02] tracking-tight sm:text-6xl md:text-7xl">
        Gift giving,{' '}
        <span className="relative inline-block">
          <span className="bg-gradient-to-br from-[hsl(var(--peek-accent))] to-[hsl(var(--peek-accent2))] bg-clip-text text-transparent">
            made real.
          </span>
        </span>
      </h1>

      <p className="mt-6 max-w-[36ch] text-pretty text-lg leading-relaxed text-muted-foreground sm:max-w-[44ch] sm:text-xl">
        You build a page for someone you love. They pick. No more guessing, no
        more gift-card cop-outs, no more Amazon boxes that miss.
      </p>

      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
        <Link
          href="/build"
          className="inline-flex h-14 min-h-11 items-center justify-center rounded-full bg-foreground px-10 text-lg font-medium text-background shadow-lg shadow-foreground/10 transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Make one
        </Link>
        <ScrollToButton
          targetId="how-it-works"
          withChevron
          className="text-base"
        >
          How it works
        </ScrollToButton>
      </div>

      <p className="mt-10 text-sm text-muted-foreground/80">
        Free to build. <span className="text-foreground/80">$12 to publish</span>{' '}
        and send the link.
      </p>
    </section>
  );
}
