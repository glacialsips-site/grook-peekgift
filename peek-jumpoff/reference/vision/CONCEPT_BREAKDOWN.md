# peek.gift — Chat-Driven Gift Builder
### Concept Breakdown

---

## 1. Core Concept

- **The problem** — every existing way to give a gift is a compromise:
  - Sending random stuff from Amazon
  - Picking *the* specific item and getting it slightly wrong
  - Gift card = you've handed someone an errand
  - Hallmark card + cash + scratch-off = effort theater, zero personalization
- **The product** — a custom gift *page* (a slug) built conversationally and sent to a recipient
  - Personal — the curator visibly *made* something
  - Fun — built-in teasing / play (see §6 Rules)
  - Optionally collaborative (see §7)
  - Reduces waste — recipient confirms the exact choice instead of you guessing
- **Two roles**
  - **Curator(s)** — builds the page through chat
  - **Recipient** — receives the link, makes selections within curator-set rules

---

## 2. The Chat Layer (UI)

- **Platform** — mobile-first, must also work clean on desktop
- **Familiarity** — mirror the Claude app paradigm so it's instantly intuitive:
  - Text keyboard + chat area
  - Microphone → voice input
  - `+` attachment menu →
    - Images
    - Camera
    - Files
- **Page framing** — chat sits on a webpage with a preface/intro above it
  - Hero imagery / video to be supplied later (Frank provides)
- **Auth** — account creation popup
  - Likely deferred: soft nudge first → hard requirement gated by workflow logic (see §11 flags)

---

## 3. The Engine Behind the Chat

- It's a **real Anthropic API model** (Sonnet or Opus), not a dumbed-down bot
  - Sonnet is almost certainly enough here — same capability, just less heavy reasoning
- **The key realization** (and why this matters):
  - Original assumption → API = chat only, so code had to carry everything → led to over-building
  - Actual reality → the instance can *drive the whole flow*
  - What the in-site instance actually needs:
    - A clean version of this concept
    - Templates
    - Guidelines
    - A success metric (see §10)
  - Net effect → the architecture can get dramatically leaner

---

## 4. Curator Workflow (the build)

- Land → preface screen → (auth nudge) → chat
- Chat collects inputs via:
  - Text
  - Images
  - Voice
- Output → a custom slug to send to the recipient

---

## 5. The Gift Page (Slug) — Output Structure

- **General template** that morphs based on curator inputs
- **Hero image**
- **Hero text fields**
  - Recipient
  - Curator(s)
  - Occasion
  - Personal note
- **Item cards**
- **Theming** morphs *radically* by context — the spectrum is the point:
  - Princess-themed haul for a niece
  - ↔ Cash-pile / bachelor-party run-up for a 30-yr-old groom

---

## 6. The Rules / Selection Engine

- Curator defines **how the recipient is allowed to choose**
- Worked example:
  - 3 shoe options → recipient picks **one**
  - 2 dinner options → recipient picks **one**
  - 1 absurd item (the Ferrari) → just for fun
- Constraint styles are curator-set and playful:
  - "One pair of shoes + one dinner."
  - "You can pick *everything*… unless you spend an afternoon with the curator."
- **Purpose** — fun + teasing + avoids buying the slightly-wrong thing

---

## 7. Collaboration

- Invite other users to add items
- Combines pages built by each collaborator into one
- Hero locked by the creator
  - *TBD — could be made more flexible*

---

## 8. Suggested Items

- Prepopulated "suggested item" cards
- Relevance driven by curator inputs
- Tie to affiliate merchants
  - *None exist yet — context only, not a priority*

---

## 9. Social Media Tie-In

- Plugin already in hand — to experiment with later
- Likely surfaces at recipient-selection moments
  - *Touchpoints TBD*

---

## 10. Success Metric (for the in-site instance)

- Get the human to the **checkout / money button** as fast as possible **without losing them**
- Make the page look **REALLY** good
- Checkout bolts on (Frank already has it)

---

## 11. Stack / Vendors

- **Staged today** — Clerk · Anthropic · Supabase · Browserbase · ZenRows · Gmail · Resend · Stripe · Netlify · Git
- **Want to add** — SEO/GA4 · image gen · SMS · etc.

---

## Open Threads & Ideas (my flags)

- **The biggest unlock — make the chat the *interface*, not the *source of truth*.** The instance drives the conversation and *emits a structured page model* (JSON: hero fields, item cards, rules). Deterministic code renders, persists, and prices it. This keeps the magic in the chat while the page state stays robust and auditable — and it's exactly why the over-built complexity can be retired without losing anything.
- **Image gen is a natural fit for the hero.** The "morphs radically" requirement (princess ↔ bachelor party) is cheap and bespoke if a generated hero image is part of the page model. Strong differentiator vs. stock.
- **Treat the Rules engine as first-class data, not chat-improvised text.** Model the constraint types explicitly — `pick N of M`, `unlock-on-condition`, `free-for-all` — so the recipient view enforces them reliably. This is the genuinely novel, defensible core of the product.
- **Watch the tension inside the success metric.** "Get to checkout fast" can fight "make it personal / really good." The instance needs a guardrail so it doesn't speedrun past the personal note + theming — that's the part that makes this worth more than a gift card.
- **Deferred auth is the right call** and lines up with the friction model already in play: let value accrue (page taking shape) before the auth wall, then the purchase wall.
