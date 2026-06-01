# SHELL_SPEC — the peek.gift renderer's interaction shell

> Implementation blueprint for a renderer that consumes `PeekIR` (`ir/contract.ts`) and
> paints a single-recipient gift/invite page at **mockup caliber**. The quality bar is the
> 15 hand-art-directed mockups, **not** the prior-gen `engine/renderer.js` (which is thinner —
> reference its *mechanics*, copy nothing of its *output*).
>
> Source of every threshold/easing below: the named mockup's inline `<style>`/`<script>`.
> Where mockups disagree, the value range is given; pick per `theme.motion.intensity`.
>
> **Read order:** §0 the surface the renderer lives in · §1 the shared shell · §2 per-section
> recipes · §3 scene/frame/motif catalog · §4 the full font set · §5 the token shape.

---

## 0. WHERE THE RENDERER LIVES (the surface contract)

Two render contexts, **one output**. Build for both from day one:

1. **Live preview inside the chat builder** (`reference/chat-ui/Mobile Chat - Live.html` →
   `product-preview.jsx` / `live-preview.jsx`). The renderer's output is the **backdrop** of an
   iOS device frame (`ios-frame.jsx`); the chat floats on top in glass (`chat-live*.jsx`,
   `chat-live-docked.jsx`). Implications:
   - Render into an **absolutely-positioned, self-contained root** (`position:absolute; inset:0;
     overflow:hidden`) with its **own internal scroll container**, NOT the document `<body>`.
     (Prior-gen `renderer.js:369-392` does exactly this — copy that containment, not its visuals.)
     This is mandatory because the page is a fixed-size device backdrop and because overlays
     (menu/sheet/bar) must be `position:absolute` to the root, not `fixed` to the viewport, or
     they escape the device frame.
   - Must stay **legible when ~60% obscured** by glass chat (`live-preview.jsx:3` says so).
     Keep hero/section hierarchy strong; don't bury the headline mid-fold.
   - Support a **"just-placed" highlight signal**: when the chat model adds/edits a section or
     card, that node pulses to show what changed. `product-preview.jsx` shows the vocabulary —
     a ring-pulse on the card (`@keyframes rcardIn` in `Mobile Chat - Live.html:14-17`:
     `box-shadow 0 0 0 3px→6px accent, 1.6s ease-out infinite alternate`), a `NEW`/`JUST PLACED`
     badge, and a section-eyebrow `Ping` pill ("updated by claude", dot with `0 0 0 3px` glow).
     Expose `renderer.markPlaced(sectionId | cardId)` that adds class `.peek-placed`.
2. **Standalone recipient/published page** — same renderer, mounted full-bleed. Here the root
   may fill the viewport; the internal scroll becomes the page scroll. Keep the same DOM so
   the IR renders identically in both.

**The 5 new mockups are mobile-phone-framed** (`.phone{max-width:430px}`): they prove the
canonical target is a **single-column, ~390–430px mobile composition**. The 10 originals are
responsive desktop→mobile, but their mobile breakpoint (`@media max-width:600px`) collapses every
multi-column grid into the same single-column + horizontal-snap-carousel shape. **Design mobile-first
to that shape; treat desktop as the progressive enhancement.**

**Card→sheet wiring is universal across all 15.** Every card grid is tap-to-open-bottom-sheet, and
the deep-link hook proves the renderer must accept any of these card class names interchangeably
(`Charity Gala.html:694`, repeated verbatim in all 10 originals):
```
.grid .card, .gifts .gift, .loot .item, .lots .lot, .payload .cargo, .goodies .goody
```
Your renderer emits **one** canonical class (suggest `.peek-card` inside `.peek-grid`) but the
behavior — tap card → populate sheet from the card's data → slide sheet up → claim toggles a
"claimed/reserved/aboard" state on the card — is identical everywhere. Honor `?cc=menu|sheet|bar`
for showcase/screenshot deep-linking (every mockup ships it).

---

## 1. THE SHARED SHELL (themed by tokens, present under every page)

Everything here is **themed off CSS custom properties** the renderer sets on the root (see §5).
The shell's *structure* is constant; its *skin* (color, font, radius, easing, ornament) comes from
`ThemeSpec`. Build each piece once, parameterized.

### 1.1 Top bar (nav) — condense / solidify on scroll

Two patterns appear; support both, choose by whether the hero is a **full-bleed dark photo**
(pattern A) or a **light/standalone hero** (pattern B).

**Pattern A — transparent-over-hero → solid-on-scroll** (`Charity Gala.html:62-80, 531-544`;
also HEMLOCK):
- Nav starts `position:fixed; background:transparent; border-bottom:transparent; color:ivory`
  (class `on-dark`), sitting over the dark hero.
- **Threshold:** `window.scrollY > hero.offsetHeight - 90`. Past it, toggle class `solid`:
  `background:rgba(bg,.9); backdrop-filter:blur(14px); border-bottom:1px solid var(--line)`, and
  swap text/`on-dark`→ink. (`Charity Gala.html:540-542`.)
- **Transition:** `background .5s ease, border-color .5s ease, padding .5s ease` and inner
  `color .5s ease` (`:64, :68`). The nav height itself can shrink (the "condense"): the contract
  for "padding" transition is there; e.g. inner height 74px→~60px on solid.
- Wordmark/links also re-color via the `on-dark`/`solid` classes.

**Pattern B — always-solid sticky glass** (the common case: Omakase `:55`, Cyber `:70`, Space
`:70`, Disco `:80`, Princess `:78`, Garden `:60`, Bachelor `:64`, HEMLOCK `:51`):
- `position:sticky; top:0; background:rgba(bg,.82–.92); backdrop-filter:blur(10–16px);
  border-bottom:1px solid var(--line)`. No scroll JS needed — it's glass from the start.
- The themed border varies: Disco uses a **gradient border-image** rainbow
  (`Disco Birthday.html:82`); Princess a **dotted** border (`:80`); choose from tokens
  (`palette.line` + optional `motifs` flair).

**Scroll-progress bar** (Charity Gala only, but adopt globally for "screenshot-worthy"):
- `#progress{position:fixed;top:0;height:2px;width:0;z-index:90;
  background:linear-gradient(90deg,var(--accent),var(--accent2));transition:width .1s linear}`
  (`Charity Gala.html:55-56`). Width = `scrollTop/(scrollHeight-clientHeight)*100%`
  (`:537-538`). In the device-framed context, anchor it to the **scroll container**, not window.

**Hamburger button** (all 15; show below the nav-links breakpoint, `display:grid`):
- Three-line `<span>` where `span` + `span::before/::after` are the bars; open state morphs to an X
  via `body.menu-open .hamburger span{background:transparent}` and the pseudo-elements rotate ±45°
  with `translateY` (`Charity Gala.html:213-220`). Transition `transform .3s ease`.

### 1.2 Hamburger → staggered slide-in menu

Constant across all 15 (`Charity Gala.html:222-241, 326-341, 627-630`):
- **Scrim:** `position:absolute/fixed; inset:0; z-index:95; background:rgba(ink,.5–.6);
  backdrop-filter:blur(3px); opacity:0; visibility:hidden; transition:opacity .4s, visibility .4s`.
  `body.menu-open` → `opacity:1; visibility:visible`. Click scrim closes.
