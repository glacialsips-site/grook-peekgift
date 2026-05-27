'use client';

import { useCallback, useState } from 'react';
import { Check, Loader2, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type AppliedCoupon = {
  code: string;
  discount_kind: 'percent' | 'amount';
  discount_pct?: number;
  discount_amount?: number;
  currency?: string;
  savings?: number;
  base_amount?: number;
};

type CouponResponse =
  | (AppliedCoupon & { valid: true; mock?: boolean })
  | { valid: false; reason?: string; message?: string };

type Props = {
  applied: AppliedCoupon | null;
  onApplied: (coupon: AppliedCoupon | null) => void;
  disabled?: boolean;
  currency: string;
  className?: string;
};

function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

function describeCoupon(c: AppliedCoupon): string {
  if (c.discount_kind === 'percent' && c.discount_pct != null) {
    if (c.savings != null && c.currency) {
      return `Saved ${formatMoney(c.savings, c.currency)} (${c.discount_pct}% off)`;
    }
    return `${c.discount_pct}% off`;
  }
  if (c.discount_amount != null && c.currency) {
    return `Saved ${formatMoney(c.discount_amount, c.currency)}`;
  }
  return 'Applied';
}

export function CouponInput({
  applied,
  onApplied,
  disabled,
  currency,
  className,
}: Props) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const submit = useCallback(async () => {
    const code = value.trim();
    if (!code) {
      setError('Enter a code');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout/coupon', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as CouponResponse;
      if (!('valid' in data) || !data.valid) {
        const reason = ('reason' in data && data.reason) || 'invalid';
        const msg =
          reason === 'not_found'
            ? "We couldn't find that code"
            : reason === 'expired'
              ? 'That code has expired'
              : reason === 'empty'
                ? 'Enter a code'
                : 'That code isn’t valid';
        setError(msg);
        setLoading(false);
        return;
      }
      onApplied({
        code: data.code,
        discount_kind: data.discount_kind,
        discount_pct: data.discount_pct,
        discount_amount: data.discount_amount,
        currency: data.currency ?? currency,
        savings: data.savings,
      });
      setValue('');
      setLoading(false);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not validate code');
      setLoading(false);
    }
  }, [value, onApplied, currency]);

  function remove() {
    onApplied(null);
    setError(null);
    setValue('');
  }

  if (applied) {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-md border border-[color:hsl(var(--peek-accent))]/40 bg-[color:hsl(var(--peek-accent))]/5 px-3 py-2.5',
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:hsl(var(--peek-accent))]/15 text-[color:hsl(var(--peek-accent))]">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="font-mono text-xs font-semibold tracking-wider text-foreground">
              {applied.code}
            </span>
            <span className="text-xs text-muted-foreground">{describeCoupon(applied)}</span>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={remove}
          disabled={disabled}
          aria-label="Remove coupon"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-1.5 self-start text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:underline disabled:opacity-50',
          className,
        )}
      >
        <Tag className="h-3.5 w-3.5" aria-hidden="true" />
        Have a code?
      </button>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor="coupon" className="text-xs font-medium text-muted-foreground">
        Promo code
      </Label>
      <div className="flex gap-2">
        <Input
          id="coupon"
          name="coupon"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value.toUpperCase());
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void submit();
            }
          }}
          disabled={loading || disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'coupon-error' : undefined}
          className={cn(
            'h-10 font-mono uppercase tracking-wider',
            error && 'border-destructive focus-visible:ring-destructive',
          )}
          placeholder="ENTER CODE"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => void submit()}
          disabled={loading || disabled || value.trim().length === 0}
          className="h-10 px-4"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            'Apply'
          )}
        </Button>
      </div>
      {error && (
        <p id="coupon-error" role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
