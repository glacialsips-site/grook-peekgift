# Landing Page — Research + Brief Prep

_Source: Hercules research sub (Opus 4.8). Audience: Instagram-scrolling gift-giver, mostly mobile. Goal: Stripe conversions. Constraint: plain CSS vars + CSS Modules._

## 1. The hero — three concepts, ranked

### Concept A — "Chat-as-hero" (CONVICTION: HIGH)
- **Headline:** "Build them a page, not a guess."
- **Sub:** "Tell us who it's for. We'll build the site together in chat."
- **CTA:** "Start the page" (live in fake chat textarea — Enter submits and routes into the real chat)
- **Visual:** Phone-shaped frame. Real-looking chat textarea with pulsing cursor and rotating placeholder ("My niece Lila's 7th… my best friend's bachelorette… my dad's 70th…"). Behind the textarea, a half-visible peek page renders progressively. Vibe cycles every 6–8s (princess → bachelor → luxe), proving the grammar's range without a separate gallery section.
- **Why:** Combines the v0/lovable input-as-hero pattern with the showpiece grammar. The textarea functions as both visual proof AND conversion CTA.

### Concept B — "Reveal-as-hero" (CONVICTION: MEDIUM-HIGH)
- **Headline:** "The gift they actually wanted."
- **Sub:** "Custom gift pages built in chat. Sent in a link."
- **CTA:** "Make one"
- **Visual:** Full-bleed silent loop of a recipient opening a peek on a phone — the cinematic reveal — with hand, link tap, blur clearing, name typewriter, cards dealing in.
- **Risk:** hides the curator role; viewer might think this is a digital greeting card, not a builder.

### Concept C — "Wall-of-peeks-as-hero" (CONVICTION: LOW — reject unless A/B)
- Marquee/parallax grid of 9–12 real peek thumbnails as hero. Pulls focus from prompt; user has to assemble "I could make one of these" mentally.

**Recommendation: ship A.** B as an animated layer triggered when page idle for 4s (textarea morphs into a 6-second reveal vignette, then back).

## 2. The proof — show, don't tell

Strongest proof = **live mini-renderer wall** below hero, built on the SAME renderer (one-renderer invariant). 6–9 real mini-peeks in their actual vibes, each in a phone-shaped frame, horizontally-scrolling marquee on mobile / 3-up grid on desktop. Each tappable → opens full-screen read-only preview.

