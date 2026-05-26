'use client';

import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';

type Provider = 'google' | 'apple' | 'github';

const LABELS: Record<Provider, string> = {
  google: 'Continue with Google',
  apple: 'Continue with Apple',
  github: 'Continue with GitHub',
};

function GoogleGlyph(): ReactElement {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.614z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.711H.957v2.332A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

function AppleGlyph(): ReactElement {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M13.434 9.563c.018 1.951 1.713 2.6 1.732 2.608-.014.047-.27.928-.892 1.834-.537.787-1.094 1.57-1.972 1.586-.862.016-1.14-.512-2.126-.512-.984 0-1.293.497-2.11.529-.847.031-1.493-.85-2.034-1.634-1.106-1.605-1.952-4.535-.815-6.514.564-.982 1.572-1.604 2.668-1.62.833-.016 1.618.56 2.127.56.509 0 1.464-.692 2.466-.59.42.018 1.6.17 2.357 1.281-.061.038-1.41.823-1.4 2.472zM12.06 3.45c.455-.55.762-1.317.679-2.081-.656.027-1.452.437-1.922.985-.422.486-.793 1.265-.693 2.013.733.056 1.481-.367 1.936-.917z"
      />
    </svg>
  );
}

function GithubGlyph(): ReactElement {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 0C4.03 0 0 4.03 0 9c0 3.977 2.578 7.346 6.156 8.535.45.083.614-.196.614-.435 0-.215-.008-.78-.012-1.531-2.503.544-3.031-1.207-3.031-1.207-.409-1.04-.999-1.317-.999-1.317-.816-.558.062-.547.062-.547.902.064 1.378.926 1.378.926.802 1.374 2.105.977 2.617.747.082-.58.314-.977.571-1.202-1.998-.227-4.099-.999-4.099-4.444 0-.982.35-1.785.926-2.414-.093-.227-.401-1.142.088-2.381 0 0 .756-.242 2.476.922A8.624 8.624 0 0 1 9 4.388c.766.004 1.538.103 2.258.302 1.72-1.164 2.475-.922 2.475-.922.49 1.239.182 2.154.09 2.381.576.629.925 1.432.925 2.414 0 3.454-2.105 4.214-4.109 4.437.322.278.61.825.61 1.663 0 1.202-.012 2.171-.012 2.467 0 .24.162.521.619.433A9.002 9.002 0 0 0 18 9c0-4.97-4.03-9-9-9z"
      />
    </svg>
  );
}

const GLYPHS: Record<Provider, () => ReactElement> = {
  google: GoogleGlyph,
  apple: AppleGlyph,
  github: GithubGlyph,
};

export function OAuthButton({
  provider,
  onClick,
  disabled,
}: {
  provider: Provider;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const Glyph = GLYPHS[provider];
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-full"
      onClick={onClick}
      disabled={disabled}
    >
      <Glyph />
      <span>{LABELS[provider]}</span>
    </Button>
  );
}
