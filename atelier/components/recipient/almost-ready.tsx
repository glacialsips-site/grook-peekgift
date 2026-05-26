import type { Peek } from '@/lib/peek/types';

export function AlmostReady({ peek }: { peek: Peek }) {
  const name = peek.recipientName ?? 'you';
  return (
    <main
      id="main"
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-br from-background to-muted px-6 text-center"
      aria-busy="true"
      aria-label={`Peek for ${name} is being prepared`}
    >
      <div className="max-w-md space-y-4">
        <div
          aria-hidden="true"
          className="mx-auto h-12 w-12 animate-pulse rounded-full bg-primary/20"
        />
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Something is being made for {name}.
        </h1>
        <p className="text-base text-muted-foreground">
          Check back soon — this peek is almost ready.
        </p>
      </div>
    </main>
  );
}
