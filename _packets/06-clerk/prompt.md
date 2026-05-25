# Packet 06 — Clerk integration (middleware, sign-in/up routes, webhook handler)

- **Worker:** cc-on-web | webchat-opus
- **Branch:** `claude/packet-06-clerk`
- **Depends on:** packet 01 merged (does NOT depend on 05 — providers wiring lands in a later integration packet)
- **Estimated tokens:** ~25k
- **Target paths:** `atelier/middleware.ts`, `atelier/app/sign-in/**`, `atelier/app/sign-up/**`, `atelier/app/api/webhooks/clerk/**`, `atelier/lib/auth/**`

## Context

Clerk handles auth. The same Clerk app (`accounts.peek.gift`) used by the existing legacy site is reused, so users have one identity across both. Clerk middleware protects routes; sign-in/up are catch-all routes using `<SignIn />` / `<SignUp />`; a webhook handler syncs Clerk user events to our Postgres `users` table.

This packet does NOT add `<ClerkProvider>` to the layout — that's an integration packet job, since `app/layout.tsx` is shared. This packet only defines middleware, routes, helpers, and the webhook handler.

The webhook is Svix-signed. Verify the signature using `CLERK_WEBHOOK_SIGNING_SECRET`. Handle `user.created`, `user.updated`, `user.deleted`. On `user.created` and `user.updated`: upsert into `peek_v2.users`. On `user.deleted`: hard-delete the row (cascade will clean up associated peeks).

## Inputs

None.

## Deliver

### `atelier/middleware.ts`

```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/g/(.*)',              // recipient pages — public by design
  '/api/webhooks/(.*)',   // signed webhooks
  '/api/og/(.*)',         // public OG images
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

### `atelier/app/sign-in/[[...rest]]/page.tsx`

```tsx
import { SignIn } from '@clerk/nextjs';

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <SignIn />
    </main>
  );
}
```

### `atelier/app/sign-up/[[...rest]]/page.tsx`

```tsx
import { SignUp } from '@clerk/nextjs';

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <SignUp />
    </main>
  );
}
```

### `atelier/lib/auth/server.ts`

Server helpers:

```ts
import 'server-only';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function getUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

export async function requireUserId(): Promise<string> {
  const userId = await getUserId();
  if (!userId) throw new Error('UNAUTHORIZED');
  return userId;
}

export async function getCurrentUser() {
  return currentUser();
}
```

### `atelier/app/api/webhooks/clerk/route.ts`

```ts
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { env } from '@/lib/env';
import { getSupabaseService } from '@/lib/supabase/service';
import type { WebhookEvent } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  const secret = env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) return new Response('webhook not configured', { status: 500 });

  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('missing svix headers', { status: 400 });
  }

  const body = await req.text();
  let evt: WebhookEvent;
  try {
    evt = new Webhook(secret).verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch {
    return new Response('invalid signature', { status: 401 });
  }

  const db = getSupabaseService();

  if (evt.type === 'user.created' || evt.type === 'user.updated') {
    const u = evt.data;
    const email = u.email_addresses.find(e => e.id === u.primary_email_address_id)?.email_address ?? null;
    const displayName = [u.first_name, u.last_name].filter(Boolean).join(' ') || null;
    await db.schema('peek_v2').from('users').upsert({
      clerk_user_id: u.id,
      email,
      display_name: displayName,
      avatar_url: u.image_url ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'clerk_user_id' });
  }

  if (evt.type === 'user.deleted') {
    if (evt.data.id) {
      await db.schema('peek_v2').from('users').delete().eq('clerk_user_id', evt.data.id);
    }
  }

  return new Response('ok', { status: 200 });
}
```

Note: the `db.schema('peek_v2').from(...)` usage assumes Supabase JS v2 schema-scoping is supported. If the worker finds this API doesn't work as written (Supabase JS has shifted on this), use raw `client.from('users')` with the `db` config option `{ db: { schema: 'peek_v2' } }` when creating the service client — and add a NOTE explaining the swap.

### `atelier/lib/auth/setup-notes.md`

A markdown doc the user reads ONCE to set up Clerk. Not loaded by the app, just docs:

- Steps to create a Clerk JWT template named `supabase` signed with the Supabase JWT secret, with the claim `{ "sub": "{{user.id}}", "role": "authenticated" }`.
- Steps to add a webhook endpoint at `{APP_URL}/api/webhooks/clerk` with events `user.created`, `user.updated`, `user.deleted` — and where to find the signing secret to put in `CLERK_WEBHOOK_SIGNING_SECRET`.
- Note: same Clerk app as legacy peek.gift; no new keys needed if `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are already set.

## Constraints

- Do not modify `package.json`, `tsconfig.json`, `app/layout.tsx`, `components/providers.tsx`, or anything outside the target paths.
- TS strict. No `any` except where Svix's typing requires (note inline if so).
- Webhook MUST verify signature before doing anything.
- Public routes list must include `/g/(.*)` (recipient pages are public).

## Validation

```bash
cd atelier && npm install && npm run build
```

## Reply format

cc-on-web: branch `claude/packet-06-clerk`, commit `packet 06: clerk`, push.
webchat-opus: zip `06-clerk-deliverable.zip` with files at paths relative to `atelier/`. `NOTES.md` for deviations.

Keep your text reply minimal.
