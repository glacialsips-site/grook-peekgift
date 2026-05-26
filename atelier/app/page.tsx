import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <h1 className="text-5xl font-semibold tracking-tight">peek.gift</h1>
      <p className="mt-4 text-muted-foreground">Make gift giving real again.</p>
      <div className="mt-10 flex flex-col items-center gap-3">
        <Link
          href="/build"
          className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-8 text-sm font-medium text-background transition hover:opacity-90"
        >
          Start a Peek
        </Link>
        <Link
          href="/sign-in"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
