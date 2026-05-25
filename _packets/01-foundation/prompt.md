# Packet 01 — Foundation (Next.js 15 + TS + Tailwind v4 + env loader)

- **Worker:** cc-on-web (preferred) | webchat-opus (fallback)
- **Branch:** `claude/packet-01-foundation`
- **Depends on:** none
- **Estimated tokens:** ~40k
- **Target paths:** all files inside `atelier/`

## Context

We're building the new peek.gift app at `atelier/` inside this repo. This packet creates the bare working Next.js 15 foundation that all subsequent packets (DB, Anthropic, Supabase, UI, Clerk, etc.) will build on top of. The existing app at the repo root is unrelated scrap and must not be touched.

The `package.json` you create must include **every dependency the full build will need**, even if this packet doesn't use them. Later packets are forbidden from modifying `package.json` to keep merges conflict-free.

**Versioning rule (per STATE.md build principles): always latest stable.** The dep list below names the libraries; **resolve every version to the current latest stable at install time**. Do not use the version numbers shown — they're stale placeholders. If two libs have peer-dep conflicts, bump both to latest, not `--legacy-peer-deps`.

## Inputs

None.

## Deliver

Create the following files inside `atelier/`. All paths below are relative to `atelier/`.

### `package.json`

```json
{
  "name": "atelier",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx db/migrate.ts",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.65.0",
    "@clerk/nextjs": "^6.34.0",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-toast": "^1.2.15",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@sentry/nextjs": "^9.0.0",
    "@supabase/ssr": "^0.6.1",
    "@supabase/supabase-js": "^2.46.0",
    "@tanstack/react-query": "^5.62.0",
    "@upstash/ratelimit": "^2.0.5",
    "@upstash/redis": "^1.34.3",
    "@vercel/og": "^0.6.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "dotenv": "^16.4.7",
    "drizzle-orm": "^0.36.4",
    "framer-motion": "^11.15.0",
    "inngest": "^3.27.4",
    "lucide-react": "^0.460.0",
    "next": "15.1.3",
    "next-themes": "^0.4.4",
    "playwright-core": "^1.49.1",
    "postgres": "^3.4.5",
    "posthog-js": "^1.205.0",
    "posthog-node": "^4.7.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-markdown": "^9.0.1",
    "remark-gfm": "^4.0.0",
    "resend": "^4.0.1",
    "stripe": "^17.5.0",
    "svix": "^1.43.0",
    "tailwind-merge": "^2.5.5",
    "twilio": "^5.4.0",
    "zod": "^3.24.1",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.1",
    "@types/node": "^22.10.5",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "autoprefixer": "^10.4.20",
    "drizzle-kit": "^0.30.1",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

Note: use Tailwind v4 (latest). It needs the `@tailwindcss/postcss` plugin in `postcss.config.mjs` and `@import "tailwindcss";` at the top of `globals.css` instead of the v3 `@tailwind base/components/utilities` directives. Theme tokens move to `@theme` blocks in CSS rather than `tailwind.config.ts` — keep `tailwind.config.ts` minimal (just `content` paths if needed at all; v4 prefers CSS-first config).

### `tsconfig.json`

Standard Next.js TS strict config with `@/*` path alias to `./*`, `noUncheckedIndexedAccess: true`, `strict: true`, target `ES2022`, module `esnext`, moduleResolution `bundler`, jsx `preserve`, plugins `[{ "name": "next" }]`, include `["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]`, exclude `["node_modules", ".next"]`.

### `next.config.mjs`

```js
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { bodySizeLimit: '8mb' }
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.netlify.app' },
      { protocol: 'https', hostname: 'peek.gift' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.fal.media' }
    ]
  }
};

export default nextConfig;
```

### `postcss.config.mjs`

Standard: `{ plugins: { tailwindcss: {}, autoprefixer: {} } }`.

### `tailwind.config.ts`

App Router content paths covering `./app/**/*.{ts,tsx}` and `./components/**/*.{ts,tsx}`. Use shadcn/ui's standard CSS variable theme with HSL — define `--background`, `--foreground`, `--card`, `--card-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--accent`, `--muted`, `--border`, `--ring`, `--radius` etc. (both `:root` and `.dark`). Extend `theme.colors` to use `hsl(var(--...))`. Add a `peek` color namespace with `bg`, `surface`, `ink`, `accent`, `accent2` mapped to CSS variables so adaptive themes can override them per-page later.

### `.gitignore`

Standard Next.js + Node + IDE + `.env*` (except `.env.example`), include `.netlify/`, `.vercel/`, `*.tsbuildinfo`.

### `.env.example`

Cover every env var the full app will use. Group with section headers:

```
# --- App ---
APP_URL=http://localhost:3000
NODE_ENV=development

