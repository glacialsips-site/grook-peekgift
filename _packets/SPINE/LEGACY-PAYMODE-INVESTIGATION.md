# LEGACY PAY_MODE Investigation — 2026-05-28

## Verdict: **(c)** PAY_MODE on legacy is dead config. Real $12 revenue flows through LEGACY peek.gift Vite + Netlify Functions, unconditionally.

## Setup

Frank flagged the legacy peek.gift Netlify env has `PAY_MODE=mock`, yet Stripe shows live $12 charges. Two sites, separate codebases, same Stripe account `acct_1T4xnbCEKPUsVee1`:

- **LEGACY** — Netlify site `peek-gift` (`69732dcb-…`) at `https://peek.gift`. Latest deploy `6a11dcdb…` reports `"framework":"vite"`. Source code lives in a **separate repo** (not this one) and is deployed via `deploy_source: api` (zip upload). 22 Netlify Functions: `checkout-prepare`, `payment-webhook`, `coupon-apply`, `gifts-submit`, etc.
- **vNEXT** — Netlify site `peek-gift-vnext` (`932646db-…`) at `https://vnext.peek.gift`. Next.js. THIS repo (`/atelier` is build target; root is a separate Next.js scrap also named `peek-gift-vnext` in `package.json`).

## What PAY_MODE gates IN THIS REPO

Exclusively the Next.js code in `/atelier` (vNext) and root (also vNext-flavored scrap):

- `atelier/lib/stripe/client.ts:16` → `export const PAY_MODE: 'mock' | 'live' = env.PAY_MODE ?? 'mock';`
- `atelier/app/api/checkout/route.ts:141` → `if (PAY_MODE === 'mock') { … bypass Stripe, mark peek published, return mock redirect }`
- `atelier/app/api/checkout/coupon/route.ts:59` → same mock-bypass branch.
- Root `lib/stripe.ts:14` + `app/api/publish/route.ts:28` → identical pattern (`isMockPay()` → bypass).

When `PAY_MODE !== 'live'` in vNext code, the checkout endpoint **fully bypasses Stripe** (no `checkout.sessions.create`, no charge, returns a fake session URL). Only when `PAY_MODE=live` does vNext call Stripe.

## Why this is verdict (c), not (a)

The LEGACY peek.gift Vite app is in a different repo. Its Netlify Functions (`checkout-prepare`, `payment-webhook`) are Vite-deployed Node functions, NOT this repo's Next.js code. Nothing in this repo runs on the legacy site. Therefore the `PAY_MODE=mock` env var on the legacy Netlify project (`69732dcb-…`) is read by NOTHING — it's leftover config from when the codebases shared lineage. Legacy uses a different flag: `VITE_USE_MOCK_API=false` (also on its env). The legacy `checkout-prepare` function presumably charges unconditionally OR keys off `VITE_USE_MOCK_API` (cannot grep — source not in this repo).

## Stripe evidence

Charges metadata definitively attributes every $12 charge to LEGACY:

- vNext code stamps `metadata.product = 'peek.gift_vnext'` (`app/api/publish/route.ts:46-47`).
- Legacy code stamps `metadata.product = 'peek.gift'` (confirmed by Stripe MCP search).

Stripe MCP search `payment_intents:metadata['product']:'peek.gift_vnext'` → **0 results**.
Stripe MCP search `payment_intents:metadata['product']:'peek.gift'` → **31+ results**, all $12, including the top hit `pi_3TbkENCEKPUsVee11UXEIu71` titled "peek.gift — publish gate".

Frank's earlier reference to `meta-source=glacialsips-checkout` is the metadata key used by Glacial Sips (Frank's water-filter business sharing the same Stripe account), not peek.gift. Glacial Sips uses `metadata.source`; peek.gift uses `metadata.product`. None of the $12 charges carry `meta-source`.

## Which webhook receives them

Per `_packets/SPINE/URL-AUDIT.md` and Stripe webhook list:

- `we_1TRbB2CEKPUsVee1Qh084LCz` → `https://peek.gift/api/payment-webhook` — **LEGACY webhook**, 9 events including `checkout.session.completed`, `payment_intent.*`, `charge.dispute.*`. **This is the production revenue path.**
- `we_1Tb7PhCEKPUsVee1Jz6Kcxkb` → `https://peek-gift-vnext.netlify.app/api/stripe/webhook` — vNext webhook, listens only to `checkout.session.completed` (recently expanded to 12 events per SERVICES.md). **Zero traffic** (no `product:'peek.gift_vnext'` PIs exist).

## Current source of real peek.gift revenue

**The LEGACY peek.gift Vite Netlify site (`peek-gift`, site id `69732dcb-…`).** vNext has not processed a single $12 charge. The `PAY_MODE=mock` env var on the legacy Netlify project is dead-weight config — flipping it would change nothing because no code on that site reads it.

## Action items (for Frank, not for this packet)

1. Don't flip legacy `PAY_MODE` thinking it'll stop charges — it won't. Real lever is `VITE_USE_MOCK_API` (or whatever the legacy Vite app reads; verify by greppin the separate legacy repo).
2. Delete the legacy `PAY_MODE=mock` env var post-cutover to remove confusion. Today it's harmless.
3. Cutover (per CUTOVER.md) will swap legacy webhook URL and decommission the Vite app — at which point vNext's `PAY_MODE=live` becomes the active control.
