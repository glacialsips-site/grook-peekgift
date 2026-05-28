# Packet 16 — Share flow + OG image generation + Resend confirmation email

- **Worker:** cc-on-web | webchat-opus
- **Branch:** `claude/packet-16-share-og`
- **Depends on (sequencing):** `atelier-integration`
- **Imports from siblings:** `@/lib/env`, `@/lib/supabase/service`, `@/lib/peek/types`, `db/schema/*`
- **Validation:** `cd atelier && npm install && npm run typecheck` (cross-packet imports)
- **Target paths:** `atelier/app/api/og/[slug]/**`, `atelier/app/g/[slug]/opengraph-image.tsx` (or `route.ts`), `atelier/components/build/share-sheet.tsx`, `atelier/lib/email/**`, `atelier/app/build/[peekId]/publish/share/**`

## Context

Once a Peek is published (packet 15), the curator lands on a share screen. We need:

1. **Per-Peek OG image** auto-generated via `@vercel/og` — recipient's name burned in, hero image as backdrop, peek.gift wordmark. Shows up in iMessage / WhatsApp / X / IG previews.
2. **Share sheet UI** — the curator's "now spread it" surface. Copy-link button, native share API on mobile (`navigator.share()`), platform-specific deep links for X / Facebook / WhatsApp / iMessage / SMS (via Twilio later), plus an in-app "send via SMS or email" form that uses Resend / Twilio server-side so we don't expose the curator's contacts to any third party.
3. **Resend confirmation email to the curator** — sent server-side from the Stripe webhook (packet 15) or here as a separate trigger. Subject: "your Peek for {recipient_name} is live". Body: link + share suggestions.

Recipient pages (`/g/[slug]`) also need `<meta>` tags so X / FB / iMessage scrape correctly: `og:title`, `og:description`, `og:image` (pointing at the OG endpoint), `twitter:card: summary_large_image`.

## Deliver

### `atelier/app/g/[slug]/opengraph-image.tsx`

Next.js convention: a route segment that exports an `ImageResponse` from `@vercel/og`. Generates the per-Peek OG image dynamically. Size 1200x630.

```tsx
import { ImageResponse } from 'next/og';
import { getSupabaseService } from '@/lib/supabase/service';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { slug: string } }) {
  const { data: peek } = await getSupabaseService()
    .from('peeks')
    .select('recipient_name, occasion, hero_image_url, vibe')
    .eq('slug', params.slug)
    .single();
  if (!peek) {
    return new ImageResponse(<div>peek.gift</div>, size);
  }
  // Compose layout: hero image as background (cover), gradient overlay, recipient name large, occasion small, peek.gift wordmark in corner.
  // Use the peek.vibe.palette for accent colors if present.
  // ...
}
```

Hero image is loaded as a remote URL — Next 16 supports this in `next/og` with no special config. Add a graceful fallback when hero is null (use a vibe-tinted gradient).

### `atelier/app/g/[slug]/page.tsx` — metadata only (no functional changes)

Export a Next metadata function that returns OG tags for the Peek (does NOT duplicate work — just declares the OG endpoint):

```tsx
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { data: peek } = await getSupabaseService()
    .from('peeks')
    .select('recipient_name, occasion')
    .eq('slug', params.slug)
    .single();
  const title = peek?.recipient_name
    ? `A Peek for ${peek.recipient_name}${peek.occasion ? ` — ${peek.occasion}` : ''}`
    : 'peek.gift';
  return {
    title,
    description: 'Open your Peek.',
    openGraph: { title, images: [`/g/${params.slug}/opengraph-image`] },
    twitter: { card: 'summary_large_image', title },
  };
}
```

Note: packet 14 owns `app/g/[slug]/page.tsx` — if that file already exists from packet 14, **only add the `generateMetadata` export** without disturbing what's there. Worker handles this by *appending* the export, not rewriting the file.

### `atelier/components/build/share-sheet.tsx`

`'use client'`. The post-publish share UI.

- Hero of the share screen: shows the published Peek as a card preview (slug + recipient name + thumbnail of OG image).
- Copy-link button → `navigator.clipboard.writeText(shareUrl)` → toast confirm.
- On mobile, "Share via..." button → `navigator.share({ title, text, url })` (feature-detect; fallback to copy-link).
- Quick-share buttons for: iMessage (`sms:&body=`), WhatsApp (`https://wa.me/?text=`), X (`https://twitter.com/intent/tweet`), Facebook share, email (`mailto:?subject=&body=`).
- **In-app SMS/email form**: textarea + recipient phone/email + send button → POSTs to `/api/share/send` with `{ peekId, channel: 'sms' | 'email', destination, message }`. Server uses Twilio or Resend to send.

### `atelier/app/api/share/send/route.ts`

POST handler. Requires Clerk auth (curator). Validates input. Looks up peek, asserts curator. Routes to either Resend (email) or Twilio (sms) — Twilio integration may not be wired yet; if `TWILIO_ACCOUNT_SID` is missing, return `{ error: 'sms_not_configured' }` and the UI falls back. Records an `events` row `kind: 'share_send'`.

### `atelier/lib/email/templates/peek-published.tsx`

A simple React-Email template (no need to pull in `@react-email/components` — just plain JSX rendered server-side via Resend's React support). Subject line + body with the share URL + a few "what to do next" lines in the witty-best-friend tone.

### `atelier/lib/email/send.ts`

Wrapper around Resend SDK. Validates `RESEND_API_KEY` exists; if not, returns `{ ok: false, error: 'email_not_configured' }`. Sends from `env.NOTIFICATIONS_FROM`.

### `atelier/app/build/[peekId]/publish/share/page.tsx`

Server component. Loads the peek (must be `status: 'published'`, else redirect back to checkout flow). Renders `<ShareSheet peekDraft={...} />`. Also fires a one-shot Resend confirmation email to the curator on first hit (idempotent via an `events` row check — don't double-send).

## Constraints

- TS strict. No `any`.
- Mobile-first share UI (native `navigator.share()` first, fallback to platform-specific deep links).
- OG endpoint must work for unpublished peeks too (renders a generic peek.gift card) — never 500 on missing peek.
- Resend's React rendering requires `@types/react` to be set; it should already be from packet 01.
- Do not modify any file outside the target paths. **Exception**: `app/g/[slug]/page.tsx` — only add the `generateMetadata` export to it (created by packet 14). If 14 hasn't merged yet, create the file with just the metadata export and a `// TODO: packet 14 owns the body` line that's deleted at integration.
- No narrative comments in the body. Log any necessary ones to `_packets/COMMENTS.md`. (The "TODO: packet 14" pointer above is allowed and logged.)

## Reply format

Branch `claude/packet-16-share-og`, commit `packet 16: share + OG + email`, push. NOTES.md for any quirks (especially the metadata co-existence with packet 14).

Worker briefing (always apply): workspace check, code only, ambiguities in NOTES.md, minimal reply.
