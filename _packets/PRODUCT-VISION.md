# PRODUCT-VISION

_Source of truth on what peek.gift actually IS. Frank's own words, dropped raw on 2026-05-26. He flagged it as "dated, hackneyed, and incomplete" — so future chats: this is canonical but not exhaustive. When in doubt, ask Frank, don't fill in._

## The problem

> Let's say I want to get you a fuckin whatever birthday present. You've mentioned a few things, I have some ideas of what you like, I'd love to do something special with you in person too, I also want to bust your chops. I don't want to send you a fuckin Amazon box with something that was kinda what you wanted but is actually a waste of money because it wasn't the right thing and you don't want to hurt my feelings so you don't say anything. It just sucks — the money got spent, the intent and heart was there, but it didn't land right.

## The thing peek.gift is

A sender sends a recipient a LINK. The link opens a personalized page. On the page:

- Hero image (uploaded by sender, or described and generated, or scraped — see "Hero image" below)
- Sender + recipient names, occasion, personal note (markdown)
- A set of **item cards** — image + description + optional hidden-or-visible $ value. **No retailer branding visible.** The cards feel like the sender's gift, not Amazon's wishlist.
- The whole page is **stylized to match vibe + occasion + recipient age/gender + sender's intent**.
- The recipient picks from the cards under rules the sender set.

## Card types

- **Real product**, with variants: "this vintage t-shirt has 4 options, I don't know which one you'd want, so I'm putting all 4 — pick whichever, or beg for two."
- **Activity**: "let's do this thing together on [date / TBD]" — its own image, description, optional hidden value.
- **Aspirational**: "those designer shoes I know you want." Could be locked behind a beg / negotiation.
- **Gag / busting balls**: "I'm putting a Ferrari in here too" or "HA YEAH RIGHT, did you really think that was gonna happen?" — joke cards.

## The rules engine ("really fuck with you")

Sender can set per-card or per-group:

- **pick_one** within a variant group (the 4 t-shirt options — pick one)
- **pick_all** within a group (must take all)
- **Locked / off-limits** cards with sender-defined refusal copy
- **Beg** flow: recipient has to message back to unlock (e.g. "I really wanted to get you that t-shirt so you have to ping me to ask for it")
- **Hidden / visible value** per card

## Why this exists

- Make gift giving real again
- Cull the money wasted on missed gifts
- Obliterate gift cards and ecards
- Heavy social media aspect (later)
- Group participation aspect (later)
- The **site itself becomes the surprise** — the gift moment is opening the link and seeing the curated page, not unwrapping the wrong shit later

## How the sender builds it (chat-first)

User lands on /build. **"Peek"** (the chat agent — see lib/anthropic/system-prompt.ts for current persona) initiates:

> "Hey, we're going to set up this website. I need some info to do it — who is it for and what's the occasion?"

As info rolls in, the preview pane (always visible, mobile-first) builds the site in real time behind / beside the chat.

> "OK great, I can really customize this page. Send me a pic that's meaningful to your relationship, or if you want, just describe a background you want and I'll grab something for you."

Then:

> "Alright, let's pick out the stuff you want. We can do this a couple ways — do you already know what you want? Give me the links or screenshots. Or if you want to do something custom that isn't from a website, just tell me and give me a pic or whatever."

The model breaks this up into multiple chat turns; the description above is the general flow, not literal copy.

## Auth

- Anon users can hit chat for ~1-2 turns before being nudged to sign up. Code must be agnostic so this threshold can be adjusted later.
- After sign-up (Clerk, prod instance, custom forms reskinned with no Clerk branding visible) → land back at `/build` and continue.

## Pricing + fulfillment tiers

- **Tier 1 (current)**: sender gets an email listing what the recipient picked. Sender takes it from there. **$12** per peek — a made-up number, currently pushed via Instagram with a heavy discount. Volume > margin until the math says otherwise.
  - **Test coupon `THISISTHEONE`** drops to $0.50 for any test runs.
  - **DO NOT do real $12 charges for testing.** Frank's card is also locked due to fraud right now.
- **Tier 2 (later, backburner)**: auto-order fulfillment.
- **Tier 3 (later, much further out)**: Frank or a service physically receives the items and assembles them into a cohesive gift basket.

## Recipient page (`/g/[slug]`)

A regurgitation of the sender's preview. Cinematic reveal, then cards exposed under the rules. Picks update the page live; sender gets notified.

## Hero image

When the sender describes a background, Peek can:
- Generate via fal.ai (Flux) — the current `generate_hero_image` tool
- Scrape from a URL via Browserbase / ZenRows — `set_hero_image` with a URL
- Accept direct upload — `/api/upload`

(Open question: order of preference when ambiguous? — see "Open questions" below.)

## What's NOT in scope right now

- Real $12 charges in testing (use coupon)
- Auto-fulfillment (Tier 2)
- Physical basket assembly (Tier 3)
- Multi-curator group co-curation (planned, not built)
- Social outbound (Pinterest, IG, TikTok auto-posting — planned)
- International payment methods (Klarna, etc. — later)
- Voice notes on Peek page (later)

## Open questions (Frank: weigh in when you have a sec)

1. **Site stylization scope.** "Stylized to match vibe + occasion + recipient age/gender + tone." The current code has a vibe engine that swaps palette + tone (warm/cool/playful etc.) + motion preset. Does "stylized" mean that level — primary color + accent + a couple motion knobs — or do you want more dramatic per-peek variation (different fonts, different layouts, different card shapes)?

2. **Peek's voice.** The chat agent IS the product. There's an existing 530-word system prompt (per STATE batch 1). Do you have 3-4 example phrasings you'd want Peek to nail — e.g. how it opens the first turn, how it asks about recipient, how it busts the sender's chops, how it confirms "got it, building." A "Peek would say X, would never say Y" list — even 5 lines — would shape every model interaction.

3. **Locked cards / beg flow UX.** When a recipient hits a locked or beg-required card, what does it actually do? Modal sheet? Inline prompt? Does the sender get notified live (push? email?) or via digest?

4. **Anon → signup nudge voice.** When a fresh visitor hits 1-2 turns and we cut them off, is the cut-off voice Peek ("yo, save this so I don't lose your work, gimme 30 sec") or system ("Sign in to continue")?

---

_If you read this and your reaction is "no, that's not quite right" — say so. This document is meant to be edited, not enshrined._