- **Panel:** `position:fixed; top:0; right:0; bottom:0; width:min(82–86vw, 340–380px);
  background:var(--surface); border-left:1px solid var(--accent|--line);
  transform:translateX(100%)`. Open → `transform:none`.
  **Transition `transform .4–.5s cubic-bezier(.3,.8,.2,1)`** (Memphis uses a slight overshoot
  `cubic-bezier(.3,.9,.2,1.1)`, `Totally Rad Bash.html:207`). Big `box-shadow:-30px 0 80–90px
  rgba(0,0,0,.3–.7)`.
- **Links stagger in:** each `<a>` starts `opacity:0; transform:translateX(14–16px)`; transitions
  `opacity .4–.5s, transform .4–.5s` with **per-child delays**. Canonical staggers observed:
  `.1/.16/.22/.28s` (Charity, 4 links, `:232-235`), `.1/.18/.26s` (Omakase 3, `:172-174`),
  `.06/.12/.18s` (Cyber, faster, `:203-205`), `.08/.14/.2/.26/.32s` (HEMLOCK 5, `:92-96`).
  **Rule:** `delay = base + i*step`, base ≈ .08s, step ≈ .06s; cap at the link count. Drive
  `step` off `motion.intensity` (kinetic themes faster). `body.menu-open` flips all to
  `opacity:1; transform:none`.
- **Menu typography:** links are big **display-font** (26–30px), each with a trailing index glyph
  `.ix` themed per concept (roman numerals in Charity, JP kanji in Omakase `献立/お土産`,
  `// 01` in Cyber, `01–05` in HEMLOCK, `✦`/`✿`/`★` in Princess/Garden/Rad). Footer block at
  `margin-top:auto` with an eyebrow + the when/where line.
- `body.menu-open{overflow:hidden}` locks scroll. **Esc closes** (`Charity Gala.html:674`).

### 1.3 Sticky bottom ACTION BAR (the money bar) — appears past the hero

The single most important shell element for "the business" — holds the **CTA button + running total
/ meta**. Present in all 10 originals (`mobile-bar`) and is the literal `.cta` on the 5 new ones.
- **DOM:** `position:fixed; left/right:0; bottom:0; z-index:85; display:flex; align-items:center;
  gap:12–16px; padding:12px 18–24px calc(12px + var(--safe-b)); background:rgba(bg/surface,.92);
  backdrop-filter:blur(16px); border-top:1px solid var(--accent|--line);
  transform:translateY(140–160%); transition:transform .4–.5s cubic-bezier(.3,.8,.2,1)`
  (`Charity Gala.html:243-248`). Left side = meta (`.k` eyebrow + `.v` display headline);
  right side = the money button `.btn`.
- **When it appears:** revealed once the **hero scrolls out of view**, via IntersectionObserver on
  the hero element: `new IntersectionObserver(es => es.forEach(en =>
  bar.classList.toggle('show', !en.isIntersecting)), {rootMargin:'-40% to -50% 0px 0px 0px'})`
  (`Charity Gala.html:678-682`; rootMargin ranges `-40%`→`-50%` across mockups — use **-45%**).
  `.show{transform:none}`. In the device frame, set the IO `root` to the scroll container.
- **It holds the running total.** On the 5 new mockups the bar text *is* the live subtotal:
  `$74 + dinner` / `The whole job` (`For the Old Man.html:120-123`), `$87 + soup` / `Bundle total`
  (`The Send-Off.html:147-150`). So the renderer must: (a) sum `value_cents` of picked/claimed
  cards (skip taunts, skip `reveal_value:false`, append " + <non-priced label>" for homemade/
  experience items shown as `★`), and (b) update the bar's `.v` live as the sheet's
  claim button fires. The money button label comes from `peek.cta_label`
  ("Send it to Dad →", "Send the care package →", "RSVP", "Register to bid", "Enter your plea →").
- **Mobile-only by default** (`@media max-width:600px{.mobile-bar{display:flex}}`), but in the
  fixed-width device-preview context it is effectively always shown — treat the bar as **on by
  default** for the recipient/preview render, with desktop wide layouts optionally hiding it
  behind a persistent header CTA.

### 1.4 Bottom SHEET for item detail (pick / reserve / RSVP)

The interaction every gift card resolves into. Constant across all 15 (`Charity Gala.html:250-264,
609-672`; HEMLOCK adds swatches `:548-562, 602-634`):
- **Scrim:** separate from the menu scrim, higher z (`z-index:97`), `background:rgba(ink,.55–.66);
  opacity/visibility 0; transition .35–.4s`. `body.sheet-open` shows it.
- **Sheet:** `position:fixed; left/right:0; bottom:0; z-index:98; background:var(--surface/paper);
  border-radius:18–30px 18–30px 0 0; transform:translateY(101%);
  transition:transform .45–.5s cubic-bezier(.3,.85,.2,1); padding:10px 22–30px calc(26–34px +
  var(--safe-b)); max-height:88–92vh; overflow-y:auto; box-shadow:0 -30px 80–90px rgba(0,0,0,.35+)`.
  Open → `transform:none`. `body.sheet-open{overflow:hidden}`.
- **Grab handle:** `width:42–50px; height:4–5px; border-radius:999px; background:var(--line);
  margin:6–8px auto 16–18px`.
- **Contents (populated from the tapped card):** media/glyph block → retailer/donor/maker chip →
  display-font name → description → price → **CTA row** with `[Close]` (ghost) + the **claim/reserve
  button** (accent). HEMLOCK additionally renders a **colourway swatch row** (`.sh-swatches i`,
  selectable, `.sel` ring) from `data-swatches` — wire this when a card has variant colors.
- **Claim behavior:** clicking the claim button adds a state class to the source card
  (`registered`/`reserved`/`bagged`/`aboard`/`claimed`), shows that card's corner badge
  (`Bidding ✓` / `予約済` / `✓ In bag` / `✓ Aboard` / `★ Got it`), dims the card (`opacity:.55–.72`),
  flips the button to a done label + `disabled`, then **auto-closes after ~900–1000ms**
  (`setTimeout(closeSheet, 950)`, `Charity Gala.html:671`). Then **recompute the running total** in
  the action bar (§1.3). This maps to creating a `Pick` (`ir/contract.ts:233`).
- **Esc closes** both menu and sheet (`:674`).

### 1.5 Scroll-reveal animations

Two reveal systems coexist; implement both:

**A — entrance reveal on scroll-in (most pages)** (`Charity Gala.html:58-60, 565-579`):
- Class `.reveal{opacity:0; transform:translateY(26px); transition:opacity 1s
  cubic-bezier(.2,.7,.2,1), transform 1s cubic-bezier(.2,.7,.2,1)}`; `.in` clears it.
  (Prior-gen uses `translateY(18px)` + `.7s cubic-bezier(.16,1,.3,1)` — both read as
  "rise + fade"; pick **~.8s, cubic-bezier(.2,.7,.2,1)**.)
- IntersectionObserver: `{threshold:0.14, rootMargin:'0px 0px -8% 0px'}`; on intersect add `.in`,
  `unobserve`. **Stagger siblings** inside a group: for `.lots/.programme/.stats/.tiers` (your
  grids/lists), set each child's `transition-delay = i*90ms` before observing
  (`Charity Gala.html:576-578, 567-570`).
- **Failsafe:** after ~1100ms force any unrevealed `.reveal` to `.in` (so nothing stays invisible
  if IO misfires in the framed context) — prior-gen `renderer.js:416` does this; keep it.

