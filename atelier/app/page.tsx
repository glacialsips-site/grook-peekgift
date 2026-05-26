import Link from 'next/link';

export default function Home() {
  return (
    <main
      id="main"
      className="flex min-h-[100dvh] flex-col items-center justify-center p-8 text-center"
    >
      <h1 className="text-5xl font-semibold tracking-tight">peek.gift</h1>
      <p className="mt-4 text-base text-muted-foreground">
        Make gift giving real again.
      </p>
      <div className="mt-10 flex flex-col items-center gap-3">
        <Link
          href="/build"
          className="inline-flex h-12 min-h-11 items-center justify-center rounded-full bg-foreground px-8 text-base font-medium text-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Start a Peek
        </Link>
        <Link
          href="/sign-in"
          className="inline-flex min-h-11 items-center px-2 text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
