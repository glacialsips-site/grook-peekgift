'use client';

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  targetId: string;
  children: React.ReactNode;
  className?: string;
  withChevron?: boolean;
};

export function ScrollToButton({
  targetId,
  children,
  className,
  withChevron = false,
}: Props) {
  return (
    <button
      type="button"
      onClick={() => {
        const el = document.getElementById(targetId);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-1.5 text-base text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
    >
      {children}
      {withChevron ? <ChevronDown className="h-4 w-4" aria-hidden /> : null}
    </button>
  );
}