**B — hero entrance on load** (`Charity Gala.html:94-118`):
- Hero children get `.anim{opacity:0; transform:translateY(30px); animation:rise 1.2s
  cubic-bezier(.2,.7,.2,1) forwards}` with **cascading `animation-delay`**: eyebrow `.1s`,
  h1 `.28s`, sub `.46s`, count `.62s`, meta `.78s`, cta `.92s`, scroll-cue `1.1s`. This is the
  "title types itself in" feel — apply it to the hero block on first paint.

### 1.6 Count-up numbers

Stats and big numerals animate from 0 (`Charity Gala.html:581-601`, the `.counter` elements):
- On scroll-into-view (`IntersectionObserver {threshold:0.6}`), tween `0 → data-target` over
  **1600ms** with ease-out cubic `eased = 1 - (1-p)^3`, writing
  `el.textContent = (target*eased).toFixed(dec)` each `requestAnimationFrame`; snap to exact target
  at the end. `data-dec` controls decimal places (e.g. `1.2` for "£1.2M"); a `.pre` span can hold a
  currency glyph. Use this for hero stat rows, the editorial `stats` (HEMLOCK), and — optionally —
  for the **running total** when it changes (count it up to the new sum for delight).
- **Live clocks/countdowns are a sibling pattern, not count-up:**
  - Charity hero has a **live countdown** to a target date: `setInterval(tick,1000)` filling
    `[data-k=d/h/m/s]` with zero-padded days/hours/min/sec (`:546-563`). Use for `countdown`
    sections / invites with a date.
  - Space hero has a **count-UP mission clock** `T+ hh:mm:ss` since load (`Space Mission Party.html:603-614`).
  - These animate text content only; gate the `setInterval` nowhere on reduced-motion (it's
    information, not decoration) but you may.

### 1.7 Reduced-motion handling (mandatory — `theme.motion.reduceMotionOK` is always true)

Every mockup ends with a `@media (prefers-reduced-motion:reduce)` block. The renderer must inject
the same global guard (`Charity Gala.html:314-318`, richer in Cyber/Space):
```
@media (prefers-reduced-motion:reduce){
  *{ animation-duration:.001ms !important; animation-iteration-count:1 !important;
     transition-duration:.1s !important; }
  html, .peek-scroll { scroll-behavior:auto; }
}
```
Plus **explicitly kill ambient loops** by selector (they otherwise run once and stop at a random
frame): `starfield .twinkle`, `gridfloor`, `orbit`/`radar` spins, `mirrorball`/`vinyl`/`disc` spins,
`holo`, `glitch::before/after`, marquee, `logo .dot` pulse, `botanical` sway, decor `float/spin/bob`,
`hero-bg` ken-burns (`Cyber Rave.html:275-279`, `Space Mission Party.html:325-328`,
`Disco Birthday.html:333-337`, `Totally Rad Bash.html:294-298`, `Garden Party.html:252-256`).
Reveals/staggers should resolve to the visible state immediately (no `translateY`), not animate.
Gate all **decorative** ambient animation behind `motion.intensity > 0` AND no-reduced-motion;
keep functional motion (sheet/menu/bar slides) but shortened.

---

## 2. PER-SECTION RENDER RECIPES

The page is `sections[]` (`ir/contract.ts:167-186`), each `{kind, title?, data, media?}`. Below,
each `SectionKind` gets: the DOM/layout, the `ThemeSpec` tokens that skin it, the `Section.data`
fields it reads, and the exemplar mockup. **All money-bearing sections (giftgrid/rail/stubs/tiers)
feed the §1.4 sheet and §1.3 running total.**

> **Contract note / conflict to surface to Frank:** the task brief lists section kinds
> `details, gallery, countdown, claim` as "added to the contract," but `ir/contract.ts:167-177`
> currently enumerates `hero | note | giftgrid | rail | lookbook | details | steps | tracklist |
> courses | tiers | stubs | flightplan | custom` — it has **`details` but NOT `gallery`,
> `countdown`, or `claim`**, and it **has `steps`** (which the brief omits). The mockups clearly
> need all of: details, gallery, countdown, claim, AND steps. Recommendation: **extend the
> `SectionKind` union** (the contract even says "Extend the registry, not the schema" for decor;
> do the same here) to add `gallery | countdown | claim`, keep `steps`. This spec documents all of
> them so the renderer is ready. The renderer should also treat **unknown kinds → render as
> `custom`** (sanitized) so a model that invents a kind never breaks the page.

### Shared section chrome
- **Section wrapper:** `.peek-sec{padding: var(--space-sectionY) 22px}` (mobile ~56–72px,
  desktop 84–104px). Optional `.band` variant flips to `surface`/`paper` bg with top+bottom
  hairline (`Omakase Evening.html:86`, used to alternate section rhythm).
- **Section head:** two layouts — **centered** (eyebrow + display `h2` + dek, `Charity Gala.html:138-142`)
  or **split baseline** (left: eyebrow+title, right: meta note, `Omakase Evening.html:93-97`,
  `Bachelor Party.html:123-127`, HEMLOCK `:132-134`). `h2` uses `--font-display`,
  `--display-tracking`, `--display-case`. Eyebrow uses `--font-body|accent`, `--eyebrow-tracking`,
  `palette.accent`, uppercase. Many add ornamental marks around the eyebrow (`★…★`, `✦…✦`,
  `▓▒░`, `// `) — drive from `motifs[]`.

### `hero` — eyebrow + headline + dek + optional media; **4 variants**

`data: {eyebrow, headline, dek, variant, meta?[], ctas?[], stat?[]}`, `media?: MediaSlot`.
Variant chosen by `data.variant` (the chat sets it) ∈ `framed-media | centered | type-mega |
full-bleed-photo`. Tokens: `--font-display/displayTracking/displayCase`, `palette.*`, `scene`,
`frame`, `glow`, `motion`.

- **`framed-media`** — copy block beside a framed photo (Omakase `:66-84, 285-309`; Disco vinyl
  `:93-135`; Bachelor idcard `:78-112`; the 5 new phone mockups are all single-column variants of
  this). DOM: `hero-grid` 2-col (`~1.1fr .9fr`) collapsing to 1-col + photo-first on mobile
  (`order:-1`). Left: eyebrow → display `h1` (often a script "greet" line above, e.g. Disco
  `.greet`, Princess `.greeting`) → `lede` → a **meta strip** (`.meta`/`.pills`/`.info`/`.telemetry`
  — bordered cells of k/v: when/where/dress) → CTA row. Right: `media` wrapped in the theme's
  `frame` (§3). Use when there's one strong portrait/photo.
- **`centered`** — everything centered, motif row above eyebrow, framed photo below (Princess
  `:93-128`, Garden arch `:69-84`). Good for whimsical/ceremonial.
- **`type-mega`** — giant type carries it, little/no photo (Cyber `:80-99`, Space `:89`,
  Charity `:97`, Bachelor `:89`). `h1` is `clamp(54px,9–15vw,108–180px)`, `line-height:.84–.94`.
  Often layered effects: stroke-only text (`-webkit-text-stroke:2px var(--accent); color:transparent`,
  Space `.out` `:91`, Bachelor `.outline` `:91`), gradient-clip text (Disco `:104-108`), animated
  holographic clip (`holo`, Cyber `:46-49`), glitch (Cyber `:62-67`).
