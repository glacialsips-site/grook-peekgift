import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function FinalCta() {
  return (
    <section
      id="start"
      className="relative scroll-mt-12 overflow-hidden px-6 py-24 sm:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-1/2 h-[50vmax] w-[50vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--peek-accent2)/0.16),transparent_60%)] blur-3xl" />
      </div>

      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <h2 className="max-w-[20ch] text-balance font-[family-name:var(--font-display)] text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
          Try it free. Pay{' '}
          <span className="bg-gradient-to-br from-[hsl(var(--peek-accent))] to-[hsl(var(--peek-accent2))] bg-clip-text text-transparent">
            $12
          </span>{' '}
          when you publish.
        </h2>

        <p className="mt-6 max-w-[44ch] text-pretty text-lg text-muted-foreground sm:text-xl">
          Build the page. See it taking shape. Send the link when it&apos;s
          right.
        </p>

        <Link
          href="/build"
          className="group mt-10 inline-flex h-14 min-h-11 items-center justify-center gap-2 rounded-full bg-foreground px-10 text-lg font-medium text-background shadow-lg shadow-foreground/10 transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Make one
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>

        <p className="mt-6 text-sm text-muted-foreground">
          <Link
            href="/sign-in"
            className="inline-block min-h-11 py-2.5 underline-offset-4 hover:text-foreground hover:underline"
          >
            Already have an account? Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
