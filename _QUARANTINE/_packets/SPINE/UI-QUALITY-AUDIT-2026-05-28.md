# UI quality audit vs north star — 2026-05-28

**North star (HANDOFF-NEXT-FRAME.md):** "any moron from Instagram can build a shockingly good custom website in 5 minutes."

**Verdict:** Frank's "bland" complaint is correct, but deeper than CSS vars. Vibe engine plumbing is real on the recipient surface (palette + radius + font-family). It's missing on every other surface (chat, build, auth). Where it *is* wired, the dial only moves colors and fonts — not type scale, leading, tracking, layout proportion, mood embellishments, button language. Result: "Tailwind admin dashboard with a recolored hero."

The four post-batch peek pages (`editorial`, `playful`, `princess`, `toy`) all 500 (digest `3668081153`) — identical "We couldn't open this Peek" fallback. Could NOT compare four vibes live; vibe distinctness unverifiable end-to-end right now. Mobile screenshots captured ONE real recipient surface (Sam / birthday / peach-pink-violet hero) — the only "vibe IS the page" evidence in the set.

Sources: post-batch-deploy + mobile screenshot sets; `atelier/components/{recipient/*, build/chat-pane.tsx, auth/auth-card.tsx, peek-vibe-provider.tsx}`; `atelier/lib/vibe/css-vars.ts`; `atelier/app/layout.tsx`; `_packets/SPINE/skills/vibe-direction.md`.

---

## Per surface

### Landing (`/`) — STRONG

`landing--1280x800.png` is the only surface that already feels like a brand. Serif "Gift giving, **made real.**" with a red accent break is real typography (Playfair or Fraunces, not Inter). The three-card vibe-demo block ("For our favorite princess" pink / "The 50th send-off" dark / "For Pop, at 70" warm tan) is the single best argument the vibe engine CAN produce distinct visuals.

Where it dips: the four-up "Not a wishlist. Not a card." mid-section is shadcn-default — black icon, sans bold, hairline border, equal-padding cards. Reads as Linear-Vercel template. Body copy is `text-muted-foreground` grey-on-white, the kind that "almost doesn't exist." Mobile compresses correctly.

This page is the floor for the rest of the product, and the rest of the product doesn't clear it.

### Build chat (`/build`) — BLAND CONFIRMED

`mobile/build-surface--375x812.png` is the smoking gun:

- User bubble: black pill (`bg-primary text-primary-foreground`)
- Peek bubble: light-grey pill (`bg-muted text-foreground`)
- "P" avatar: light-grey circle, serif "P" — only personality on page
- Composer: hairline input "describe a vibe or drop a photo", grey "Add image", grey disabled Send pill
- Live preview drawer: tiny strip at the bottom showing a *slice* of vibe-themed hero peeking through

The drawer IS vibe-themed (peach-pink gradient). The surrounding chat shell has zero vibe. Confirmed in code: `chat-pane.tsx` uses pure shadcn tokens (`bg-primary`, `bg-muted`, `bg-background`, `border-border`). None of the seven dials reach this surface. Chrome shouts "SaaS app"; the gift whispers from the bottom.

### Build preview drawer — VIBE WORKING (hidden)

`mobile/build--sheet-half.png` IS the vibe engine working: peach-pink-violet gradient hero, "Sam / birthday / FROM YOU" name block in serif, "$158 / $120 proposed" pricing chip in coral pill. Reads as personalized. Problem: it's a 40%-of-screen drawer, only visible after tapping "Live preview tap to expand". The vibe-themed surface is HIDDEN from the curator by default.

### Recipient view (`/g/[slug]`) — VIBE PARTIALLY WORKING

`mobile/recipient--375x812.png` is the one published vibe surface I could see:

- Hero gradient (peach → pink → violet) is good. Curated, not random.
- "Sam" rendered in `text-4xl font-semibold tracking-tight` (`hero.tsx:45`) — generic Inter weight-600, NOT the vibe display font. Font dial mapped but scale isn't.
- "birthday" subtitle is `text-base text-[...]/75`. Generic body sans, no italic / no caps / no editorial framing.
- "FROM ALEX" small uppercase tracked text — works.
- **"for Sam" overlay overlaps body copy "Happy birthday Sam, here to pick **one** of these — and ye[ah]". Z-index / positioning bug. Worst single visual issue in the set.**
- "GIFT" eyebrow + "Soft Cotton Hoodie" + "$68" card in a softly-rounded peach card. Vibe background works. Title is `font-semibold` Inter (not vibe display). Layout is generic e-commerce.
- "♥ Yes please" CTA is coral pill with heart icon. Works.

Recipient view is the one place vibe drives the canvas. But ~70% of visual identity comes from the hero gradient, ~30% from default Tailwind. Type system not vibe-driven. Layout proportion not vibe-driven. Density dial wired (`--peek-space-*`) but `recipient-view.tsx:161` hardcodes `gap-8 px-5 pb-32 pt-8` — Tailwind layout glue overrides density.