- **`full-bleed-photo`** — photo fills the hero, type sits over a bottom scrim (Charity
  `:82-118`, HEMLOCK `:107-121`, prior-gen `renderer.js:167-174`). DOM: `min-height:88–100vh;
  display:flex; align-items:flex-end`; bg `<img>` with **ken-burns** (`animation:ken 24s ease-in-out
  infinite alternate`, scale 1.06→1.2, Charity `:86-87`) + a `hero-veil` radial+linear gradient
  scrim for legibility + a fine `hero-grain`/`hero-noise` overlay
  (`feTurbulence` SVG data-URI, Charity `:91-92`, HEMLOCK `:114-115`). This variant pairs with the
  Pattern-A transparent nav.
- Use `MediaSlot.url` when present; else paint the **themed gradient placeholder** (linear-gradient
  of `accent→accent2` + noise overlay + radial sheen, prior-gen `media()` `renderer.js:59-69`) and,
  if `media.directive` exists, this is the slot the ImageProvider port fills later. Hero photos
  often carry a caption/badge ("Our little princess ♛", "CREW · 07").
- **Hero auto-fit:** shrink `h1` font-size until it fits its intended line count without overflow
  (`renderer.js:399-409`) — re-run on `document.fonts.ready` since the display font changes metrics.

### `note` — the personal note (gift pages)

`data: {body | body_md, signature?, label?}` (or read `peek.note_md`). Exemplars: For-the-Old-Man
`.note` (`:71-72, 116`), Send-Off locker note (`:60-65, 127-131`), Soft-Landing pull-quote
(`:62-66, 117-120`). DOM: a bordered/tinted card — `background:rgba(accent,.07)` or `surface`,
`border:1px solid var(--line)`, `border-radius:var(--radius)`, padding ~22px; a small accent
**label** ("A note in the box", uppercase eyebrow), the note in display/serif/handwritten voice at
~17–22px line-height 1.5, then a `— Signature` line in display/script. Send-Off adds a pin dot
(`::before` red circle, `:62`); Soft-Landing centers it as an italic quote. Tokens: `--font-accent`
for the signature (script when available), `palette.accent`, `palette.muted`, `--radius`.

### `giftgrid` — the cards (THE CORE)

`data: {intro?, columns?}`; renders `cards[]` filtered/ordered by `variant_groups`/`position`.
Exemplars: every wishlist/loot/payload/gear/goodies/gifts grid. **The defining money section.**
- **Layout:** desktop `display:grid; grid-template-columns:repeat(4,1fr); gap:20–26px`
  (3-col for editorial), → tablet `repeat(2,1fr)` → **mobile horizontal snap carousel** with
  edge-peek: `display:flex; overflow-x:auto; scroll-snap-type:x mandatory; margin:0 -20px;
  padding:4px 20px; ::-webkit-scrollbar{display:none}`, each card `flex:0 0 ~62–70%;
  scroll-snap-align:start` (`Charity Gala.html:299-303`, identical pattern in all). Often a
  **featured/headline card** spans full width above the grid (`.feature`/`.headlot` — 2-col
  experience hero with badge + big copy + accent CTA, e.g. Disco `:180-191`, Bachelor `:153-165`).
- **Card by `Card.type`** (`ir/contract.ts:125`) — the visual face differs (prior-gen
  `renderer.js:252-283` has the right idea; mockups are richer):
  - `product` → photo (or themed gradient placeholder + glyph) with a **retailer/source chip**
    (`source_retailer`, top-left, glass pill) + name + description + price + a "View →"/"cop →"
    micro-cta. Hover lifts/scales the image (`transform:translateY(-6px)` + shadow).
  - `activity` → same card but price may be a date/"experience" tag (`proposed_date`,
    `location_hint`).
  - `aspirational` (the **experience/featured**) → richer treatment: gradient or photo, a
    star/ribbon badge ("★ The Experience"), bigger price ("$600 · chip in on the rink").
  - `digital` / homemade-ish → no retailer; a warm tinted tile + heart/sparkle glyph + "HOMEMADE"
    chip; price may be `★` (Send-Off soup, `:114-118`; Soft-Landing lasagna `:93-94`).
  - **Taunt cards** (`is_taunt`) → a denied/struck card showing `taunt_text` ("HA, DENIED"),
    decorative, not tappable-to-claim.
  - **Locked cards** (`is_locked` + `unlock_rule`) → blurred/lock-badged; tapping shows the
    `beg_prompt` or "unlocks after <date>" instead of claim.
- **Card chrome per concept** (skin via tokens, but the *shape* is concept-specific — this is
  where mockup caliber lives): plain bordered (Omakase, Garden, HEMLOCK), rounded soft-shadow
  (Disco `border-radius:18px; box-shadow:0 14px 0 rgba(0,0,0,.18)`), **hard sticker-shadow**
  (Totally Rad `border:4px solid ink; box-shadow:8px 8px 0 ink` + a rotated price `.tag`),
  dotted-border (Princess), neon-panel (Cyber/Space `border:1px solid var(--line)` on dark +
  glow on hover). Drive corner style from `--radius`, border from `palette.line`,
  shadow intensity/offset from a derived token, glow from `palette.glow`.
- **Reveal:** grid children stagger (`i*90ms`, §1.5). **Tap → sheet** (§1.4). **Subtotal line**
  under the grid ("8 things, picked with love") + the running total in the bar.
- `data.intro` renders as a lead paragraph above the grid (the "No gifts required, but…" copy is
  ubiquitous and should come from the IR).

### `rail` — horizontal scroller of cards/media

`data: {title, items[]}` or a tagged subset of `cards`. Like `giftgrid`'s mobile mode but
**horizontal on all breakpoints**: `display:flex; gap:14px; overflow-x:auto; scroll-snap-type:x
mandatory; margin:0 -22px; padding:0 22px`. Each child `flex:0 0 ~74%; scroll-snap-align:start`.
HEMLOCK's per-category `SectionFrame` carousels are the exemplar (`product-preview.jsx:176-218`):
a thin-bordered "catalog card" wrapping eyebrow+title+meta, a hairline, then the scroller. Use for
"The Collection"/category strips. Same card → sheet wiring.

### `lookbook` — editorial figure stack

`data: {title, figures[{media, title, sub, n?}]}`. Exemplar: HEMLOCK editorial split
(`HEMLOCK - Field Collection.html:156-164, 396-411`) and prior-gen `renderer.js:203-211`. DOM:
`editorial` 2-col (`1.05fr .95fr`) — large `photo` one side, `copy` (eyebrow → display `h2` → body →
a `stats` row of big serif numerals + labels → ghost CTA) the other; collapses to 1-col on mobile.
Figure variant: stacked `<figure>` each `media` (16/10) + numbered caption (`01` accent + display
title + muted sub). Tokens: `--font-display`, `palette.muted`, `palette.line`, count-up on the
stats numerals.

### `details` — when / where / dress (invites)

`data: {rows: [[label, value, sub?], …], heading?}` (`ir/contract.ts:184` names this exact shape).
Exemplars: Princess `detail-rows` with icon tiles (`Princess Party.html:152-169, 462-475`),
El Taquito fiesta menu rows (`El Taquito.html:61-66, 107-111`), Garden/Omakase/Cyber/Bachelor
hero `meta` strips, Decree Absolute "terms" clauses. DOM options (pick per concept):
- **Icon rows** (Princess): each row `[icon tile | label(eyebrow) + value(display)]`, dotted/solid
  divider between. Icon tile = `46px; border-radius:14px; background:rgba(accent,.12);
  color:accent`. Often a 2-col card: illustrated art panel + the rows.
