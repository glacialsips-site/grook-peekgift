import type { CSSProperties } from 'react';

export type StyleSlot = CSSProperties;

const ink = 'hsl(var(--vibe-ink, var(--foreground)))';
const inkSoft = 'hsl(var(--vibe-ink, var(--foreground)) / 0.65)';
const inkMuted = 'hsl(var(--vibe-ink, var(--foreground)) / 0.5)';
const bg = 'hsl(var(--vibe-bg, var(--background)))';
const surface = 'hsl(var(--vibe-surface, var(--card)))';
const surfaceMuted = 'hsl(var(--vibe-muted, var(--muted)))';
const accent = 'hsl(var(--vibe-accent, var(--primary)))';
const accentInk = 'hsl(var(--vibe-bg, var(--primary-foreground)))';
const border = 'hsl(var(--vibe-ink, var(--border)) / 0.18)';
const borderStrong = 'hsl(var(--vibe-ink, var(--border)) / 0.32)';
const ring = 'hsl(var(--vibe-accent, var(--ring)))';
const error = 'hsl(var(--state-error))';
const errorInk = 'hsl(var(--state-error-ink))';
const success = 'hsl(var(--state-success))';

export const vibeTokens = {
  ink,
  inkSoft,
  inkMuted,
  bg,
  surface,
  surfaceMuted,
  accent,
  accentInk,
  border,
  borderStrong,
  ring,
  error,
  errorInk,
  success,
  radiusButton: 'var(--vibe-radius-button, 8px)',
  radiusCard: 'var(--vibe-radius-card, 12px)',
  radiusSm: 'calc(var(--vibe-radius-button, 8px) * 0.5)',
  radiusPill: '9999px',
  fontDisplay: 'var(--vibe-type-display, var(--peek-font-heading))',
  fontBody: 'var(--vibe-type-body, var(--peek-font-body))',
  fontMono: 'var(--vibe-type-mono, "JetBrains Mono", ui-monospace, monospace)',
  spaceBase: 'var(--vibe-space-base, 1rem)',
};

export type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link';

export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

const BUTTON_SIZE_PADDING: Record<ButtonSize, { padX: string; padY: string }> = {
  default: { padX: '1rem', padY: '0.5rem' },
  sm: { padX: '0.75rem', padY: '0.375rem' },
  lg: { padX: '2rem', padY: '0.625rem' },
  icon: { padX: '0', padY: '0' },
};

export function buttonStyle(variant: ButtonVariant, size: ButtonSize): StyleSlot {
  const { padX, padY } = BUTTON_SIZE_PADDING[size];
  const base: StyleSlot = {
    fontFamily: vibeTokens.fontBody,
    borderRadius: vibeTokens.radiusButton,
    paddingLeft: padX,
    paddingRight: padX,
    paddingTop: padY,
    paddingBottom: padY,
    transitionProperty: 'background-color, color, border-color, box-shadow, transform',
    transitionDuration: 'calc(140ms * var(--vibe-motion-scale, 1))',
  };
  switch (variant) {
    case 'default':
      return {
        ...base,
        backgroundColor: vibeTokens.accent,
        color: vibeTokens.accentInk,
        border: `1px solid ${vibeTokens.accent}`,
      };
    case 'destructive':
      return {
        ...base,
        backgroundColor: vibeTokens.error,
        color: vibeTokens.errorInk,
        border: `1px solid ${vibeTokens.error}`,
      };
    case 'outline':
      return {
        ...base,
        backgroundColor: 'transparent',
        color: vibeTokens.ink,
        border: `1px solid ${vibeTokens.borderStrong}`,
      };
    case 'secondary':
      return {
        ...base,
        backgroundColor: vibeTokens.surfaceMuted,
        color: vibeTokens.ink,
        border: `1px solid ${vibeTokens.border}`,
      };
    case 'ghost':
      return {
        ...base,
        backgroundColor: 'transparent',
        color: vibeTokens.ink,
        border: '1px solid transparent',
      };
    case 'link':
      return {
        ...base,
        backgroundColor: 'transparent',
        color: vibeTokens.accent,
        border: '1px solid transparent',
        textUnderlineOffset: '4px',
      };
  }
}

export function inputStyle(): StyleSlot {
  return {
    fontFamily: vibeTokens.fontBody,
    color: vibeTokens.ink,
    backgroundColor: vibeTokens.bg,
    border: `1px solid ${vibeTokens.borderStrong}`,
    borderRadius: vibeTokens.radiusButton,
  };
}

export function textareaStyle(): StyleSlot {
  return {
    fontFamily: vibeTokens.fontBody,
    color: vibeTokens.ink,
    backgroundColor: vibeTokens.bg,
    border: `1px solid ${vibeTokens.borderStrong}`,
    borderRadius: vibeTokens.radiusButton,
  };
}

export function cardStyle(): StyleSlot {
  return {
    backgroundColor: vibeTokens.surface,
    color: vibeTokens.ink,
    border: `1px solid ${vibeTokens.border}`,
    borderRadius: vibeTokens.radiusCard,
    fontFamily: vibeTokens.fontBody,
  };
}

