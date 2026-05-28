# peek.gift — vNext

Chat-driven gift-page builder. Curator chats with "Peek" (Claude), and a beautifully-themed
single-recipient gift page builds in real time alongside the conversation. Recipient picks
from product / activity / aspirational / digital cards, with sender-defined rules
(pick-one-of, beg-to-unlock, decorative-taunt, etc.).

## Stack
- Next.js 15 App Router on Netlify
- Anthropic Claude (chat brain w/ tool use)
- Clerk (auth — shares the existing prod app's user pool)
- Supabase Postgres (isolated schema: `peek_v2`)
- Supabase Storage (bucket: `peek-v2-assets`)
- Stripe (LIVE mode only — gated by `PAY_MODE=mock|live`)
- Resend (transactional email)
- Browserbase + ZenRows (URL → card scrape)

## Isolation from existing peek.gift
- Separate Netlify site (`peek-gift-vnext`)
- Separate Postgres schema (`peek_v2`)
- Separate Storage bucket (`peek-v2-assets`)
- Separate Stripe product (`prod_UZzXnuYuX4ud15` / `price_1TapZICEKPUsVee1ddG4n14M`)
- Same Clerk app (intentional — one identity across both)

Rollback = ignore this site / drop the `peek_v2` schema. Nothing in the legacy build is touched.
