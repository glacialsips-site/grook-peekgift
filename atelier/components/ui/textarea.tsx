import * as React from 'react';

import { cn } from '@/lib/utils';
import { textareaStyle } from '@/lib/vibe/component-styles';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, style, ...props }, ref) => {
  const mergedStyle: React.CSSProperties = { ...textareaStyle(), ...(style ?? {}) };
  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      style={mergedStyle}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
