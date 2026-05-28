# ROADMAP — peek.gift after batch 3

Once packets 20–26 land, the **product is feature-complete for an MVP**: chat-driven build, picks, checkout, share/OG, recipient view, group co-curation primitives, affiliate revenue, analytics, background jobs. That doesn't mean the project is done. This file is the plan for everything that happens after.

Update as we go. Phases are sequential by default; some items can run in parallel.

---

## Phase A — Hardening (after batch 3 lands, before any real user touches it)

Everything here is required before inviting even one real curator.

| # | Item | Type | Notes |
|---|---|---|---|
| A1 | **Live $12 payment smoke test** | manual | Curator account → publish a real Peek → pay $12 live → confirm webhook flips status → confirm Resend email lands. End-to-end. |
| A2 | **Lighthouse pass** | packet | Mobile + desktop scores; fix anything red. SEO + a11y especially. |
| A3 | **Sentry re-add (packet 08)** | packet | Server + client + tunnel route + Netlify env wiring. |
| A4 | **Security review** | packet | Cross-check OWASP top 10. Specifically: HMAC validation on every webhook, server-only imports respected, no service-role key leaks, rate-limit confirmed. |
| A5 | **Rate limiting via Upstash Redis** | packet | Per-IP + per-user metering on `/api/chat`, `/api/upload`, `/api/scrape`. We added the Upstash dep in packet 01 but never wired it. |
| A6 | **Error-state UX audit** | packet | Every failure path renders something the user understands (chat 500 → toast, image upload too-large → inline note, Stripe declined → useful message, etc.). |
| A7 | **Decommission plan for legacy peek.gift Vite site** | doc + ops | When ready: domain swap, redirects, drop legacy Supabase JWTs. STATE.md has the 5-step cutover. |

## Phase B — Beta (small invited audience, you in the loop)

Invite 50-100 friends/family. Watch every chat session. Iterate fast.

| # | Item | Type | Notes |
|---|---|---|---|
| B1 | **Read every Peek built** | manual | First 50 Peeks, you read the full chat log + the published page. Note what felt natural, what felt forced. |
| B2 | **System-prompt iteration** | packet, weekly | Based on real conversations: tighten the Peek persona, add anti-patterns to the system prompt, evolve tool descriptions. Small commits, big leverage. |
| B3 | **A/B test the chat opening line** | packet | PostHog feature flag → 2-3 variants. Track time-to-first-card-added. |
| B4 | **A/B test pricing** | packet | $12 vs $9 vs $15. PostHog flag controls `STRIPE_PRICE_ID` per cohort. (Need to create the alternate prices in Stripe Dashboard.) |
| B5 | **Cost-per-Peek dashboard** | packet | PostHog LLM observability already logs Anthropic spend per turn. Join with `picks` + `affiliate_revenue` to see Peek-level economics. |
| B6 | **Onboarding refinement** | packet | Watch where the chat stalls. Pre-populate vibes via "did Peek nail it?" thumbs. |
| B7 | **Customer-support inbox** | packet | `support@peek.gift` → Gmail label → Resend reply templates. Maybe just Gmail thread search initially. |
| B8 | **Abuse / safety** | packet | Banned-content filter on hero images (vision call), spam-account detection, refund flow. |

## Phase C — Public launch + growth

Once beta is humming. Open the doors. Drive traffic.