export function dialogContentStyle(): StyleSlot {
  return {
    backgroundColor: vibeTokens.surface,
    color: vibeTokens.ink,
    border: `1px solid ${vibeTokens.border}`,
    borderRadius: vibeTokens.radiusCard,
    fontFamily: vibeTokens.fontBody,
    boxShadow: '0 24px 60px -20px hsl(var(--vibe-ink, 0 0% 0%) / 0.35)',
  };
}

export function avatarStyle(): StyleSlot {
  return {
    backgroundColor: vibeTokens.surfaceMuted,
    color: vibeTokens.ink,
    fontFamily: vibeTokens.fontDisplay,
  };
}

export function separatorStyle(): StyleSlot {
  return { backgroundColor: vibeTokens.border };
}

export function tooltipStyle(): StyleSlot {
  return {
    backgroundColor: vibeTokens.ink,
    color: vibeTokens.bg,
    fontFamily: vibeTokens.fontBody,
    borderRadius: vibeTokens.radiusSm,
  };
}

export function labelStyle(): StyleSlot {
  return {
    color: vibeTokens.ink,
    fontFamily: vibeTokens.fontBody,
  };
}

export function toastStyle(variant: 'default' | 'destructive'): StyleSlot {
  if (variant === 'destructive') {
    return {
      backgroundColor: vibeTokens.error,
      color: vibeTokens.errorInk,
      borderColor: vibeTokens.error,
      borderRadius: vibeTokens.radiusCard,
      fontFamily: vibeTokens.fontBody,
      boxShadow: '0 18px 40px -16px hsl(var(--state-error) / 0.45)',
    };
  }
  return {
    backgroundColor: vibeTokens.surface,
    color: vibeTokens.ink,
    border: `1px solid ${vibeTokens.border}`,
    borderRadius: vibeTokens.radiusCard,
    fontFamily: vibeTokens.fontBody,
    boxShadow: '0 18px 40px -16px hsl(var(--vibe-ink, 0 0% 0%) / 0.25)',
  };
}

export function menuContentStyle(): StyleSlot {
  return {
    backgroundColor: vibeTokens.surface,
    color: vibeTokens.ink,
    border: `1px solid ${vibeTokens.border}`,
    borderRadius: vibeTokens.radiusCard,
    fontFamily: vibeTokens.fontBody,
    boxShadow: '0 12px 32px -12px hsl(var(--vibe-ink, 0 0% 0%) / 0.3)',
  };
}

export function menuItemStyle(): StyleSlot {
  return {
    color: vibeTokens.ink,
    fontFamily: vibeTokens.fontBody,
    borderRadius: vibeTokens.radiusSm,
  };
}

export function bubbleStyle(role: 'user' | 'assistant'): StyleSlot {
  if (role === 'user') {
    return {
      backgroundColor: vibeTokens.accent,
      color: vibeTokens.accentInk,
      borderRadius: vibeTokens.radiusCard,
      fontFamily: vibeTokens.fontBody,
    };
  }
  return {
    backgroundColor: vibeTokens.surfaceMuted,
    color: vibeTokens.ink,
    borderRadius: vibeTokens.radiusCard,
    fontFamily: vibeTokens.fontBody,
  };
}

export function chipStyle(active: boolean): StyleSlot {
  if (active) {
    return {
      backgroundColor: vibeTokens.bg,
      color: vibeTokens.ink,
      borderRadius: vibeTokens.radiusPill,
      boxShadow: '0 1px 4px -1px hsl(var(--vibe-ink, 0 0% 0%) / 0.2)',
      fontFamily: vibeTokens.fontBody,
    };
  }
  return {
    backgroundColor: 'transparent',
    color: vibeTokens.inkSoft,
    borderRadius: vibeTokens.radiusPill,
    fontFamily: vibeTokens.fontBody,
  };
}

export function quickShareTileStyle(): StyleSlot {
  return {
    backgroundColor: vibeTokens.surface,
    color: vibeTokens.ink,
    border: `1px solid ${vibeTokens.border}`,
    borderRadius: vibeTokens.radiusCard,
    fontFamily: vibeTokens.fontBody,
  };
}

export function shellStyle(): StyleSlot {
  return {
    backgroundColor: vibeTokens.bg,
    color: vibeTokens.ink,
    fontFamily: vibeTokens.fontBody,
  };
}

export function headingStyle(): StyleSlot {
  return {
    fontFamily: vibeTokens.fontDisplay,
    color: vibeTokens.ink,
  };
}

export function mutedTextStyle(): StyleSlot {
  return {
    color: vibeTokens.inkSoft,
    fontFamily: vibeTokens.fontBody,
  };
}

export function destructiveTextStyle(): StyleSlot {
  return {
    color: vibeTokens.error,
    fontFamily: vibeTokens.fontBody,
  };
}

export function divider(): StyleSlot {
  return { backgroundColor: vibeTokens.border };
}