# --- Anthropic ---
ANTHROPIC_API_KEY=

# --- Clerk ---
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SIGNING_SECRET=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=peek-v2-assets
DATABASE_URL=

# --- Stripe ---
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
PAY_MODE=mock

# --- Email / SMS ---
RESEND_API_KEY=
NOTIFICATIONS_FROM=peek.gift <info@peek.gift>
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
TWILIO_WHATSAPP_FROM=

# --- Scraping ---
BROWSERBASE_API_KEY=
BROWSERBASE_PROJECT_ID=
ZENROWS_API_KEY=

# --- Image gen ---
FAL_KEY=

# --- Analytics / Errors ---
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# --- Rate limit / cache ---
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# --- Background jobs ---
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# --- Affiliates ---
SKIMLINKS_PUBLISHER_ID=
TOLT_API_KEY=

# --- Misc ---
GUEST_CLAIM_TOKEN_SECRET=
```

### `lib/env.ts`

Zod-validated env loader. One schema, parses `process.env` at module load, throws clear error listing missing/invalid keys. Export typed `env` object. Mark which vars are required vs optional — for this scaffolding, ONLY `APP_URL` is required; everything else is optional with `.optional()`. Later packets will tighten as features come online. Public (NEXT_PUBLIC_*) vars must be safe to expose; do not import server-only secrets into client modules.

```ts
import { z } from 'zod';

const schema = z.object({
  APP_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  ANTHROPIC_API_KEY: z.string().optional(),
  // ... all others .optional() for now
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment — see logs above');
}

export const env = parsed.data;
```

Add every env var from `.env.example` to the schema as `.optional()` for now.

### `lib/utils.ts`

```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### `app/globals.css`

Tailwind base/components/utilities directives, CSS variable definitions for `:root` and `.dark` matching the tailwind.config.ts theme, basic body resets, smooth scroll, font-feature-settings for inter font.

### `app/layout.tsx`

Server component. Imports `./globals.css`. Loads Inter via `next/font/google` with `variable: '--font-sans'`. Returns `<html lang="en" suppressHydrationWarning>` → `<body className={cn(inter.variable, 'min-h-screen bg-background text-foreground antialiased')}>{children}</body>`. Metadata: title `peek.gift`, description `Make gift giving real again.`

### `app/page.tsx`

Client component allowed but not needed. Centered, mobile-first:

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-semibold tracking-tight">peek.gift</h1>
      <p className="mt-4 text-muted-foreground">Make gift giving real again.</p>
    </main>
  );
}
```

### `README.md`

5-line README: what this is, how to run (`cp .env.example .env.local`, `npm install`, `npm run dev`), pointer to `_packets/STATE.md` for build status.

## Constraints

- **TypeScript strict.** No `any`. No `@ts-ignore`.
- **Do not touch any files outside `atelier/`.** The repo root has unrelated scrap.
- **Use the exact `package.json` above verbatim** — later packets depend on this dep set being locked.
- **Tailwind v4** (latest).
- **No additional dependencies** beyond what's in the package.json dep set.
- **No comments** unless explaining a non-obvious WHY.
- Use `pnpm`-compatible or `npm`-compatible install. We're on `npm`.

## Validation (must pass before commit)

```bash
cd atelier
npm install
npm run typecheck
npm run build
```

All three must succeed. `npm run dev` should serve a working page at `http://localhost:3000` showing the peek.gift title.

## Reply format

### If cc-on-web worker:

1. Work on branch `claude/packet-01-foundation`.
2. Commit with message: `packet 01: foundation`.
3. Push the branch.
4. Reply with: branch name + 2-sentence summary + `NOTES.md` content if any deviation.

### If webchat-opus worker:

Reply with a single zip named exactly `01-foundation-deliverable.zip` containing all files at their paths (e.g., `package.json`, `tsconfig.json`, `app/layout.tsx`, etc.) — relative to `atelier/`, no `atelier/` prefix in the zip.

If any deviation was necessary, include a `NOTES.md` at the zip root with one bullet per deviation explaining why.

Keep your text reply minimal.
