# Packet 04 — Supabase clients + storage helpers

- **Worker:** cc-on-web | webchat-opus
- **Branch:** `claude/packet-04-supabase`
- **Depends on:** packet 01 merged
- **Estimated tokens:** ~20k
- **Target paths:** `atelier/lib/supabase/**`

## Context

Three flavors of Supabase client are needed: server (with Clerk-issued JWT for RLS), browser (anon key, public-safe), and service-role (server-only, bypasses RLS — used for webhooks, admin tasks, jobs). Plus typed Storage helpers for the `peek-v2-assets` bucket.

The Clerk-to-Supabase JWT bridge is set up via a Clerk JWT template named `supabase` that signs JWTs with Supabase's JWT secret. The server client reads the Clerk token via `auth().getToken({ template: 'supabase' })` and passes it as the `Authorization` header so RLS policies see the Clerk user id in `auth.uid()`.

## Inputs

None.

## Deliver

### `atelier/lib/supabase/types.ts`

```ts
// Placeholder for generated DB types — will be replaced when we run `supabase gen types typescript`.
// For now, an empty type that lets `createClient<Database>(...)` compile.
export type Database = Record<string, unknown>;
```

### `atelier/lib/supabase/server.ts`

```ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { env } from '@/lib/env';
import type { Database } from './types';

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  const { getToken } = await auth();
  const token = await getToken({ template: 'supabase' }).catch(() => null);

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // server-component context — cookies are read-only here
          }
        },
      },
      global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    }
  );
}
```

### `atelier/lib/supabase/browser.ts`

```ts
import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';
import type { Database } from './types';

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowser() {
  if (_client) return _client;
  _client = createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  return _client;
}
```

### `atelier/lib/supabase/service.ts`

```ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Database } from './types';

let _client: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseService() {
  if (_client) return _client;
  _client = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return _client;
}
```

### `atelier/lib/supabase/storage.ts`

Typed helpers for the `peek-v2-assets` bucket:

```ts
import 'server-only';
import { getSupabaseService } from './service';
import { env } from '@/lib/env';
import { randomUUID } from 'node:crypto';

const BUCKET = env.SUPABASE_STORAGE_BUCKET ?? 'peek-v2-assets';

export async function uploadAsset(opts: {
  path?: string;             // optional explicit path; else auto-uuid
  data: Buffer | Uint8Array | Blob;
  contentType: string;
  cacheControl?: string;
}): Promise<{ path: string; publicUrl: string }> {
  const path = opts.path ?? `${new Date().toISOString().slice(0, 10)}/${randomUUID()}`;
  const client = getSupabaseService();
  const { error } = await client.storage.from(BUCKET).upload(path, opts.data, {
    contentType: opts.contentType,
    cacheControl: opts.cacheControl ?? '604800',
    upsert: false,
  });
  if (error) throw error;
  const { data } = client.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function deleteAsset(path: string): Promise<void> {
  const { error } = await getSupabaseService().storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

export function getPublicUrl(path: string): string {
  return getSupabaseService().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
```

### `atelier/lib/supabase/index.ts`

Barrel re-exporting `createSupabaseServer`, `getSupabaseBrowser`, `getSupabaseService`, storage helpers, `Database` type.

## Constraints

- Do not modify `package.json`, `lib/env.ts`, or anything outside `atelier/lib/supabase/`.
- TS strict. No `any`.
- Server modules use `import 'server-only'` to fail loudly if a client component imports them.
- The Clerk JWT template lookup must not throw if Clerk is unauthenticated — fall back to anon (no Authorization header).

## Validation

```bash
cd atelier && npm install && npm run build
```

## Reply format

cc-on-web: branch `claude/packet-04-supabase`, commit `packet 04: supabase`, push.
webchat-opus: zip `04-supabase-deliverable.zip` with files at paths relative to `atelier/`. `NOTES.md` for deviations.

Keep your text reply minimal.
