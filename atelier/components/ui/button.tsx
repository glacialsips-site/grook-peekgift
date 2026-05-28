import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import {
  buttonStyle,
  type ButtonSize,
  type ButtonVariant,
} from '@/lib/vibe/component-styles';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: '',
        destructive: '',
        outline: '',
        secondary: '',
        ghost: '',
        link: 'underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10',
        sm: 'h-9',
        lg: 'h-11',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const v = (variant ?? 'default') as ButtonVariant;
    const s = (size ?? 'default') as ButtonSize;
    const mergedStyle: React.CSSProperties = { ...buttonStyle(v, s), ...(style ?? {}) };
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        style={mergedStyle}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