- **Bordered k/v strip** (hero meta style): flex cells with right-borders, `k` eyebrow + `v` display.
- **Clause list** (Decree): numbered `§ 1` accent + a sentence — for "legal" concepts.
- **Themed menu** (El Taquito): colored rounded panel, rows of `[Cuándo|value+small]`.
Tokens: `--font-display` for values, `palette.accent` for labels/icons, `palette.line` for dividers,
`--radius`. Read each row from `data.rows`.

### `tiers` — pricing/ticket levels

`data: {tiers:[{name, price, sub?, perks:[…], featured?}]}`. Exemplars: Charity attend tiers
(`Charity Gala.html:189-196, 494-509`), prior-gen `renderer.js:222-229`. DOM: `repeat(3,1fr)` →
1-col mobile; each tier `border:1px solid var(--line)`, padding ~40px, a small uppercase tier name
(`palette.accent`), a big display `price` with `<small>` qualifier, a `<ul>` of perks divided by
hairlines. `featured` tier → accent border + lift on hover (`border-color:var(--accent);
transform:translateY(-4px)`). Tap → sheet (claim a tier/place). Tokens: `--font-display` price,
`palette.accent`, `palette.line`.

### `stubs` — line-up rows (ticket / set / roster style)

`data: {rows:[{title, sub?, time?, price?, badge?, featured?}]}`. The most varied, concept-defining
list. Exemplars: Cyber DJ `lineup`/`set` (`Cyber Rave.html:120-132, 353-359`), Totally Rad tilted
`gig` tickets (`:130-149`), Bachelor perforated `ticket` rows with day-labels (`:129-150, 410-439`),
Send-Off jersey `roster` (`:49-58, 103-124`), prior-gen `renderer.js:212-221`. DOM shapes:
- **Set row** (Cyber): grid `[time | who(name+desc) | room-pill]`, left accent stripe glowing,
  hover `translateX(6px)` + border-accent; alternating stripe colors via `nth-child`.
- **Ticket** (Bachelor/Rad): a **stub** column (`border-right:2px dashed`) with notch circles
  punched top/bottom (`::before/::after` `border-radius:50%; background:bg` straddling the edge,
  `Bachelor Party.html:140-142`), a mid column (title+desc), optional suit/icon column.
  Rad tilts odd/even rows ±1.2° and straightens on hover.
- **Roster** (Send-Off): `[big number | name+position+source-chip | price]`, `featured/star` rows
  get accent border + `box-shadow:0 0 0 3px rgba(accent,.16)`.
Tokens: `--font-display` for titles/times, `--font-accent`/mono for times, `palette.accent` accents,
`palette.line` for dashed perforations, `--radius`. Tap → sheet/claim.

### `tracklist` — record-side running order

`data: {sides:[{tag, tracks:[{n, title, sub?, time?}]}]}`. Exemplar: Disco record sleeve
(`Disco Birthday.html:152-177, 428-446`), prior-gen `renderer.js:230-237`. DOM: optional 2-col
**sleeve** (a spinning `disc` art panel + the track list) collapsing to 1-col; each track row
`[num (A1/B2) | title+desc | time]` with **dotted dividers** (`border-bottom:2px dotted`); side
headers ("◖ Side A · The Warm-Up"). Tokens: `--font-display`, `palette.accent` for numbers,
`palette.accent2`/secondary for times. The disc art uses `repeating-radial-gradient` grooves +
`spin` (§3, gate on motion).

### `courses` — tasting-menu sequence

`data: {courses:[{n, name, name_sub?, desc, pace?}]}`. Exemplar: Omakase
(`Omakase Evening.html:99-108, 327-335`), prior-gen `renderer.js:238-243`. DOM: max-width column,
each course a grid `[no | name(+latin/EN sub) + desc | pace-time]`, hairline dividers, first row
top-border. The number uses display/serif at ~30px in `palette.accent`; bilingual names show a
small uppercase EN sub under the display name. Tokens: `--font-display`, `palette.accent`,
`palette.muted`, `palette.line`.

### `flightplan` — timeline / itinerary with a spine

`data: {phases:[{time, label?, title, desc, icon?}]}`. Exemplars: Space flight plan
(`Space Mission Party.html:141-162, 428-453`), Charity programme (`:145-154, 403-410`), Garden
"afternoon" (`:97-108, 328-334`), prior-gen `renderer.js:244-251`. DOM: a vertical column with a
**center/left spine** (`::before` absolute 1–2px line; Space animates it as a marching dashed line
`repeating-linear-gradient` + `@keyframes march`, `:143-146`); each phase a grid
`[stamp(time+phase) | node-dot | card(title+desc)]`. **Node dot:** `border-radius:50%;
border:2px solid var(--accent); box-shadow:0 0 0 4–5px var(--bg)`, often a pulsing inner dot
(`::after` `animation:tw`). Cards can have corner ticks (Space `.hc.tl/.br`, `:157-159`) and an
icon in the title. Charity/Garden are quieter (champagne dot, sage dot). Tokens: `--font-display`,
`--font-accent`/mono times, `palette.accent`, `palette.bg` (for the dot halo), `palette.line`.

### `steps` — how it works / how it ships

`data: {steps:[{n?, title, desc?}], layout?}` (KEEP in contract; brief omitted it but mockups use
it). Exemplars: Send-Off "HOW IT SHIPS" 3-step row (`The Send-Off.html:67-72, 133-139`),
Princess itinerary cards (`Princess Party.html:205-214, 596-615`), prior-gen `renderer.js:307-312`.
DOM: either a **row of numbered chips** (`flex; gap:10px`, each a bordered tile with big accent
number + short label) or **numbered icon list** (`[number/icon badge | title+desc]`). Tokens:
accent number badges (`background:rgba(accent,.14); color:accent`), `--font-display`, `--radius`.

### `gallery` — photo strip / moments

`data: {images:[MediaSlot], layout?}` (ADD to contract). Exemplar: prior-gen `renderer.js:288-293`
(no dedicated original, but the pattern is needed for uploaded-photo galleries). DOM: horizontal
snap strip, alternating aspect ratios (`3/4` and `1/1`), every other tile slightly rotated
(`transform:rotate(-1.5deg)`) for a scrapbook feel; falls back to themed gradient placeholders when
slots are unfilled. Tokens: `--radius`, frame (optionally wrap each in `polaroid`). Pair with the
ImageProvider port for user uploads.

### `countdown` — live count to the date

`data: {target_iso, label?, units?}` (ADD to contract). Exemplar: Charity hero countdown
(`Charity Gala.html:104-118, 546-563`). DOM: a row of `[n / label]` units (Days/Hours/Min/Sec),
display-font tabular numerals (`font-variant-numeric:tabular-nums`), labels in
`palette.accent2`/champagne uppercase. JS = the 1s `setInterval` tick zero-padding each unit
(§1.6). Can stand alone as a section or live inside the hero. If `target_iso` is past, roll to next
year or show a "It's today" state. Tokens: `--font-display`, `palette.accent/accent2`.

### `claim` — the RSVP / final-action panel