Beats video (shows ONE example). Beats static screenshots (real DOM rendered by real renderer; can't drift). Maintenance cost ≈ zero.

Pair with **one** subhead: "No two peeks look the same. The page paints itself around the human."

## 3. Sections below the hero

1. Hero with prompt input + idle-reveal animation
2. The peek wall (6–9 mini-peeks)
3. The 3-step strip — "Chat → publish → they pick." Three icon-free vertical cards, one sentence each.
4. The recipient moment — cinematic reveal full-bleed: "What they see when they tap the link."
5. The price line, alone — "$12 to publish and send. Free to build and undo."
6. The CTA repeat — second prompt textarea, identical to hero.
7. Tiny footer — legal, contact, "made by humans in NJ."

**Cut:** testimonials (no users yet — fake = death), feature grid (anti-grammar), FAQ accordion, "trusted by" logos.

## 4. The CTA path

**Guest mode all the way to publish-paywall.** Drop directly into `/build` with a fresh guest peek-id in a cookie. NO interstitial occasion picker — Peek asks in turn 1, captures occasion + recipient_kind structured-extracted as a tool call.

| Step | Surface | Data captured |
|---|---|---|
| Hero prompt typed | landing/page.tsx | `landing.prompt_seeded` |
| Click "Start the page" | /build (guest) | `build.guest_started` + PostHog session start |
| Turn 1 reply to Peek | chat loop | `chat.turn1_replied` (occasion + recipient_kind) |
| Page → `ready_for_publish` | renderer state | `peek.ready_for_publish` (vibe, section count) |
| Publish modal opens | publish gate | `publish.modal_opened` |
| Stripe Payment Element submitted | Stripe | `publish.payment_succeeded` |

Auth silent. Mint recipient-session cookie in proxy middleware. Clerk only triggers if user actively wants account recovery or returns. **Defer signup gate until user has invested ≥1 page of work.**

## 5. Mobile-first

Above-fold on 390×844: headline (2 lines max), 1-line sub, chat textarea (~88px), CTA underneath (44px+ tap target). Everything else below fold.

- **Cut on mobile:** soft pulse glows (replace with single solid wash), secondary buttons
- **Scale:** headline 38–44px clamp, full-width textarea (16px+ font for iOS no-zoom), full-width CTA
- **Reflow:** peek wall = horizontal swipe marquee on mobile w/ scroll-snap, 3-up grid ≥768px
- **`100dvh` not `100vh`** (STACK-LOCK rule; Safari address bar)

## 6. Conversion psychology — peers (cited)

- **v0.app** — "What do you want to create?" + giant input as hero. Prompt IS CTA.
- **Lovable** — "Build something Lovable" + chat-textarea hero that deploys live.
- **Bolt** — "What will you build today?" + embedded prompt + design-system swap as variety proof.
- **Partiful** — "Parties are back" + one big CTA + "100k+ ratings" tucked in hero. Categorical-tagline brevity ✓; skip social proof (we have none).
- **Cameo** — category-tile grid as hero. Wrong shape for us (users come knowing a person, not category).
- **Paperless Post** — proves premium via licensed designers (Oscar de la Renta, Rifle Paper). We can't borrow that; we prove premium via the grammar producing visibly-designed pages.
- **Greetabl** — "Greetabl makes gifting easy!" — "easy" is the weakest possible promise; avoid that energy.
- **withJoy** — "Create a wedding website and registry that is uniquely yours." DOESN'T show other couples' sites side-by-side (misses variety proof). We won't.

**Translates:** prompt-as-hero, category-defining headline brevity, one-renderer proof wall. **Doesn't:** designer logos, "trusted by," founder-story video, testimonial slabs.

Benchmark: cold Instagram avg 1.5–3% CVR. Realistic v1 floor: **2% landing → /build, 8–12% /build → publish-attempt, 60–75% attempt → paid.**

## 7. Vibe-engine flex

**Yes, flex the grammar on landing.** Two places:
1. Hero idle-state background peek cycles vibe every 6–8s (princess → bachelor → luxe + new presets when grammar-preset library lands).
2. Peek wall renders each card in its real vibe via real `--vibe-*` tokens.

**Do NOT** shift the landing's OWN chrome (header, footer, body type) between vibes. Confusing; weakens the "make YOURS" implicit ownership. Landing frame = neutral, calm, ink-on-cream. The frame *contains* varied vibes; the frame doesn't BE one.

Risk accepted: 0.5s repaint flash if vibe cycle hits during initial paint. Mitigated by inlining the first vibe.

## 8. Anti-patterns

- No corporate stock photos of "happy diverse group laughing at phone"
- No "Trusted by" or "As seen in" logo row
- No animated "scroll for more" chevron
- No newsletter capture (no list practice, no welcome series, no reason)
- No live chat widget (product IS chat; support widget muddies metaphor)
- No cookie banner unless legally required (geo-detect later)
- No video testimonials, founder-story section, press logos
- No "watch demo" modal (the hero IS the demo)
- No counter showing "X peeks built today" until X > 1000
- No dark/light toggle
- No Tailwind utility-pile

---

## Relevant paths for the build brief

- `atelier/app/page.tsx` — current landing entry (Tailwind, raze)
- `atelier/components/landing/*.tsx` — scaffold (also Tailwind, raze)
- `atelier/components/renderer/` — embed for peek wall
- `atelier/scripts/proof-out/{princess,bachelor,luxe}.html` — three SSR vibes to seed hero cycle
- `atelier/lib/vibe/grammar/fixtures.ts` — vibe seeds for peek wall
- `_packets/SPINE/STACK-LOCK.md` — styling contract
