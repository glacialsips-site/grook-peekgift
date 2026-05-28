'use client';

import type { Appearance } from '@stripe/stripe-js';

function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function hsl(name: string, fallback: string): string {
  const raw = readVar(name, fallback);
  if (raw.startsWith('hsl') || raw.startsWith('#') || raw.startsWith('rgb')) {
    return raw;
  }
  return `hsl(${raw})`;
}

export function buildPeekAppearance(): Appearance {
  const colorPrimary = hsl('--peek-accent', '24 95% 53%');
  const colorBackground = hsl('--peek-bg', '0 0% 100%');
  const colorSurface = hsl('--peek-surface', '240 4.8% 97%');
  const colorText = hsl('--peek-ink', '240 10% 3.9%');
  const colorDanger = hsl('--destructive', '0 84.2% 60.2%');
  const colorMuted = hsl('--muted-foreground', '240 4% 38%');
  const colorBorder = hsl('--border', '240 5.9% 90%');
  const radius = readVar('--peek-radius-sm', '8px');
  const radiusLg = readVar('--peek-radius', '12px');
  const fontFamily = readVar('--peek-font-body', 'system-ui, -apple-system, sans-serif');

  return {
    theme: 'stripe',
    disableAnimations: false,
    variables: {
      colorPrimary,
      colorBackground,
      colorText,
      colorDanger,
      colorTextSecondary: colorMuted,
      colorTextPlaceholder: colorMuted,
      fontFamily,
      fontSizeBase: '16px',
      fontSizeSm: '14px',
      fontWeightNormal: '400',
      fontWeightMedium: '500',
      fontWeightBold: '600',
      borderRadius: radius,
      spacingUnit: '4px',
      gridRowSpacing: '12px',
      gridColumnSpacing: '12px',
      tabSpacing: '8px',
      accordionItemSpacing: '8px',
      iconColor: colorText,
    },
    rules: {
      '.Input': {
        backgroundColor: colorBackground,
        border: `1px solid ${colorBorder}`,
        borderRadius: radius,
        boxShadow: 'none',
        padding: '12px 14px',
        transition: 'border-color 120ms ease, box-shadow 120ms ease',
      },
      '.Input:focus': {
        borderColor: colorPrimary,
        boxShadow: `0 0 0 2px ${colorPrimary}33`,
        outline: 'none',
      },
      '.Input--invalid': {
        borderColor: colorDanger,
        boxShadow: `0 0 0 2px ${colorDanger}22`,
      },
      '.Label': {
        fontWeight: '500',
        fontSize: '13px',
        marginBottom: '6px',
        color: colorText,
      },
      '.Tab': {
        backgroundColor: colorSurface,
        border: `1px solid ${colorBorder}`,
        borderRadius: radius,
        padding: '14px 16px',
        transition: 'border-color 120ms ease, background-color 120ms ease',
      },
      '.Tab:hover': {
        backgroundColor: colorBackground,
        borderColor: colorPrimary,
      },
      '.Tab--selected': {
        borderColor: colorPrimary,
        backgroundColor: colorBackground,
        boxShadow: `0 0 0 1px ${colorPrimary}`,
      },
      '.Tab--selected:focus': {
        boxShadow: `0 0 0 2px ${colorPrimary}66`,
      },
      '.TabIcon--selected': {
        fill: colorPrimary,
      },
      '.TabLabel--selected': {
        color: colorText,
      },
      '.AccordionItem': {
        backgroundColor: colorSurface,
        border: `1px solid ${colorBorder}`,
        borderRadius: radius,
      },
      '.MenuAction': {
        color: colorPrimary,
      },
      '.Block': {
        backgroundColor: colorSurface,
        border: `1px solid ${colorBorder}`,
        borderRadius: radiusLg,
      },
      '.Error': {
        color: colorDanger,
        fontSize: '13px',
        marginTop: '4px',
      },
    },
  };
}
