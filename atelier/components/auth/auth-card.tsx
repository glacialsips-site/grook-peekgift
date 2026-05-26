import type { ReactNode } from 'react';

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-[360px]">
        <header className="mb-8 text-center">
          <p className="text-2xl font-semibold tracking-tight">peek.gift</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Make gift giving real again.
          </p>
        </header>
        <section className="space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {children}
        </section>
        {footer ? (
          <footer className="mt-8 text-center text-sm text-muted-foreground">
            {footer}
          </footer>
        ) : null}
      </div>
    </main>
  );
}
