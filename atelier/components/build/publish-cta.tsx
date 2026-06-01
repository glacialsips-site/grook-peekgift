'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  peekId: string;
  disabled?: boolean;
  label?: string;
  className?: string;
};

export function PublishCta({
  peekId,
  disabled = false,
  label = 'Publish — $12',
  className,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (disabled || isPending) return;
    startTransition(() => {
      router.push(`/build/${peekId}/publish/checkout`);
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Button
        type="button"
        size="lg"
        onClick={handleClick}
        disabled={disabled || isPending}
        className="min-h-11 w-full"
        aria-busy={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Opening checkout…
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
            {label}
          </>
        )}
      </Button>
    </motion.div>
  );
}