`data: {heading, dek?, field?:{type,placeholder}, success_msg?, fine?}` (ADD to contract; this is
the invite-side analogue of the giftgrid's pick action, and the literal final block on most
mockups). Exemplars: every RSVP/Attend/Reserve/Manifest/List section (Charity `:486-516`, Cyber
`:429-446`, Space manifest with radar `:551-568`, Disco/Princess/Rad/Bachelor/Garden/Omakase
reserve blocks), and the 5 new `.cta` blocks. DOM: a large rounded panel (often with a glow/rays/
radar scene inside, §3), centered: eyebrow → big display `h2` (script accent word common) → dek →
a single-field form (email/name) → small fine print. **Submit is in-world theater:** prevent
default, clear the field, swap the button label to a themed success message
("ACCESS GRANTED ░ SEE YOU ON THE FLOOR", "ありがとうございました — confirmed", "See you at the castle! ♛")
— `Charity Gala.html:511`. This is the moment that maps to publishing/RSVP; wire the real action
behind it but keep the theatrical confirmation. Tokens: `--font-display`, `palette.accent`,
`--radius` (panels are very rounded, 26–38px), `glow`, `scene` for the inner ambient.

### `custom` — model-authored themed markup (the escape hatch)

`data: {html}` (`ir/contract.ts:177`). The no-ceiling block: the model writes themed HTML/CSS
against the live `--peek-*` CSS vars; **sanitize server-side before render** (strip `<script>`,
event-handler attrs, external `src` unless allow-listed). Exemplars: the **5 new mockups are
essentially one big `custom` composition each** — a work-order, a court decree, a lotería card —
proving why this block exists (those concepts are "literally unstorable" in plain archetypes,
`00_MAP.md:79`). The renderer injects the HTML into a `.peek-custom` container that has all theme
vars in scope, runs the shell (nav/bar/sheet still wrap it), and applies reveal to top-level
children. Prior-gen `renderer.js:300-306` is the minimal version — keep it, add sanitization.
**Render any unknown `SectionKind` through this path** (sanitized) so forward-compat never breaks.

---

## 3. SCENE / FRAME / MOTIF CATALOG (with the CSS technique for each)

These are the decorative primitives the mockups actually use. The renderer implements each as a
parameterized builder reading `palette.accent/accent2/ink/bg` (prior-gen `renderer.js:88-135` is the
right shape — extend it; the mockups have more). **All ambient ones gate on `motion.intensity` +
reduced-motion (§1.7).**

### Scenes (`theme.scene`, a full-bleed `position:absolute; inset:0; pointer-events:none; z-index:0`)
| scene | technique | mockup |
|---|---|---|
| `grain` / texture | `feTurbulence` fractalNoise SVG data-URI, `opacity:.05–.07; mix-blend:overlay/multiply` | Charity `:91-92`, HEMLOCK `:114-115`, all 5 new `.phone::before` |
| `starfield` | JS-generate N stars as one element's `box-shadow` list (random x/y/alpha), 2–3 parallax layers, `@keyframes tw` twinkle (opacity .35↔1) | Space `:56-60, 581-601` |
| `gridfloor` | bottom band, `perspective:340px`, child `transform:rotateX(72deg); transform-origin:bottom`, two `linear-gradient` 1px line sets `background-size:50px`, `@keyframes floor` scroll `background-position`, mask to fade | Cyber `:85-93` |
| `rayfan` | `repeating-conic-gradient(from 0 at X Y, accent 0 6deg, transparent 6deg 12deg)` + radial mask | Bachelor `:80-85`, prior-gen |
| `sunburst` | `repeating-conic-gradient` of accent/transparent wedges + `radial-gradient` mask ring | Disco `.hero-sun :95-99`, El Taquito `.sun :47-48`, prior-gen |
| `mirrorball` | radial-gradient sphere + two `repeating-linear-gradient` facet grids (overlay) + highlight `::after` + `spin` | Disco `.ball :63-72` |
| `scanlines` | `body::after` (or scene) `repeating-linear-gradient(180deg, transparent 0 2px, rgba(0,0,0,.18) 2px 4px); opacity:.5; mix-blend` | Cyber `:34-36` |
| `confetti` | N absolute chips, `@keyframes` fall + rotate, random delays | prior-gen `:118-120`; Rad uses floating SVG `shape`s `:336-343` |
| `bubbles` | N bordered circles rising (`@keyframes st-rise`) | prior-gen `:121-123` |
| `halftone` | `radial-gradient(circle, ink 1.4px, transparent 1.6px); background-size:12px` (dot field) | Totally Rad `body :34-36`, prior-gen |
| `blueprint` | two `linear-gradient` 1px grids `background-size:28px` on dark | prior-gen `:114-115` |
| `topo` | `repeating-radial-gradient(circle, transparent 0 18px, ink/.05 18px 19px)` contour rings | prior-gen `:116-117` |
| `mesh` | layered offset `radial-gradient` accent blobs, slow `drift` | prior-gen `:110-111` |
| `radar` (claim panels) | `repeating-radial-gradient` rings + `conic-gradient` sweep `::after` with `spin` | Space `.radar :195-198` |
| `dawn-wash` | top `linear-gradient` blush→cream + soft blurred sun circle | Soft Landing `.sky :20-24` |
| marquee strip | flex track of repeated spans, `@keyframes mq{to{transform:translateX(-50%)}}`, 18–32s linear; content duplicated 2× for seamless loop | every original `.strip` |

Also: **page background washes** — most light themes set `body{background: radial-gradient(...) ,
radial-gradient(...), linear-gradient(...)}` with `background-attachment:fixed` (Disco `:35-39`,
Princess `:37-41`); the renderer should apply a token-driven multi-stop background, not flat `bg`.

### Frames (`theme.frame` or per-slot `MediaSlot.frame`, wraps hero/card media)
| frame | technique | mockup |
|---|---|---|
| `plain` | rounded media, optional inset sheen + border | HEMLOCK cards |
| `vinyl` | `repeating-radial-gradient(circle, #111 0 2px, #0e0e10 2px 5px)` disc + center `label` (photo) + `hole` + `conic-gradient` shine + `spin 14–18s` | Disco `:116-135` |
| `porthole` | circle, thick layered `box-shadow` bezel rings + inner shadow, optional reticle crosshair + orbit rings spinning | Space `.porthole :102-127` |
| `polaroid` | white card `padding:14px 14px 54px; border; box-shadow; transform:rotate(-3–4deg)`, caption label, optional tape strips (`Totally Rad`) | Totally Rad `:94-106`, prior-gen |
| `arch` | `border-radius:300px 300px 22px 22px / 60% 60% 22px 22px` + inset double border | Garden `.arch :69-73`, Princess `.frame :113-118` |
| `locket` | `border-radius:~48%` oval + concentric `box-shadow` rings (accent, surface) | prior-gen `:81-82` |
| `idcard` | grid `[photo | meta]` bordered card, "BACKSTAGE / ALL ACCESS / NO. 0042" mono text, inner hairline | Bachelor `.crew :102-112`, prior-gen `:83-84` |
| `ticket` / `stub` | dashed perforation + punched notch circles (`::before/::after` half-circles in bg color straddling edges) | For-the-Old-Man `.ticket :60-68`, Bachelor `.stub :138-144` |
| `stamp` | dashed/double border box, slight rotate, "Finalized"-style typewriter overprint | Decree `.stamp :40-42`, prior-gen MOTIFS.stamp |
| `wax-seal` / `hanko` | circle, 2–3px accent ring, short centered text/glyph ("FREE AT LAST", "花火", court seal) | Omakase `.seal :49-52`, Decree `.seal :27-28` |

