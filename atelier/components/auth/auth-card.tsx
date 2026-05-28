import type { ReactNode } from 'react';
import {
  headingStyle,
  mutedTextStyle,
  shellStyle,
} from '@/lib/vibe/component-styles';

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  ariaLabel,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <main
      id="main"
      aria-label={ariaLabel}
      className="flex min-h-[100dvh] items-center justify-center px-6 py-12"
      style={shellStyle()}
    >
      <div className="w-full max-w-[360px]">
        <header className="mb-8 text-center">
          <p
            className="text-2xl font-semibold tracking-tight"
            style={headingStyle()}
          >
            peek.gift
          </p>
          <p className="mt-1 text-sm" style={mutedTextStyle()}>
            Make gift giving real again.
          </p>
        </header>
        <section className="space-y-6">
          <div className="space-y-1.5">
            <h1
              className="text-xl font-semibold tracking-tight"
              style={headingStyle()}
            >
              {title}
            </h1>
            {subtitle ? (
              <p className="text-sm" style={mutedTextStyle()}>
                {subtitle}
              </p>
            ) : null}
          </div>
          {children}
        </section>
        {footer ? (
          <footer
            className="mt-8 text-center text-sm"
            style={mutedTextStyle()}
          >
            {footer}
          </footer>
        ) : null}
      </div>
    </main>
  );
}