### Sign-in / sign-up — PURE SAAS TEMPLATE

`signin--*.png`, `signup--*.png` are interchangeable with any Clerk-template demo:

- "peek.gift" wordmark in `text-2xl font-semibold tracking-tight` Inter — same weight as the rest of the page. No brand color, no display font.
- "Make gift giving real again." in `text-sm text-muted-foreground` — invisible.
- Continue-with-Google button: generic white card + Google logo.
- **Continue / Create account button: SOLID GREY (`bg-muted`)** — reads as broken/disabled. Most damning detail. The primary CTA is greyed out by default (`custom-sign-in-form.tsx:283`: `className="h-11 bg-muted"` — intentional but reads as failed-state).
- Sign-in's email field has heavy dark stroke; sign-up's has hairline. Inconsistent.

Zero vibe expression. No relationship to the landing page. SaaS-template-ness signals "this isn't the gift product, this is the boring sign-up portal." Drop-off risk.

### Error fallbacks — SHADCN-DEFAULT

Build + recipient error templates are identical-feeling: centered heading + grey ref + black Try again + outlined Home. Even the error page is an opportunity to be on-brand (Vercel does this well).

---

## Where the vibe engine IS working

1. **Recipient hero gradient/palette** (`hero.tsx` consumes `--peek-bg/-ink/-accent`). Peach-pink-violet on Sam's page looks intentional.
2. **Recipient card backgrounds** — product card uses `bg-[hsl(var(--peek-accent))]/10` for eyebrow chip. Cards inherit accent.
3. **Recipient card radius** — every card has `borderRadius: 'var(--peek-radius-lg)'` (product/activity/aspirational/gag). Shape dial reaches cards.
4. **Recipient font-family** — `var(--peek-font-heading)` on card titles, `var(--peek-font-body)` on note. Font dial reaches titles.
5. **Build preview drawer slice** — bottom strip in `build-surface--*.png` IS vibe-themed.
6. **Landing demo cards** — three palettes side-by-side. Proof the engine CAN do dramatic divergence.

## Where the vibe engine is NOT visible enough

1. **Type scale is Tailwind, not vibe.** `hero.tsx:45` uses `text-4xl font-semibold tracking-tight sm:text-6xl`. Font-family swaps; size/weight/tracking don't. A "breathable editorial" wedding and a "compact whimsical" princess render the same heading dimensions. Radical-morph requires SCALE divergence, not just font swap.
2. **Density dead.** `--peek-space-*` is mapped but `recipient-view.tsx:161` hardcodes `gap-8 px-5 pb-32 pt-8`. Tailwind overrides density.
3. **Mood dead.** `--vibe-mood-grain` and `--vibe-mood-overlay` are computed but nothing in `components/recipient/*` consumes them. No grain, no confetti, no editorial column rhythm.
4. **Motion invisible.** Drives `framer-motion` duration only. No `lively`-only embellishment (sparkles, bounce-in, confetti). Currently degrades to "slightly faster or slower" — invisible in stills.
5. **Chat zero vibe.** `chat-pane.tsx` uses `bg-primary` / `bg-muted` — never `bg-[hsl(var(--peek-*))]`. User bubble could carry accent. Avatar could carry palette. Composer border could pull from accent. None of it happens.
6. **Auth zero vibe.** `auth-card.tsx` uses `bg-background`, `text-2xl font-semibold tracking-tight`. Wordmark is Inter weight-600. Could be Fraunces with accent. Isn't.
7. **Buttons shadcn-default.** `bg-primary` / `bg-muted` everywhere. `rounded-md` from default. Shape dial doesn't reach buttons outside recipient cards.
8. **Hero name overlap bug.** "for Sam" overlay collides with body copy. Z-index / absolute position broken.
9. **Display fonts missing.** `app/layout.tsx` loads Inter/Playfair/Fraunces/DMMono/Caveat/Cormorant. Vibe spec requires **Bowlby One** (princess + bachelor), **Anton** (bachelorette), **JetBrains Mono** (bachelor + roast). Without them, princess + bachelorette fall back to system display — why every vibe ends up Fraunces-ish.

---

## Top 7 visual fixes (impact-per-effort, 1–2 days each)