### Motifs (`theme.motifs[]`, budget 1–4; inline SVG recolored via `currentColor`)
`sparkle, star, crown, suit, leaf, zigzag, rule, dots, sunburst, hanko, chrome, stamp` already in
prior-gen `MOTIFS` (`parts.js:122-135`) — keep that SVG library. Plus, from the mockups, add:
- **papel-picado** bunting — flex of spans, each `::after` colored, cut with `clip-path:polygon`
  pennant + a `-webkit-mask` of radial-gradient holes (`El Taquito.html:21-31`). For fiesta themes.
- **pennant / banner** — single triangular tag via `clip-path:polygon(0 0,100% 0,86% 50%,100%
  100%,0 100%)` (Send-Off `.pennant :32-33`).
- **scallop / deckle edge** — `radial-gradient(circle at Npx 0, transparent r, color r+1) repeat-x;
  background-size` (Princess `.scallop :130-134`); the "deckle" paper edge variant.
- **sprig / botanical divider** — centered SVG leaf flanked by hairlines (`Garden .sprig :55-57,
  318`); botanical SVGs that `sway` (`Garden :86-87`).
- **starburst sticker** — `clip-path:polygon(...)` many-point star badge, counter-rotating inner
  text (`Totally Rad .starburst :107-112`).
- **glitch text** — `::before/::after` duplicate text, cyan/magenta offset, `clip-path:inset`,
  jitter keyframes (`Cyber :62-67`).
- **holo gradient text** — animated multi-color `linear-gradient` + `background-clip:text`
  (`Cyber .holo :46-49`).
- **chrome/Y2K bevel**, **checkbox tick** (work-order, `For the Old Man .chk :53`), **playing-card
  suits** (`Bachelor .suits ♠♥♦♣`), **wave underline** (`Soft Landing .wave :87`), **chip/pill**
  tags (everywhere).

Motifs render in a **motif row** under eyebrows/in footers (`renderer.js:132-135`), as eyebrow
flankers (`::before/::after content:"★"`), and as dividers. `glow` → add
`filter:drop-shadow(0 0 6px accent)`.

---

## 4. FONT SET — every Google family across ALL 15 mockups (the dynamic loader MUST cover these)

The current `FONT_SPECS` (`parts.js:11-43`, 33 families) **misses ~22 of the families the mockups
actually use.** The dynamic loader (`renderer.js:29-38` — builds one `css2?family=…&family=…`
`<link>`, dedupes, appends incrementally) is the right mechanism; it just needs a complete registry.
Below is the full set with the axis query string and where each is used. **Bold = MISSING from
current FONT_SPECS, must be added.** Format: `Family` — `css2 axis` — usage.

**Already in FONT_SPECS (used by mockups):**
- `Bodoni Moda` — `Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;0,6..96,600;0,6..96,700;1,6..96,400;1,6..96,500` — Charity display (serif headline + italics).
- `Jost` — `Jost:wght@300;400;500;600` — Charity body/eyebrow.
- `Share Tech Mono` — `Share+Tech+Mono` — Cyber mono (eyebrows, labels).
- `Space Grotesk` — `Space+Grotesk:wght@400;500;600;700` — Space display.
- `Space Mono` — `Space+Mono:wght@400;700` — Space + Bachelor mono.
- `Pinyon Script` — `Pinyon+Script` — Princess script greeting/accents.
- `Cormorant Garamond` — `Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600` — Princess serif headings.
- `Quicksand` — `Quicksand:wght@400;500;600;700` — Princess body.
- `Marcellus` — `Marcellus` — Garden display serif.
- `Mulish` — `Mulish:wght@300;400;500;600;700` — Garden + Soft Landing body (note Garden needs the `300` weight too).
- `Source Serif 4` — `Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;0,8..60,700;1,8..60,400;1,8..60,500` — HEMLOCK serif (needs italic axis too).
- `Work Sans` — `Work+Sans:wght@400;500;600;700` — For-the-Old-Man body.

**MISSING — add these to the loader registry:**
- **`Shippori Mincho`** — `Shippori+Mincho:wght@400;500;600;700;800` — Omakase display (JP serif `min`).
- **`Zen Kaku Gothic New`** — `Zen+Kaku+Gothic+New:wght@300;400;500;700` — Omakase body (JP sans).
- **`Chakra Petch`** — `Chakra+Petch:wght@400;500;600;700` — Cyber display.
- **`Lilita One`** — `Lilita+One` — Disco display (chunky rounded).
- **`Yellowtail`** — `Yellowtail` — Disco script.
- **`Nunito`** — `Nunito:ital,wght@0,400;0,600;0,700;0,800;1,600` — Disco body. (Distinct from `Nunito Sans` already in registry — both exist.)
- **`Bungee`** — `Bungee` — Totally Rad display.
- **`Bungee Shade`** — `Bungee+Shade` — Totally Rad layered/shadow display.
- **`Fredoka`** — `Fredoka:wght@400;500;600;700` — Totally Rad body.
- **`Oswald`** — `Oswald:wght@300;400;500;600;700` — Bachelor + For-the-Old-Man display (condensed).
- **`Barlow`** — `Barlow:ital,wght@0,400;0,500;0,600;1,400;1,500` — Bachelor body.
- **`Tangerine`** — `Tangerine:wght@400;700` — Garden script.
- **`Roboto Mono`** — `Roboto+Mono:wght@400;500;700` — For-the-Old-Man mono.
- **`Graduate`** — `Graduate` — The Send-Off display (collegiate).
- **`Hanken Grotesk`** — `Hanken+Grotesk:wght@400;500;600;700;800` — The Send-Off body.
- **`Libre Franklin`** — `Libre+Franklin:wght@600;700;800;900` — The Send-Off accents/eyebrows.
- **`Newsreader`** — `Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500` — Soft Landing serif display (needs italic).
- **`Libre Baskerville`** — `Libre+Baskerville:ital,wght@0,400;0,700;1,400` — Decree Absolute serif body.
- **`Special Elite`** — `Special+Elite` — Decree Absolute typewriter (legal stamps).
- **`Yeseva One`** — `Yeseva+One` — El Taquito display.
- **`Rubik`** — `Rubik:wght@400;500;600;700;800;900` — El Taquito body.

**Loader requirements:**
1. Registry must be the **union** of the above + everything already in `FONT_SPECS` (the model will
   also pick families beyond these 15 — the registry is a floor, the model authors `FontSpec`
   directly). Because `FontSpec` (`ir/contract.ts:46-53`) carries `family`, optional `axis`, and
   `weights`, the loader should **prefer `FontSpec.axis` when present** and only fall back to a
   built-in registry lookup, so unknown families still load via the model-supplied axis.
2. Build ONE `<link href="https://fonts.googleapis.com/css2?family=…&family=…&display=swap">`,
   dedupe, append incrementally as new themes load (`renderer.js:31-37`). `preconnect` to
   `fonts.googleapis.com` + `fonts.gstatic.com`.
3. After load, fire the hero **auto-fit** re-measure on `document.fonts.ready` (§1.5) — display
   fonts change metrics and would otherwise overflow.
4. `fontStack(family)` must map each to a sensible fallback class (serif→Georgia, script→cursive,
   mono→monospace, else system-ui) — `parts.js:44-51`, extend its `serifs/scripts` lists to cover
   the new serif/script families above (e.g. add Newsreader, Libre Baskerville, Shippori Mincho to
   serifs; Yellowtail, Tangerine to scripts; Special Elite, Roboto Mono to monospace).

---

## 5. TOKEN SHAPE the shell reads from `ThemeSpec`