| # | Item | Type | Notes |
|---|---|---|---|
| C1 | **TikTok / IG content from your end** | manual + asset gen | First wave of organic. Each post links to peek.gift with creator-tracked UTM (Tolt/Rewardful flag your own clicks). |
| C2 | **Pinterest API integration** | packet | Pin every published Peek (or a curated sample) to a peek.gift business board. Gift-adjacent traffic goldmine almost nobody's exploited. |
| C3 | **Creator affiliate program live** | packet + manual | Tolt or Rewardful integrated with Stripe Connect. Onboard first 20 creators (gift bloggers, IG family/lifestyle accounts). Custom referral links. |
| C4 | **Generative UI** | packet | Claude artifacts pattern — let the LLM emit typed components (`<GiftCard>`, `<Comparison>`, `<RecipientProfile>`) that the client renders. Same chat, dramatically different feel per conversation. Unblocks a new visual identity. |
| C5 | **SEO landing pages** | packet | "Best gifts for [occasion + relationship]" matrix. Programmatic; generated from real Peeks (anonymized). 100s of pages. |
| C6 | **Lifecycle email sequences** | packet | Resend triggers via PostHog events: cart abandonment, "Peek opened" → curator nudge, recipient finalize confirmation, monthly digest. |
| C7 | **Browser extension** | packet | "Save this product from any retailer" → adds to a Peek wishlist. Chrome + Safari + Firefox. Distribution moat. |
| C8 | **Public OG / share-card polish** | packet | Per-recipient social cards across X / IG / iMessage / WhatsApp. Test against Twitter Card Validator. |
| C9 | **Stripe Tax registrations** | manual | NJ done. Add registrations where we ship volume. |

## Phase D — Scale features

When growth is real and you have data to prioritize.

| # | Item | Type | Notes |
|---|---|---|---|
| D1 | **Voice notes on Peek page** | packet | Browser MediaRecorder → 10-second voice from curator → plays on recipient page. Trivial; emotional payoff huge. |
| D2 | **International payment methods** | packet | Klarna, iDEAL, Bancontact, Alipay, WeChat Pay, PIX, UPI, Konbini. Stripe supports — we just need to enable + test. Each adds 1-5% conversion in its region. |
| D3 | **i18n** | packet | `next-intl`. Start with EN + ES + JA + DE. Translate the system prompt with care (vibe is culture-specific). |
| D4 | **Group Peek payment split** | packet | Today organizer pays the full $12. Add a "split with co-curators" toggle that creates a Stripe Connect-style split. |
| D5 | **Auto-fulfillment (T2)** | packet | When recipient picks, we order on behalf of the giver. Captures full affiliate + a markup. Per-retailer adapters required; start with Amazon + 5 Shopify shops. |
| D6 | **Mobile PWA polish** | packet | Installable, push notifications, offline cart. Stop short of native. |
| D7 | **Admin dashboard** | packet | See all Peeks, ban abusive ones, manual refunds, watch live chats. You-facing. |
| D8 | **Memory across sessions** | packet | Anthropic Memory tool: Peek remembers each user's relationships, preferences. Compounds every interaction. |
| D9 | **Reveal-experience polish** | packet | Wedding-RSVP-grade unveil. Music, animation choreography, drumroll on the gag card. The TikTok moment. |

## Phase E — Compliance + operations (continuous)

| # | Item | Notes |
|---|---|---|
| E1 | **GDPR data tools** | export, delete, portability endpoints. Quietly built ahead of needing them. |
| E2 | **Age gate** | recipient is who? if site is "personal gifts" we're fine. Confirm with counsel. |
| E3 | **Terms of Service + Privacy** | drafted, reviewed, displayed on every page footer. |
| E4 | **Refund / cancellation flow** | sender requests refund pre-recipient-pick → easy. Post-pick → harder. Document policy. |
| E5 | **Vendor cost dashboard** | Anthropic + Stripe fees + fal.ai + Upstash + Browserbase + PostHog + Netlify rolled up monthly. Watch unit economics. |
| E6 | **Backups** | Supabase has PITR on Pro; verify enabled. Confirm storage backup. |
| E7 | **Incident runbook** | what to do when peek.gift goes down. Sentry alerts → PagerDuty or just SMS. |

---

## When this file is touched

- Orchestrator: after every batch lands, re-check Phase A items; promote completed → struck through.
- Anyone: feel free to add items in any phase; mark as "drafted" until orchestrator decides which packet number it gets.

## Open product questions (not yet answered)

- Voice notes — in MVP or D phase? (Currently D.)
- Sora 2 / Veo for auto-generated reels — wait for API maturity or build now?
- Group Peek payment model — organizer-pays default; split-the-bill optional later — confirmed in STATE.
- Anonymous metering threshold — currently 5 turns then signup; tune in B3.
