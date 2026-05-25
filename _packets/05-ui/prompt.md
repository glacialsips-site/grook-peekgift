# Packet 05 — UI primitives (shadcn/ui + theme provider + adaptive Vibe renderer)

- **Worker:** cc-on-web | webchat-opus
- **Branch:** `claude/packet-05-ui`
- **Depends on:** packet 01 merged
- **Estimated tokens:** ~50k
- **Target paths:** `atelier/components/ui/**`, `atelier/components/providers.tsx`, `atelier/components/peek-vibe-provider.tsx`

## Context

UI base layer: shadcn/ui primitives (button, input, textarea, dialog, dropdown-menu, avatar, scroll-area, separator, tooltip, toast, label) styled with the CSS-variable theme set up in packet 01's `tailwind.config.ts` + `app/globals.css`. Plus two app-level providers:

1. **`<Providers>`** — wraps children with `next-themes` `ThemeProvider` (light/dark), `QueryClientProvider` (TanStack Query). Used in `app/layout.tsx` in a later integration packet.
2. **`<PeekVibeProvider vibe={...}>`** — wraps a *single Peek page* with that Peek's adaptive theme. Reads the Peek's `vibe` object (palette, motion, font_pairing) and writes CSS variables (`--peek-bg`, `--peek-surface`, `--peek-ink`, `--peek-accent`, etc.) to a scoped wrapper so the page renders in its custom palette without affecting the rest of the app.

## Inputs

None.

## Deliver

### `atelier/components/providers.tsx`

```tsx
'use client';

import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }));

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

### `atelier/components/peek-vibe-provider.tsx`

```tsx
'use client';

import { useMemo, type CSSProperties, type ReactNode } from 'react';

export interface Vibe {
  tone?: string;
  palette?: {
    bg: string;
    surface: string;
    ink: string;
    accent: string;
    accent2?: string;
  };
  mood_words?: string[];
  motion?: 'still' | 'soft' | 'lively';
  font_pairing?: { display: string; body: string };
}

export function PeekVibeProvider({ vibe, children }: { vibe: Vibe; children: ReactNode }) {
  const style = useMemo<CSSProperties>(() => {
    const s: Record<string, string> = {};
    if (vibe.palette?.bg) s['--peek-bg'] = vibe.palette.bg;
    if (vibe.palette?.surface) s['--peek-surface'] = vibe.palette.surface;
    if (vibe.palette?.ink) s['--peek-ink'] = vibe.palette.ink;
    if (vibe.palette?.accent) s['--peek-accent'] = vibe.palette.accent;
    if (vibe.palette?.accent2) s['--peek-accent2'] = vibe.palette.accent2;
    return s as CSSProperties;
  }, [vibe]);

  const motionClass = vibe.motion === 'lively' ? 'peek-motion-lively' : vibe.motion === 'still' ? 'peek-motion-still' : 'peek-motion-soft';

  return (
    <div className={`peek-vibe ${motionClass}`} style={style} data-tone={vibe.tone}>
      {children}
    </div>
  );
}
```

### `atelier/components/ui/*`

Generate the latest **Tailwind v4-compatible** shadcn/ui versions of these primitives (use the current official source from https://ui.shadcn.com/ — the v4 release uses CSS-variable `@theme` blocks and `data-slot` attributes, not the older `cva` + `bg-background` patterns). Copy verbatim, do not invent variants:

- `button.tsx` — with `cva` variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`; sizes `default`, `sm`, `lg`, `icon`.
- `input.tsx`
- `textarea.tsx`
- `label.tsx`
- `dialog.tsx`
- `dropdown-menu.tsx`
- `avatar.tsx`
- `scroll-area.tsx`
- `separator.tsx`
- `tooltip.tsx`
- `toast.tsx` + `toaster.tsx` + `use-toast.ts` (the shadcn Radix-toast trio)

All components use `cn` from `@/lib/utils`. All forward refs. All use the theme CSS variables (`bg-background`, `text-foreground`, `border-input`, `ring-ring`, etc.) — never hardcode colors.

## Constraints

- Do not modify `package.json`, `app/layout.tsx`, or anything outside `atelier/components/`. You may add a small `@theme` extension to `app/globals.css` if shadcn-v4 components require additional CSS tokens — keep it minimal and additive.
- Use only Radix primitives that are already in `package.json` (avatar, dialog, dropdown-menu, label, scroll-area, separator, slot, toast, tooltip). No new deps.
- TS strict. Components are `'use client'` where they use hooks or interactivity; pure presentational ones can be server.
- Match shadcn/ui's API surface exactly so consumers can copy idiomatic shadcn examples without translation.

## Validation

```bash
cd atelier && npm install && npm run build
```

## Reply format

cc-on-web: branch `claude/packet-05-ui`, commit `packet 05: ui`, push.
webchat-opus: zip `05-ui-deliverable.zip` with files at paths relative to `atelier/`. `NOTES.md` for deviations.

Keep your text reply minimal.