The renderer maps `ThemeSpec` (`ir/contract.ts:87-97`) to `--peek-*` CSS custom properties on the
root and reads them everywhere (`renderer.js:362-368` is the seed — it's incomplete; below is the
full set the shell needs). Set ALL of these so a `custom` block author has the whole vocabulary.

### Typography (from `theme.type`, `TypeSystem` `ir/contract.ts:55-62`)
- `--font-display` ← `type.display.family` (via `fontStack`) — hero `h1`, `h2`, names, prices.
- `--font-body` ← `type.body.family` — paragraphs, eyebrows, UI.
- `--font-accent` ← `type.accent?.family` (script/mono/stamp) — signatures, numerals, times,
  eyebrows. Falls back to display if absent.
- `--scale-ratio` ← `type.scaleRatio` (1.25–1.6) — drives the modular type scale; hero ≈
  `body * ratio^steps`. The hero builder reads this to size `h1` (`renderer.js:142`).
- `--display-tracking` ← `type.displayTracking` (e.g. `-.02em`) — `h1`/`h2` letter-spacing.
- `--display-case` ← `type.displayCase` (`none`|`upper`) — `text-transform` on display.
- `--eyebrow-tracking` — eyebrow letter-spacing. **Not currently a `TypeSystem` field** but the
  mockups vary it hugely (`.22em`→`.42em`; Charity `:39`, Omakase `:36`). Recommend adding
  `eyebrowTracking` to `TypeSystem`; until then derive a default (~`.28em`) or read from
  `cssVars`.

### Palette (from `theme.palette`, `Palette` `ir/contract.ts:64-70`)
- `--bg` ← `palette.bg` (and apply the multi-stop background wash if the theme wants one).
- `--surface` ← `palette.surface` — cards, sheet, menu, nav glass base.
- `--ink` ← `palette.ink` — primary text.
- `--muted` ← `palette.muted` — secondary text, captions, fine print.
- `--line` ← `palette.line` — borders, dividers, perforations, hairlines.
- `--accent` ← `palette.accent` — eyebrows, prices, CTAs, active states, node dots.
- `--accent2` ← `palette.accent2` — secondary accent (times, gradients, scene layer B, progress
  bar end).
- `--mode` ← `palette.mode` (`light`|`dark`) — chooses button text color
  (`dark→#0c0c0c`, light→`#fff`, `renderer.js:359`), `mix-blend-mode` for grain/scanlines
  (`dark→screen`, light→`multiply`, `renderer.js:105,127`), scrim darkness.
- `--glow` ← `palette.glow` (bool) — when true, add neon `text-shadow`/`box-shadow`/
  `drop-shadow` to headlines, buttons, motifs, accents (`renderer.js:145,358`).
- `--texture` ← `palette.texture` (bool) — when true, lay the grain overlay over the whole page
  regardless of `scene` (`renderer.js:126`).

### Decoration (from `theme.scene`, `theme.motifs`, `theme.frame`)
- `--scene` ← `theme.scene` (`SceneKind`) — selects the §3 scene builder painted at root z-0.
- `--motifs` ← `theme.motifs[]` (`MotifKind[]`, ≤4) — the §3 ornaments used in motif rows, eyebrow
  flankers, dividers, footer.
- `--frame` ← `theme.frame` (`FrameKind`) — default media wrapper (§3); `MediaSlot.frame` overrides
  per slot (`ir/contract.ts:117`).

### Shape / space / radius (from `theme.radius` + a `space` token the shell needs)
- `--radius` ← `theme.radius` (px) — card/sheet/menu/button corners. Sheet/menu top corners,
  panels (claim) often use larger; derive `--radius-lg` = `radius * ~1.4` and `--radius-pill` =
  `999px`. The brief references `radius.pill`; expose `--radius-pill` (and `--radius-card` =
  `--radius`) explicitly.
- `--space-sectionY` — vertical section rhythm. **Not in `ThemeSpec` today** but the shell needs it
  (mockups range 56–104px; `renderer.js` invents `t.space.sectionY`). Recommend a `space` token
  group (`{sectionY, gutter}`) on `ThemeSpec`, or derive: `sectionY = 72px` mobile / `96px`
  desktop, `gutter = 22px`. The action bar / hero padding read it.

### Motion (from `theme.motion`, `MotionSpec` `ir/contract.ts:82-85`)
- `--motion-intensity` ← `motion.intensity` (0–1) — **gate for all ambient/decorative loops**
  (starfield, gridfloor, spins, marquee, confetti, glitch, holo, ken-burns). 0 = paint static,
  1 = full kinetic. Also scales reveal/stagger speed (kinetic → faster `step`).
- `motion.reduceMotionOK` is always `true` → always honor `prefers-reduced-motion` (§1.7).
- **Easing tokens the shell uses** (the mockups are consistent; expose them as vars so `custom`
  blocks match):
  - `--ease-panel: cubic-bezier(.3,.8,.2,1)` — menu slide, action-bar slide (`renderer.js` calls
    this `easePanel`). Memphis/Rad use a slight-overshoot `cubic-bezier(.3,.9,.2,1.1)` for playful
    themes — pick per concept.
  - `--ease-sheet: cubic-bezier(.3,.85,.2,1)` — bottom-sheet slide.
  - `--ease-reveal: cubic-bezier(.2,.7,.2,1)` — scroll reveals + hero entrance.
  - Plus durations: menu/bar `.4–.5s`, sheet `.45–.5s`, scrim `.35–.4s`, reveal `~.8–1s`,
    nav solidify `.5s`, count-up `1600ms`.

### Escape hatch
- `theme.cssVars` (`ir/contract.ts:96`) — raw `--*` the model injects (sanitize server-side); merge
  these onto the root **after** the derived tokens so the model can override any of the above for a
  one-off effect a `custom` block needs.

### Safe-area (always)
- `--safe-b: env(safe-area-inset-bottom, 0px)`, `--safe-t: env(safe-area-inset-top, 0px)` — every
  mockup pads the action bar / menu / sheet by these (`Charity Gala.html:27-28`). Set on the root;
  the device-frame context and real iOS both rely on them.

---

## Build checklist (so nothing in the shell gets skipped)
1. Self-contained absolute root + internal scroll + theme-var injection + scene at z-0 +
   grain/texture + background wash. Safe-area vars.
2. Top bar (Pattern A solidify-on-scroll OR Pattern B glass) + scroll-progress + hamburger morph.
3. Staggered slide-in menu (scrim, panel, per-link delay, esc/scrim close, scroll-lock).
4. Sticky action bar (IO reveal past hero at -45%, money button from `cta_label`, **live running
   total** from claimed cards).
5. Bottom sheet (scrim, slide, grab handle, populated from tapped card, claim→state+badge+dim,
   recompute total, auto-close, swatches when present, esc close).
6. Scroll reveals (IO + stagger + failsafe) + hero load cascade + count-up + live countdown/clock.
7. Per-section builders for ALL kinds in §2 (incl. gallery/countdown/claim + unknown→custom).
8. Scene/frame/motif builders from §3, all gated on motion+reduced-motion.
9. Dynamic font loader covering the full §4 set (+ FontSpec.axis passthrough) + hero auto-fit on
   fonts.ready.
10. `prefers-reduced-motion` global guard + per-loop kills. `?cc=` deep-link hook.
11. `markPlaced()` highlight signal for the live-builder context (ring-pulse + NEW badge + section
    ping).
