'use client';

import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';

import { cn } from '@/lib/utils';
import { separatorStyle } from '@/lib/vibe/component-styles';

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = 'horizontal', decorative = true, style, ...props },
    ref,
  ) => {
    const mergedStyle: React.CSSProperties = {
      ...separatorStyle(),
      ...(style ?? {}),
    };
    return (
      <SeparatorPrimitive.Root
        ref={ref}
        decorative={decorative}
        orientation={orientation}
        className={cn(
          'shrink-0',
          orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
          className,
        )}
        style={mergedStyle}
        {...props}
      />
    );
  },
);
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