1. **Vibe-driven type scale on recipient view.** Add `--peek-type-display/-title/-eyebrow`, `--peek-leading-display`, `--peek-tracking-display`, `--peek-weight-display` mapped from typography + density. Replace `text-4xl font-semibold tracking-tight sm:text-6xl` in `hero.tsx` with inline-style consuming the vars. Princess peek display jumps to 5rem+ Bowlby; wedding peek drops to 3rem Cormorant italic. Same skeleton, radically different feel. **Highest impact, one day.**
2. **Ship missing display fonts.** Add `Bowlby_One`, `Anton`, `JetBrains_Mono` to `app/layout.tsx`. Half day. Required for #1 to morph.
3. **Wire vibe palette + accent into chat-pane.tsx.** User bubble: `bg-[hsl(var(--peek-ink))] text-[hsl(var(--peek-bg))]`. Assistant: `bg-[hsl(var(--peek-surface))] text-[hsl(var(--peek-ink))]`. Composer border: `border-[hsl(var(--peek-accent))]/30 focus-within:border-[hsl(var(--peek-accent))]`. Chat skin morphs in real time as Peek calls `set_vibe`. **Single move that kills "SaaS template" perception.**
4. **Vibe-themed sign-in / sign-up.** Replace Inter `peek.gift` wordmark with display font (Fraunces). Color Continue/Create-account CTA `bg-[hsl(var(--peek-accent))]`. Add a 3-card mini-mosaic on the left of `1280x800` viewport. Half day. **Removes the "wait did I leave the site?" moment.**
5. **Fix the hero collision bug.** "for Sam" overlay overlapping body copy. Z-index / position fix. Two hours.
6. **Replace disabled-grey primary buttons.** `bg-muted` reads as failed-state. Use `bg-[hsl(var(--peek-accent))]` for Continue, Create account, Try again, Send. Four-hour fix that elevates every form.
7. **Mood embellishments on recipient view.** Consume `--vibe-mood-grain` and `--vibe-mood-overlay` (computed but unused). Add grain overlay div on `<main>`. For `whimsical`, lazy-mount Lottie sparkle; for `editorial`, add top brand bar. Half day each, ship piecewise. **Mood dial finally means something visually.**

Stretch: per-motion cinematic-reveal choreography (`still`=fade, `lively`=stagger+overshoot).

---

## Aspirational mockup references

- **Cash App / Block landing** — oversized type, single accent, aggressive whitespace, mono captions. "Shockingly good" with just type + one color + space. peek.gift landing has DNA of this; extend to every surface.
- **Tracksmith** (tracksmith.com) — editorial serif, b&w + one accent (Boston red), real photography, restrained motion. The `milestone-bday / breathable / editorial` vibe should look like a Tracksmith product page, not a Shopify card grid.
- **Lore Olympus / Webtoon hero pages** OR **Headspace kids landing** — for the whimsical / princess / kid-bday end. Saturated primaries, pillowy radius (24px+), cartoony display fonts. Models what `pillowy + lively + whimsical` should resolve to.
- **Cabin (cabin.so) / Glossier "G" pages** — type + palette + ONE graphic element (Cabin gradients, Glossier pink) can carry a site. Vibe engine has the inputs; needs the discipline to USE them.

Unifying lesson: every reference has restraint + confidence. peek.gift currently layers *components* (shadcn) under *vibe* (CSS vars) — components win the visual war. Burn shadcn defaults out of recipient view + build chat; keep them only for forms + admin.

---

## Specific component changes to dispatch

1. **`atelier/lib/vibe/css-vars.ts`** — add type-scale vars per density × typography (`--peek-type-display` 2.5–5rem; `--peek-leading-display` 0.95–1.15; `--peek-tracking-display` -0.03em–0.02em; `--peek-weight-display` per font).
2. **`atelier/app/layout.tsx`** — add `Bowlby_One`, `Anton`, `JetBrains_Mono`. Bind to `--font-display-poster`, `--font-display-bachelorette`, `--font-mono-tech`.
3. **`atelier/components/recipient/hero.tsx`** — replace Tailwind type with inline-style from type-scale vars. Fix "for Sam" overlap.
4. **`atelier/components/recipient/recipient-view.tsx`** — replace hardcoded `gap-8 px-5 pb-32 pt-8` with `--peek-space-*`. Add grain overlay div from `--vibe-mood-grain`.
5. **`atelier/components/build/chat-pane.tsx`** — wrap in `<PeekVibeProvider vibe={livePeek.vibe}>`. Replace bubble classes with vibe inline styles. Accent border on composer focus.
6. **`atelier/components/auth/auth-card.tsx` + `custom-sign-{in,up}-form.tsx`** — wordmark to `var(--font-display)`. Replace `bg-muted` CTA with vibe accent. Optional left-side mini-mosaic at `lg:`.
7. **`atelier/components/ui/button.tsx`** — add `variant="vibe-primary"` pulling `--peek-accent` + `--peek-radius-button`. Adopt across recipient + build CTAs.
8. **`atelier/components/recipient/cinematic-reveal.tsx`** — per-motion variants (`still`=fade, `lively`=stagger+overshoot). Conditional Lottie for `mood: whimsical`.

**If only ONE ships this week: #5 (chat-pane vibe wiring).** That's the surface Frank looks at when he says "bland", and where the morph should be most visible because the curator is literally watching Peek build the gift.
