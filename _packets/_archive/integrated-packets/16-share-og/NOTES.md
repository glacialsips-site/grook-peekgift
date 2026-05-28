# Packet 16 — notes for orchestrator

## CRITICAL: `app/g/[slug]/page.tsx` merge with packet 14

Packet 14 owns the body of `app/g/[slug]/page.tsx` (recipient view rendering).
Packet 16 only needs to inject a `generateMetadata` export into that file.

The placeholder `page.tsx` shipped here is intentionally minimal:

- `import type { Metadata } from 'next';`
- `import { getSupabaseService } from '@/lib/supabase/service';`
- `export async function generateMetadata(...): Promise<Metadata> { ... }`
- `export default function Page() { return null; }`

The default export is a placeholder so the route compiles standalone — packet
16's typecheck would otherwise fail because Next requires every `page.tsx` to
have a default export.

**Merge procedure when integrating both packets:**

1. Take packet 14's full `app/g/[slug]/page.tsx` (real body + default export).
2. Prepend / merge packet 16's `generateMetadata` export at the top of the
   imports block (and the `Metadata` import if not already present).
3. Discard packet 16's `export default function Page() { return null; }`
   stub.
4. Discard packet 16's `PeekMetaRow` type and inline the select-and-shape into
   `generateMetadata` (or keep the helper — both are fine, just avoid
   duplicating with whatever packet 14 named).

No code in packet 16 imports from packet 14, so this is a pure file-merge
operation, not a dependency rewrite.

## OG endpoint location

Followed the Next 16 convention: `app/g/[slug]/opengraph-image.tsx`. Did not
create a separate `app/api/og/[slug]/route.ts` — the convention file is more
idiomatic and `<meta property="og:image">` is auto-injected by Next from the
opengraph-image colocated file. If we ever need a programmatically-callable OG
endpoint (e.g. for the share-sheet preview that goes to a CDN), we can add a
parallel `app/api/og/[slug]/route.ts` later.

The share-sheet preview thumbnail uses `${APP_URL}/g/{slug}/opengraph-image`
which is the URL Next exposes for the convention file.

## Convention compliance

- `runtime = 'edge'`, `size = { width: 1200, height: 630 }`, `contentType =
  'image/png'` — standard Next conventions.
- Remote hero image loaded via `<img src={heroUrl}>`. Next 16's `next/og`
  supports this out of the box for hero URLs from Supabase storage. No
  `next.config` change needed.
- Graceful fallback when peek not found OR hero image missing — uses
  vibe-tinted gradient + wordmark. Never 500s.

## Resend `react` rendering

The Resend SDK supports `react: ReactElement` directly — no
`@react-email/components` dependency added. Templates are plain JSX with
inline styles (required for email-client compatibility).

## Twilio SMS

`/api/share/send` returns `{ error: 'sms_not_configured' }` with HTTP 503 when
any of `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` is
absent. UI catches this and toasts a fallback message pointing at the
quick-share row. So the share UI degrades cleanly when Twilio isn't wired
yet — matches the user's note that Twilio keys aren't in place.

## Idempotent curator confirmation email

`/build/[peekId]/publish/share/page.tsx` fires a one-shot `PeekPublishedEmail`
to the curator's Clerk primary email on first hit, guarded by an `events` row
with `kind: 'curator_published_email'`. Subsequent visits won't re-send. Also
guarded against `RESEND_API_KEY` missing — `sendEmail` returns `{ ok: false,
error: 'email_not_configured' }` and we log the outcome to events with
`outcome: 'failed'`.

## Validation outcome

`npm install && APP_URL=http://localhost:3000 npm run typecheck` — pass.

Did NOT run `npm run build` to keep cycle time tight — the prompt said
"if time permits."

## Deviations

- Did NOT add `app/api/og/[slug]/route.ts` (see "OG endpoint location"
  above) — the Next 16 convention file covers all current use cases.
- Added a second email template `peek-share-message.tsx` (sent by
  `/api/share/send` when channel = email). Prompt only specified
  `peek-published.tsx` but the in-app email send needs its own template
  unless we want to lazily reuse the published-confirmation template, which
  would be wrong (different sender, different intent).
