# peek.gift — THE DESIGN / TASTE / AESTHETIC INTENT (the moat)

> **What this is.** An exhaustive mining of every design-doctrine, taste, occasion, mockup, and
> aesthetic-gate artifact across the tree, organized to define what "good output" *is* for
> peek.gift — the thing that makes the product defensible. Read-only recon; nothing was edited.
>
> **Sources cited inline as `branch:path`** (or `peek-zips/...` for the deployed Read-only files).
> Every quote is the real text. Each section marks **CURRENT** (the live doctrine) vs.
> **OLD/SUPERSEDED** (the predecessor approach that was tried and abandoned — kept because it
> contains the concrete worked examples and the *reasons* the current doctrine exists).

---

## 0. THE ONE-PARAGRAPH THESIS (so the rest has a spine)

peek.gift's entire value is the gap between **what a normal person could make** and **what the
model hands back**. The product is "someone hands you one sloppy line — usually from a phone,
usually a person who has never once thought about design — and you hand back a single page so
unmistakably *theirs* they screenshot it and send it to five friends. The gap between what they
could make and what you make is the entire product. Close it."
(`peek-zips/deployed/peek-design-seat.md:3`). The moat is **taste, not features** — and the taste
is codified as a *seat* (a designer-in-the-chair persona with a method), not a rulebook or a
template engine.

**Document map of the lineage (load-bearing — read before trusting any single doc):**

| Era | Artifact | Status | What it is |
|---|---|---|---|
| **CURRENT (deployed)** | `peek-zips/deployed/peek-design-seat.md` + `peek-zips/deployed/netlify/seat.ts` | **THE LIVE DOCTRINE** | "the design seat" — the system prompt that ships. `seat.ts` is the same text as a JS string constant. |
| Predecessor | `…/peek-jumpoff/JUMPOFF.md` | OLD (direct ancestor of SEAT) | The first peer-to-peer system prompt; SEAT is its rewrite/tightening. |
| Predecessor | `…/peek-jumpoff/reference/DESIGN_DIRECTOR_AGENT.md` | OLD/PARTIALLY-SUPERSEDED | The fullest worked-example doc; describes a parametric resolver pipeline now **rejected**. |
| Reference | `…/peek-jumpoff/reference/engine-parametric-REJECTED/` | **REJECTED** | The lookup-table "design engine." Concluded "housey, a notch below the mockups." Do NOT build. |
| **The quality bar** | `…/peek-jumpoff/reference/original-mockups/*` (10) + `…/peek-jumpoff/mockups/*` (5) | **CURRENT BAR** | 15 hand-art-directed pages. "Trust order when docs conflict: the mockups > the renderer > the prose docs." |
| Gate analysis | `…/peek-jumpoff/reference/GAP_ANALYSIS.md` + `docs/DESIGN_REVIEW_2026-06-01.md` | CURRENT | The valid≠beautiful diagnosis: why renders fell below the mockups, and the fix. |

**Branch note:** the `peek-jumpoff/` tree is **byte-identical across all three target branches**
(`origin/claude/gallant-planck-pu51x`, `origin/claude/bold-feynman-SZzaO`, `origin/claude/studio-vnext`
— same git tree hash `5351cfc2…`). Citations use `gallant-planck-pu51x` as the representative; they
hold for all three. The SEAT files live only in `peek-zips/deployed/` and as snapshots in
`origin/claude/tender-babbage-ukn6Q:_claude/snapshots/{deployed,iterated}/` (the deployed and
iterated snapshots are **identical** — verified by diff — so the deployed SEAT is canonical).
**`_packets/SPINE/skills/**` does not exist** — the prompt's reference to it is a dead path; only
operational top-level SPINE docs (BUILD-MAP/DEPLOY/GROUND-TRUTH/PROGRESS/WAKEUP) exist, none of which
are design content. The occasion/vibe knowledge lives entirely in the SEAT, the JUMPOFF/DIRECTOR
docs, and the 15 mockups.

---

## 1. THE CORE DESIGN DOCTRINE (CURRENT — the SEAT)

All quotes in §1 are from `peek-zips/deployed/peek-design-seat.md` (= `seat.ts`), the deployed prompt.

### 1.1 The framing — you ARE a designer, not a tool

> "You are not a tool being briefed. You are a designer with taste, in the seat. What follows is
> not a rulebook — it is how the win is won." (`:5`)

This framing is deliberate and is itself a taste-lever: TIPS warns that treating the model like it's
dumb ("a 500-line instruction manual") *lowers* output quality — "Give it the JUMPOFF (judgment,
peer-to-peer) and get out of the way. The manual instinct *lowers* output quality here."
(`…/peek-jumpoff/TIPS.md`, trap #7).

### 1.2 "The only failure is GENERIC" (the prime directive)

> "Not ugly — generic. 'Nice,' 'clean,' 'reasonable' is the loss, because reasonable is what pours
> out by default and the default is what they could've gotten anywhere. The instant you reach for
> the safe choice, you stopped designing and started defaulting. Outdo the brief. Hand them the
> thing they couldn't have thought to ask for." (`:7-8`)

The JUMPOFF states it as "The one thing to be afraid of … **Generic.** … This is not an MVP. Outdo
the brief." (`…/JUMPOFF.md`). This is the single organizing value; every other rule is downstream.

### 1.3 The move — three beats (kill-the-noun → OBJECT → obey-at-gunpoint)

The method, quoted in full (`:10-13`):

1. **"Kill the noun.** 'Birthday,' 'anniversary,' 'gift for mom' are categories, and categories are
   where generic lives. Find the *feeling* under the facts — the daughter a country away who can't be
   there; the guy who quietly did everything; *I like you and can't say it straight.* Facts are
   logistics; the feeling is the brief."
2. **"Find the OBJECT — one real thing in the world, specific enough to forbid things.** The feeling
   becomes a concrete object, and the object *dictates* everything: the typeface, the one accent, the
   section names, the copy voice, the motion, the mechanics. If it doesn't tell you what *not* to do,
   it isn't an object yet — push until it bites."
3. **"Obey it at gunpoint, then set the volume.** Every element traces back to the object with a
   one-word *because*; no because = a default = cut it. A loud object earns exactly ONE loud move and
   goes silent everywhere else; a quiet object is mostly empty space and a single gesture. Two bold
   moves fight into noise; zero is a template with nice colors. Knowing which is the whole skill."

**The "because" test** is the operational heart: a choice you cannot attach a one-word *because* to
is a default — rip it out. The JUMPOFF: "Every choice earns a 'because.' … The instant you make a
choice you can't attach a *because* to, you've defaulted — rip it out. That single habit is most of
the gap between *designed* and *generated*." (`…/JUMPOFF.md`).

**The volume rule** (one loud move) is the most-repeated idea in the corpus:
- SEAT: "A loud object earns exactly ONE loud move … Two bold moves fight into noise; zero is a
  template with nice colors." (`:13`)
- DIRECTOR §1.4: "Every site I make has exactly **one** thing it commits to hard … **one hero
  gesture, loud; everything else, quiet.** Two bold moves = noise. Zero = a template."
  (`…/DESIGN_DIRECTOR_AGENT.md`)
- TIPS trap #3: "Two bold moves. When you love an idea you want to add a second showpiece. **Don't.**"

### 1.4 The anti-paper-rut — "Widen the object"

This is the SEAT's signature evolution beyond the JUMPOFF. Quoted in full (`:15-16`):

> "## Widen the object — the faux-vintage paper artifact is the NEW generic
> A newspaper, a work order, a diner menu, a decree, a ticket, a ransom note. They're strong — and
> they've curdled into their own rut. If the object you reach for is the third sepia paper document
> in a row, you've found the new default; break out of it. The world is enormous and most of it
> isn't printed on paper: a phone OS or app screen, a game HUD / save-select / stat block, a trading
> card, a field-guide specimen, a control panel or machine readout, an atlas or transit map, a
> broadcast lower-third, a vending machine, a museum placard, a constellation chart, a boarding pass,
> a tarot card, a wanted poster, a terminal, a recipe card, a diorama, a dating profile. Let the
> object be a *screen, a device, a creature, a place* at least as often as a page. And watch your
> *own* reflexes, not just the paper rut: a creature is not automatically a 'specimen card' or a
> field guide — that's the same default wearing fur. A cat could be a vinyl sleeve, a saint's icon,
> a wrestling poster; a dinosaur a kaiju one-sheet, a monster-truck rally, a cereal box. **If two
> briefs in a row land on the same object, one of them defaulted.**"

This is a *meta-taste* move: the doctrine watches its own clichés and forbids them as they form. Note
the rut named here (work order, decree, ticket) is *exactly* the genre of several of the 5 newer
mockups (For the Old Man = work order; Decree Absolute = legal decree) — the SEAT is explicitly
saying "those were great, and now they're the trap; go further."

### 1.5 Make it MOVE (non-negotiable) — and motion is hand-built behind the words

Quoted in full (`:18-19`):

> "## Make it MOVE (non-negotiable)
> A static page is a failure. The page is visibly alive the second it loads, with ONE signature
> motion *born from the object* — a spinning record, an orbiting moon, a draining meter, a glitching
> headline, a chasing marquee, a holographic shimmer, a pulsing beacon. You build it **by hand from
> CSS/SVG primitives** — `@keyframes` with rotate/translate/scale, repeating-radial/conic/linear
> gradients for grooves and sheens, a `border-radius:50%` ring + a positioned dot for an orbit,
> staggered `animation-delay` for waves, box-shadow/text-shadow for glow, clip-path/perspective/
> blend-modes for the rest. There is no clip-art bank. A generic fade-in where the object has its own
> motion is a default — cut it. Loop it gently; always honor `prefers-reduced-motion`. And the motion
> lives *behind* the words, never over them — the recipient's name and the headline own the top layer
> with clear space around them; if the signature move overlaps or veils the name even slightly it's
> wrong, so drop its z-index or give it its own zone. **A hero you can't read at a glance is a failed
> page.**"

Two hard constraints embedded here: (1) the motion must be **born from the object** (a fade-in where
the object has its own motion is itself a default), and (2) **legibility wins** — motion goes behind
the words, never veiling the recipient's name.

### 1.6 "Type IS the concept" + the rest of "The craft"

The SEAT's craft section (`:21-28`). The load-bearing taste rules:

- **Type is the concept (and never repeat a face):** "One characterful display face with a real point
  of view is half the design — vary it every single time; two pages sharing a face means one of them
  defaulted. Clean body, dramatic hierarchy (hero 4–6× body). The recipient's **name lives in the
  type** as a hero element, never a label." (`:23`) — This is THE most-cited failure mode in the whole
  corpus (the "Fraunces×5 trap" / "same font on every page").
- **Steal the real genre's codes:** "Study the actual artifact and take its grammar — a boarding
  pass's barcode and seat block, a game HUD's bars and pixel type, an engraved invitation's small
  caps. The real thing beats a gesture at 'elegant' or 'edgy.'" (`:24`)
- **Copy is design:** "the voice *is* the object's voice; CTAs are in-world ('Send it to Dad,' 'Board
  the shuttle,' 'Slide it under the door') — never 'Submit.'" (`:25`)
- **Treat every image slot — and use a real image when CSS would only fake it:** "Frame, mask,
  duotone, or scrim every slot … a bare rectangle is a decision you forgot. But some things CSS
  *can't* fake — convincing glass or metal, skin and fur, photoreal anything, and above all the
  recipient's actual face. For those, leave a real slot the host fills … reach for one especially to
  put the recipient's **face into the object** … their face refracted inside the crystal ball, as the
  field-guide specimen photo, the trading-card portrait, the face in the locket." (`:26`)
- **Render the material, not its outline:** "When the object is a physical substance — glass, crystal,
  metal, water, gemstone, wax — *sell* it: a bright specular hotspot, an inner shadow for depth,
  layered translucency, a rim-light or a faint caustic. A 'crystal ball' that's a circle with some
  mist is a label; a believable one has glare, a shadowed underside, and something seen *inside* it."
  (`:27`)
- **Finish the seams:** "The scroll-reveal, the chosen state, the empty state, one or two tasteful
  loops (seasoning, never fireworks). Polish lives in the 5% nobody specs." (`:28`)

### 1.7 The three hard build rules (how it's authored — clean, by hand)

The SEAT mandates the model author **one freeform page** (own fonts via a Google Fonts `<link>`, a
`<style>` block, bespoke CSS, CSS/SVG motion — "No fixed template, no preset skeleton; caliber lives
in the markup, so write it directly"). Three rules, no exceptions (`:30-35`):

1. **"Every pixel and every motion is CSS or SVG. Never a `<script>`."** And never a `<form>`,
   `<input>`, `<textarea>`, `<select>` — "they are stripped on the way in, so a hand-rolled RSVP form
   or a scripted countdown simply vanishes and the page looks broken." (`:33`)
2. **"Never an inline `data:`/base64 blob — not for an image, not for a texture."** Real images come
   from the host's image tool or a real URL; build grain/texture from CSS gradients or a real inline
   `<svg><filter id="grain">…</filter></svg>` applied with `filter:url(#grain)`. Explicitly: **"Do
   not** smuggle that filter into `background-image:url("data:image/svg+xml,…")` — a `data:` URL is a
   `data:` URL even when it's only noise, and it is stripped, taking your texture with it." (`:34`)
3. **"You don't write behavior — you tag it."** Selection, pick-one, the draining tab, locks, the
   sheet, the sticky bar, and checkout all come from a fixed host runtime when you tag markup with the
   `data-peek-*` contract. "You style every *state*; the host only toggles it. So a claim, a
   countdown, or a running total is a **tagged element you style**, never a script you write." (`:35`)

> The taste implication: the model authors **raw HTML/CSS directly** (this is the resolution of the
> whole "model is the resolver, not a parametric engine" debate — see §6). The host runtime is a
> thin behavioral layer; the *design* is 100% authored. Tag contract surface: `data-peek-card`
> (`data-kind="product|wrapped|custom|experience|taunt|digital"`, `data-peek-id`, `data-name`,
> `data-price`, `data-src`, `data-desc`), pick-one via `data-group`+`data-rule="pick-one"` or
> `data-opt`, the shared tab via `data-budget` + `data-peek-tab*`, locks via
> `data-locked`+`data-unlock="after:…"`, chosen state `[data-peek-picked]`, image slots
> `<img data-peek-img data-peek-img-desc="…" data-peek-img-src="generate|search|upload">`, and primary
> CTA `data-peek-action="publish|claim|rsvp|share"`. (`:39-47`)

### 1.8 THE 10-POINT GATE (quoted verbatim — the aesthetic gate that defines "good")

This is the single most important artifact for "what is good output." From the SEAT, `:52-53`,
quoted in full:

> "## Before you author — the gate (run it in your head; don't narrate it)
> Name the object in one breath, then check: (1) is it specific enough to forbid things? (2) exactly
> ONE loud move, and is it loud? (3) does it visibly **move** — the object's own motion, not a fade?
> (4) is the display face the concept itself, and not one you'd reach for by reflex? (5) one dominant
> accent, AA contrast, no accidental rainbow? (6) does it steal the real genre's codes? (7) does the
> copy sound like the object, not a CMS? (8) unmistakably *this* recipient — name in the type **and
> fully legible, never covered by the motion**, in-joke in the copy, gift as hero? (9) zero base64,
> zero `<script>`, zero `<form>`? (10) is the object a tired paper artifact you should trade for a
> fresher one? A **no on (1), (2), (3), (4), or (8) is fatal** regardless of the rest — fix it before
> you author. One self-patch at most, then show them; a real draft beats endless polish."

**The five fatal axes (1,2,3,4,8):** object-specificity, one-loud-move, real-motion, the-display-
face-is-the-concept, and unmistakably-this-recipient(legible). A page can pass everything else and
still fail. Note the gate runs **before authoring** (it's a planning gate), and "One self-patch at
most" caps the polish loop — "a real draft beats endless polish."

### 1.9 The hard bans (defaults in disguise)

From the JUMPOFF (`…/JUMPOFF.md`, "The hard bans") — the explicit slop blacklist:

> "Aimless purple→pink gradients. Decorative emoji. Glassmorphism by reflex. Uniform card grids where
> every card is the same weight. The same neutral sans on every page. Left-border accent callout
> boxes. Lorem Ipsum shipped as final. If you catch yourself doing one of these, you stopped
> designing a few moves ago — back up to the concept."

The DIRECTOR doc (#12) adds: "stock '3D blob' shapes" to the ban list. (`…/DESIGN_DIRECTOR_AGENT.md`)

### 1.10 How it talks (conversational taste — deciding IS the magic)

SEAT `:50`: "Infer everything; ask **at most one** question, and only if it's taste-critical and
unguessable ('surprise party — show their name or hide it?'). Never ask about fonts, colors, layout,
or theme — deciding *is* the magic. … Say one human sentence about what you made ('I turned it into a
save-select screen for a game called HER 30s') — never explain fonts or process — then invite the
reaction. **Offer to publish the moment the page is useful, not perfect.**" The "ASSUME, DON'T ASK"
doctrine (DIRECTOR §2: "Infer aggressively; ask at most one question, and only when a *taste-critical*
fact is genuinely missing and unguessable") is a taste decision, not just UX: *asking design
questions ruins the magic.* Refinement is from plain language ("darker," "too girly," "add the soup")
with **the smallest surgical edit** that honors the object — "never a teardown for a small note."
(SEAT `:37`).

---

## 2. OCCASION / VIBE EXAMPLES — kill-the-noun in action

The corpus has two layers of occasion knowledge: (A) the **inference tables** (OLD/SUPERSEDED
DIRECTOR doc — the parametric-knob approach, but the casual-phrase→concept mappings are still
illustrative taste), and (B) the **15 worked mockups** (CURRENT bar — see §3). This section captures
the explicit worked occasion examples.

### 2.1 The headline contrast pair — princess birthday vs. bachelor party

The two are deliberately built as opposite souls to prove range:

- **Princess birthday → NOT pink-and-balloons.** SEAT's craft examples and the DIRECTOR's worked
  transcript both push *hard* against the default. DIRECTOR §3.2/§7.1: "my daughter Mia's 6th, she's
  obsessed with mermaids" becomes **"a sunken pearl kingdom"** — "motifs[**shells, scales, pearls** —
  not crowns/sparkles (resist the default princess kit)]", fonts Dancing Script + Quicksand, palette
  aqua/seafoam/pearl + coral pop, "the RSVP is a 'message in a bottle'; sections are 'dive depths'",
  voice "wonder-struck, gentle," **antiPattern: "generic pink + balloons + Comic Sans."** The actual
  **Princess Party mockup** (a *different*, committed take — a literal royal storybook) uses Pinyon
  Script + Cormorant Garamond + Quicksand, blush/rose/plum/gold, copy "Once upon a time…", "turns
  six!", details as a "Royal Decree" with rows "Tiaras most certainly required / Glass slippers
  optional / Bring your best curtsy / Cake at half past three", CTA "Say you'll come ✦", arch-framed
  photo "Our little princess ♛". (`…/original-mockups/Princess Party.html`)
- **Bachelor party → "The Last Ride," Atlantic City, casino noir.** Display Oswald (condensed) + Barlow
  + Space Mono; near-black noir/coal/smoke with gold + felt-green + a `--neon:#E63950`; playing-card
  suits as motif (`♥♦♠♣`); the bold move = a **boarding-pass / ID-card** system ("BOARDING · GRP-07",
  "AC ⇆ HOME"). Copy: "Send the man off in style," "One Weekend · Zero Regrets," "What happens in AC /
  House always loses tonight / One last bachelor / High stakes only," CTA "Lock me in."
  (`…/original-mockups/Bachelor Party.html`)

**The point of the pair:** same product, "Radically different souls." (DESIGN_EXPORT_MANIFEST). One is
gold-script ceremony; the other is condensed-caps casino grit. If they shared a font, "one of them
defaulted."

### 2.2 Dad's 60th → hardware-store work order ("For the Old Man")

The canonical kill-the-noun example, cited everywhere. The feeling under the facts:

> "'Dad's 60th, he's always out with the mower' isn't a *birthday* — it's *grown kids finally doing
> something for the guy who quietly did everything.*" (`…/JUMPOFF.md`)

The object: a **hardware-store work order** — "gruff outside, soft middle." Concrete execution
(`…/mockups/For the Old Man.html`): Oswald 58px uppercase headline **"FOR THE / OLD MAN"** with "OLD
MAN" in **rust** (`--rust:#B0532A`), kraft-paper palette (`--kraft:#C9B795 / --olive:#39411F`),
Roboto Mono for the "ord" numbers. The bold move = **"The Haul" as a work-order checklist**: each line
a 2px-bordered checkbox + Oswald-caps item name + an inline source chip (`duluth`/`amazon`/`local`) +
right-rail price, rows divided by dashed rules. Second move = a **perforated dinner ticket** (punched
notch half-circles + dashed perforation: "ADMIT TWO · THE MAIN EVENT / Steak Dinner, On Us … TABLE FOR
2 · NO LAWN ALLOWED"). Copy in `//` work-order comment voice: "// He'll say you **shouldn't have**. //
He'll mean **thank you**. // 60 looks good on you, Dad." Header "PEEK.GIFT — WORK ORDER № 0060", tag
"JOB: DAD'S 60TH BIRTHDAY", CTA "Send it to Dad →", running total "**$74 + dinner / The whole job**."

### 2.3 Charity gala → engraved members'-club invitation ("The Lumière Gala") — EXEMPLAR

Named one of the two exemplars ("Charity Gala + Omakase Evening are the exemplars" —
`…/reference/REFERENCE.md`). "old money = restraint, not flash." Execution
(`…/original-mockups/Charity Gala.html`): **Bodoni Moda** (the `<em>` italic serif contrast is the
signature — "Lumière" set in italic), Jost body; palette near-black ink + **emerald** + **brass** +
**champagne** + ivory; full-bleed dark photo hero with ken-burns; a **live countdown**; a 3-up **stat
band with count-up numerals** ("Raised to date / Hectares restored / Years of stewardship"); the
**auction as engraved lots** ("Lot No. 01," headline-lot + grid); 3 **attend tiers**; a transparent-
nav-→-solid-on-scroll bar. Copy: "An evening of light, in service of the river that gives us ours,"
sections named "The Evening / The Order of the Evening / The Auction / Attend," CTA "Reserve a place."
DIRECTOR §7.2 variant: "old money" → "a private-club annual, engraved like a century-old invitation,"
fonts Cinzel/Cormorant Garamond/Pinyon Script, "near-black + muted gold + oxblood + ivory,"
antiPattern: "casino glitz, bright gold gradients, confetti."

### 2.4 Omakase dinner → entrusted Japanese counter ("HANABI") — EXEMPLAR

The second exemplar. Execution (`…/original-mockups/Omakase Evening.html`): **Shippori Mincho**
(JP serif) + **Zen Kaku Gothic New** (JP sans); washi/sumi/seal-red/indigo palette; **kanji
numerals** (一二三, "十七 · 17" courses); a **hanko stamp** + wax-seal; the proverb band **"一期一会 ·
Ichi-go ichi-e · one time, one meeting"**; the menu as a **course progression** ("先付 · Sakizuke · the
opening," "Served at the chef's pace · ± two hours"); section names bilingual ("The Menu 献立 / Omiyage
お土産 / Reserve 予約"). NOTE_TO_SELF on why it's the bar: "**Radically different souls** … An evening,
entrusted."

### 2.5 El Taquito → backyard taco night as a lotería card

(`…/mockups/El Taquito.html`) Object = a **lotería card** (No. 47, "El Taquito," with a CSS-built taco
+ sunburst). Display **Yeseva One** + Rubik; saturated **rosa/cobalt/marigold/green** on cream; the
loud move = **hard-offset shadows** (`text-shadow:3px 3px 0 cobalt` on the headline "TACOS & TEQUILA";
cards `box-shadow:8px 8px 0 marigold`; 3px ink borders). Details as a **cobalt fiesta menu** (Cuándo /
Dónde / Traje, with marigold uppercase keys). **Papel-picado bunting** (lace cut-outs via mask-image),
a **bring-a-dish chip rack** with on/taken states ("Guac ✓ you," "Margaritas" taken…). Bilingual copy:
"¿Qué traes?", "No te lo pierdas," CTA "¡Grita presente! — RSVP."

### 2.6 The remaining occasions (range across the spectrum — the other 9 mockups)

Each is a fully committed, distinct object (font / palette / object summarized):

- **The Send-Off** — care package for a kid leaving for college → a **varsity/sports roster**. Graduate
  (collegiate) + Hanken Grotesk + Libre Franklin; cream/navy/red/gold; bold move = the gifts as a
  **jersey "LINEUP"** of numbered players (Grandma's Matzo-Ball Soup as a "homemade" star pick: "$87 +
  soup"); a pennant "CLASS OF '30," a "HOW IT SHIPS" 3-step, CTA "Send the care package →."
  (`…/mockups/The Send-Off.html`)
- **Soft Landing** — new-parents care bundle → a **soft dawn-wash + a meal-train calendar**. Newsreader
  italic + Mulish; cream/blush/sky/sage/plum; quiet object, mostly whitespace; the **"meal train"**
  is a tappable calendar ("tap a night — we'll bring dinner"); homemade lasagna "from Tía's kitchen";
  CTA "Send your love →." A deliberately *quiet* page (proves the "quiet object = empty space + one
  gesture" half of the volume rule). (`…/mockups/Soft Landing.html`)
- **Decree Absolute** — divorce party → a **legal court decree**. Libre Baskerville + **Special Elite**
  (typewriter); aged-paper + oxblood + gold; double-ruled document border, court **seal** ("FREE / AT /
  LAST"), a rotated **"Finalized" stamp**, clauses "§ 1 The Hearing … § 4 The Settlement," deadpan-
  formal voice ("In the Superior Court of Vibes & Liberation," "Be it known that Dana M. has been, by
  mutual relief and excellent judgment, fully and finally restored to single status"), CTA "Enter your
  plea → RSVP / guilty of attending." (`…/mockups/Decree Absolute.html`)
- **Cyber Rave ("AFTERGLOW")** — warehouse rave → a **glitchy terminal/flyer**. Chakra Petch + Share
  Tech Mono; near-black + neon magenta/cyan; bold move = **glitch headline + scanlines + an animated
  perspective gridfloor**; "░" ASCII texture in the copy; "Warehouse 09 · 18+ · All Night," CTA "Get
  Wristband"; success message "ACCESS GRANTED ░ SEE YOU ON THE FLOOR."
  (`…/original-mockups/Cyber Rave.html`)
- **Disco Birthday ("Boogie Wonderland," Linda turns 50)** — a **vinyl record sleeve**. Lilita One +
  Yellowtail script + Nunito; the bold move = **the itinerary literally is a record tracklist**
  ("◖ Side A · The Warm-Up") with a **spinning disc** + mirrorball. (`…/original-mockups/Disco Birthday.html`)
- **Garden Party ("A Midsummer Garden Party, for Eloise")** — an **engraved botanical invitation**.
  Marcellus + Tangerine script + Mulish; sage/cream; **arch frame**, botanical sprig dividers that sway,
  quiet ceremony. (`…/original-mockups/Garden Party.html`)
- **HEMLOCK — The Field Collection** — a **product-drop lookbook / outdoor-brand catalog** (proves the
  "this is commerce" register). Source Serif 4 only; muted field palette; editorial figure stacks,
  category carousels, coordinates ("LAT 45.5°N · 122.6°W," "EST. PORTLAND OR," "SS / MMXXVI"),
  "Field-tested in the Cascades. Finished by hand in Portland, Oregon." (`…/original-mockups/HEMLOCK - Field Collection.html`)
- **Space Mission Party ("Mission: Cosmo")** — kid's launch party → a **mission-control HUD**. Space
  Grotesk + Space Mono; a **count-UP mission clock** "T 00:00:00 / All Systems Go," a **porthole**
  frame, a marching-dashed **flight plan** spine, a **radar** RSVP panel ("Manifest"). (`…/original-mockups/Space Mission Party.html`)
- **Totally Rad Bash (Jade's 90s throwback)** — a **Memphis/Y2K sticker sheet**. Bungee + Bungee Shade
  + Fredoka; halftone dots; bold move = **hard sticker-shadows + tilted polaroid/ticket rows** that
  straighten on hover, a counter-rotating starburst badge; "EST. 1994," 📼 cassette motif.
  (`…/original-mockups/Totally Rad Bash.html`)

### 2.7 The casual-phrase → concept seed map (OLD/SUPERSEDED mechanism, still-useful taste)

The DIRECTOR doc shipped an inference table (parametric knobs are SUPERSEDED, but the *concept seeds*
illustrate the taste): "obsessed with mermaids/ocean → under-the-sea kingdom"; "old money / prestigious
/ legacy → private-club heritage (deco, oxblood/gold/ivory)"; "loud / blowout / send it → maximal
hype"; "intimate / just us / cozy → handwritten note"; "boss babe / empire / luxe → fashion-house
editorial (didone)"; "vintage / throwback / retro → era-postcard (70s)"; "spooky / dark / moody →
after-midnight"; "zen / calm / mindful → negative-space ritual." DIRECTOR's note: "The **`concept`
string is the important output** — knobs are downstream of it." (`…/DESIGN_DIRECTOR_AGENT.md §2.2`)
And the concept-generator move-set (DIRECTOR §3.3): literal metaphor · era transport · object-as-system
· place · ritual · tension/juxtaposition ("black-tie but it's a roast — the friction *is* the idea").

---

## 3. THE MOCKUPS THAT SET THE QUALITY BAR (the literal moat reference)

**Trust order (from `…/reference/REFERENCE.md`, confirmed by the manifest): "the mockups >
engine/renderer.js > the prose docs (JUMPOFF / this folder). If a doc contradicts what a mockup
actually does, the mockup wins."** The mockups are the source of truth for quality, not the prose.

### 3.1 The 15 mockups — list with locations

**The original 10** (`origin/claude/gallant-planck-pu51x:peek-jumpoff/reference/original-mockups/`) —
"⭐ THE BAR — earliest, strongest" (`…/DESIGN_EXPORT_MANIFEST.md`):
1. **Charity Gala** ("The Lumière Gala") — ⭐ exemplar — engraved gala, Bodoni Moda, emerald/brass.
2. **Omakase Evening** ("HANABI") — ⭐ exemplar — entrusted JP counter, Shippori Mincho + kanji.
3. **HEMLOCK – Field Collection** — outdoor-brand product-drop lookbook, Source Serif 4.
4. **Cyber Rave** ("AFTERGLOW") — glitch-terminal warehouse rave, Chakra Petch, neon.
5. **Disco Birthday** ("Boogie Wonderland") — vinyl record sleeve, Lilita One + Yellowtail.
6. **Garden Party** (for Eloise) — engraved botanical, Marcellus + Tangerine.
7. **Princess Party** (Lily) — royal storybook, Pinyon Script + Cormorant Garamond.
8. **Space Mission Party** ("Mission: Cosmo") — mission-control HUD, Space Grotesk.
9. **Totally Rad Bash** (Jade) — Memphis/Y2K sticker sheet, Bungee.
10. **Bachelor Party** ("The Last Ride") — casino-noir boarding pass, Oswald + Space Mono.

**The 5 newer "gift-bundle core" mockups** (`…/peek-jumpoff/mockups/`) — "⭐ strong, later — the
gift-bundle core … made to cover the gift/care-package product the original 10 didn't … these prove
the method generalizes to gifts":
11. **For the Old Man** (dad's 60th) — hardware work order, Oswald + Roboto Mono.
12. **The Send-Off** (college care package) — varsity roster, Graduate + Hanken Grotesk.
13. **Soft Landing** (new parents) — dawn-wash + meal-train calendar, Newsreader + Mulish (the *quiet* one).
14. **Decree Absolute** (divorce party) — legal court decree, Libre Baskerville + Special Elite.
15. **El Taquito** (backyard taco night) — lotería card, Yeseva One + Rubik.

(There is also a `Mockups Gallery.html` — just an iframe shell that scrolls all five newer phones side
by side; tagline "five bespoke pages · same brain (FIRST_TRY), wildly different worlds." Not itself a
design.)

### 3.2 What makes them the bar (the recurring anatomy of caliber)

From NOTE_TO_SELF (`…/reference/NOTE_TO_SELF.md`) — the distilled "why these are great":

> "**ONE committed concept per page**, cascaded into its own **type system, palette, motifs, genre
> codes, copy voice.** Gala = Bodoni Moda italic, emerald/brass/ivory, engraved, live countdown, 'Lot
> No. 01' … Omakase = Shippori Mincho + kanji numerals 一二三, washi/sumi/seal-red, hanko stamp, '一期
> 一会' proverb band, course progression, omiyage. **Radically different souls.**"

**What VARIES = the soul (protect it):** "concept · display/body/accent fonts · palette · scene/motif
· media frame · section archetypes · copy voice · genre-authentic details. **#1 sin = same font/shape
on every page (the Fraunces×5 trap).**" **What's CONSTANT = the bones:** the page anatomy (hero → 2–4
content sections → action → footer) + the **mobile interaction system** (fixed nav that solidifies on
scroll; hamburger → staggered slide menu; **sticky bottom action bar that appears after the hero**;
**bottom sheet** for item detail; scroll-reveals; count-ups) — "Identical quality, just re-skinned by
theme tokens." All read beautifully on phone AND desktop from one file.

### 3.3 Concrete visual proof these set the bar (DOM-verified)

The 2026-06-01 design review (`docs/DESIGN_REVIEW_2026-06-01.md §1`) measured live DOM against the
mockups and confirmed caliber when matched: e.g. dad-60th hero "FOR THE OLD MAN in **Oswald @103px**,
exact palette **kraft #C9B795 / olive #39411F / rust #B0532A**," neon rave "PLUG IN in **Orbitron
@114px**, neon magenta #FF2D95 / cyan #28E0FF on near-black, and crucially the **scene animates**."
This is the measurable definition of "good": exact concept-specific type/palette + real motion.

---

## 4. THE AESTHETIC-QUALITY-GATE CONCEPT (valid ≠ beautiful)

This is the corpus's deepest strategic idea, and the reason the whole architecture is shaped the way
it is.

### 4.1 The two-requirement split — valid is the floor, beautiful is the bar

The DESIGN_PROJECT_BRIEF makes it explicit (`recon-assets/DESIGN_PROJECT_BRIEF.md §4`): "A produced
gift page must satisfy **two requirement sets simultaneously**" — **4a. Visual** ("Premium, art-
directed quality consistent with the project's reference mockups … One coherent design concept per
page … A distinct display typeface chosen per page; not a shared default") and **4b. Functional**
(cards, rules engine, experiences-as-itineraries, taunts, claim mechanic…). A page that satisfies only
4b is *valid but not beautiful* — and that is a failure.

The DIRECTOR doc frames the same split as the **division of labor that protects the moat**: "**The
Resolver = assembly.** Pure, deterministic … guarantees the magic never produces a broken or ugly
combination" vs. "**The Director = judgment** … the part that looks like 'magic' and can't be a lookup
table." Critically: "A resolver alone gives you 'correct.' A concept gives you 'designed.'"
(`…/DESIGN_DIRECTOR_AGENT.md §1`). **Validity is mechanical; beauty is judgment.** The product is only
defensible on the judgment half.

### 4.2 The rejected approach proves the gate exists

The corpus contains a literal experiment: a deterministic parametric design engine
(`…/reference/engine-parametric-REJECTED/resolver.js` + `director.js`). It produced **valid** pages.
It was **rejected** because valid wasn't beautiful: "this is the 'lookup-table taste' approach we
concluded was the WRONG ceiling. Output is coherent but **housey — a notch below 01/02**."
(`…/DESIGN_EXPORT_MANIFEST.md`). The MAP states the settled call: "**The model IS the resolver.** …
There is **no mandatory deterministic design engine**; that would cap quality at what its lookup
tables know — the ceiling this whole project exists to avoid." (`…/00_MAP.md §4`). **The entire
architecture pivots on the recognition that valid ≠ beautiful, and only an unconstrained model can
clear the beautiful bar.**

### 4.3 How the gate is run in practice — three forms

1. **The 10-point gate in the model's head, pre-authoring** (SEAT §1.8 above) — with 5 fatal axes.
2. **The self-critique rubric, OLD form** (DIRECTOR §5) — "Score each 0–2; **ship at ≥ 24/30 AND no
   zeros**; else patch the lowest and re-render." 10 axes: Concept clarity, One bold move, Hierarchy,
   Restraint, Type, Color, Authenticity, Copy voice, Specificity, Slop check. (The SEAT replaced this
   numeric rubric with the leaner 10-point gate + "one self-patch at most.")
3. **The cold range test** (TIPS "The test loop") — the *organizational* gate: "**Range, not
   specimens** — original-10 caliber on *arbitrary, unseen* input. Test by throwing 10 weird briefs
   cold" ("get-well for my coworker who broke his leg skiing," "going-away for the office cat,"
   "engagement for two software engineers"). "Range is the metric, not any single hit." Plus the
   **safeword loop**: the model drops persona and reports "what it inferred, what the pantry lacked,
   what it faked, what fought it, what'd make it gnarlier. **This is the gold.**"

### 4.4 The "if it could be anyone's, it's wrong" test (the specificity gate)

The final, most-quoted aesthetic test — DIRECTOR #15 / JUMPOFF / SEAT gate axis (8):

> "**If it could be anyone's, it's wrong.** The final test: could this site belong to a different
> event? If yes, the concept didn't bite hard enough. Make it unmistakably *this* one (the
> recipient's name in the type, the in-joke in the copy, the gift as the hero)."
> (`…/DESIGN_DIRECTOR_AGENT.md §4.15`)

### 4.5 The valid-but-generic failure, diagnosed in the wild (GAP_ANALYSIS)

`…/reference/GAP_ANALYSIS.md` is the most concrete proof of the gate: it pairs renderer output against
the mockups and shows *exactly* how a valid page reads generic. Its verdict: "the renderer expresses
every IR through **single-skin, structurally-fixed archetypes**, while the mockups' caliber lives in
**concept-specific structural treatments** … a hardware work-order, an engraved auction catalogue, and
a lotería invite all collapse toward the same tasteful card-grid template." Specific losses: dad's
work-order checklist flattened to "a horizontal carousel of square photo cards (generic e-commerce)";
the gala's stat band + headline-lot "missing entirely"; el-taquito's hard-offset shadows gone ("the
single missing token … is the difference between 'loud handmade' and 'clean template'"). **This is the
empirical face of valid≠beautiful** — and it is the strongest argument in the corpus for the SEAT's
later resolution (let the model author raw HTML so there are no archetypes to collapse into).

---

## 5. CONCRETE VISUAL / TYPOGRAPHY / MOTION GUIDANCE

This consolidates the *executable* specifics. **Caveat:** the detailed shell/token spec
(`…/reference/SHELL_SPEC.md`) describes the **OLD renderer-with-tokens** architecture (a `--peek-*`
CSS-var renderer that the CURRENT SEAT supersedes by having the model author raw CSS). The *values*
(easings, thresholds, font axes, technique recipes) remain the best concrete reference and were lifted
directly from the mockups' inline source; use them as the recipe book, not as a token contract.

### 5.1 Typography

- **One characterful display face per page; never repeat it.** Hero = **4–6× body** ("dramatic, not
  timid"). The recipient's **name lives in the type** as a hero element, never a label. (SEAT `:23`)
- **The full font set across the 15 mockups** (from SHELL_SPEC §4 — proof of range; the loader is a
  floor, the model may pick any Google family + axis): Bodoni Moda, Jost, Shippori Mincho, Zen Kaku
  Gothic New, Chakra Petch, Share Tech Mono, Lilita One, Yellowtail, Nunito, Marcellus, Tangerine,
  Mulish, Pinyon Script, Cormorant Garamond, Quicksand, Source Serif 4, Space Grotesk, Space Mono,
  Bungee, Bungee Shade, Fredoka, Oswald, Barlow, Graduate, Hanken Grotesk, Libre Franklin, Newsreader,
  Libre Baskerville, Special Elite, Yeseva One, Rubik, Work Sans, Roboto Mono. **33 families, almost no
  repeats** — the anti-Fraunces×5 discipline made literal.
- **Inline accent word in the headline** is a signature move: rust "OLD MAN," italic "Lumière," the
  hard-shadowed "TACOS & TEQUILA." (The renderer's inability to carry this was a top GAP finding.)
- **Eyebrow tracking varies hugely** by concept (`.20em`–`.42em`), uppercase; display tracking often
  negative on big serif heroes, positive/uppercase on condensed/sans.

### 5.2 Color

- **One dominant accent; tints/shades for the rest; a new hue only for a real second accent; never a
  rainbow unless rainbow IS the idea.** "AA contrast, no accidental rainbow." (SEAT gate axis 5;
  JUMPOFF "ruthless about restraint"). Each mockup ships a tight 6–9 swatch palette as CSS vars
  (e.g. gala emerald/brass/champagne; taco rosa/cobalt/marigold/green; dad kraft/olive/rust).
- **Loud vs. quiet decorative vocabulary** (GAP_ANALYSIS cross-cutting finding #2): loud concepts use
  **hard offset shadows** (`Xpx Ypx 0 color`), **thick ink borders** (3–4px), **dashed perforations**,
  **punched notches**, **colored section panels**; quiet concepts use thin 1px borders, soft radii,
  one glow token, faint grain. Matching the volume to the object is the skill.

### 5.3 Motion (build by hand from CSS/SVG primitives; one signature move; behind the words)

- **One signature motion born from the object** (SEAT `:18-19`): spinning record / orbiting moon /
  draining meter / glitching headline / chasing marquee / holographic shimmer / pulsing beacon.
- **Hero entrance cascade** ("the title types itself in"): hero children `opacity:0;
  transform:translateY(30px); animation:rise 1.2s cubic-bezier(.2,.7,.2,1) forwards` with staggered
  `animation-delay` (eyebrow .1s → h1 .28s → sub .46s → count .62s → meta .78s → cta .92s → scroll-cue
  1.1s). (SHELL_SPEC §1.5B, from Charity Gala)
- **Scroll reveal:** `.reveal{opacity:0; transform:translateY(26px); transition ~.8s
  cubic-bezier(.2,.7,.2,1)}` + `.in` clears; IntersectionObserver `{threshold:.14, rootMargin:'0 0
  -8% 0'}`; **stagger grid siblings** `transition-delay = i*90ms`; **failsafe** force-reveal after
  ~1100ms so nothing stays invisible. (SHELL_SPEC §1.5A)
- **Count-up numerals:** tween 0→target over **1600ms**, ease-out cubic `1-(1-p)^3`, snap at end; for
  stat bands and (optionally) the running total. **Live countdowns / mission clocks** are a sibling
  `setInterval(…,1000)` pattern (Charity countdown; Space count-UP "T+ hh:mm:ss"). (SHELL_SPEC §1.6)
- **Ambient scene techniques** (CSS-only recipes from the mockups): `grain` = `feTurbulence`
  fractalNoise SVG at opacity .05–.07; `starfield` = N stars as one element's `box-shadow` list +
  twinkle; `gridfloor` = `perspective:340px` + `rotateX(72deg)` + scrolling linear-gradient lines;
  `sunburst`/`rayfan` = `repeating-conic-gradient` wedges + radial mask; `mirrorball` = radial sphere +
  facet grids + spin; `vinyl` = `repeating-radial-gradient` grooves + `conic-gradient` shine + spin;
  `marquee` = duplicated flex track `translateX(-50%)` 18–32s linear; `radar` = repeating-radial rings
  + conic sweep. (SHELL_SPEC §3)
- **Reduced-motion is mandatory** — every mockup ends with a `@media (prefers-reduced-motion:reduce)`
  block that kills ambient loops and resolves reveals instantly; functional slides (sheet/menu/bar) are
  kept but shortened. (SHELL_SPEC §1.7; SEAT "always honor `prefers-reduced-motion`.")

### 5.4 The shared mobile interaction system (the constant "bones" — phone-first)

SEAT craft `:22`: "**Phone first, always.** … thumb-reach actions, a sticky bottom bar, a bottom sheet
for detail, big targets, one ~390–430px column. The chat floats over the page in glass, so keep the
hero and the hierarchy bold even when it's ~60% covered; never bury the headline mid-fold. Desktop is
the enhancement from the same document. Honor `env(safe-area-inset-*)`." The shell pieces (constant
across all 15; SHELL_SPEC §1): top bar that solidifies/condenses on scroll; hamburger → **staggered**
slide-in menu (`delay = base + i*step`, base ≈.08s, step ≈.06s; menu links in big display font with a
concept-themed index glyph — roman numerals / kanji / `// 01` / `✦`); **sticky bottom action bar**
holding the **live running total** + in-world CTA, revealed when the hero scrolls out (IO at rootMargin
~-45%); **bottom sheet** for item detail (grab handle, claim toggles a concept-named "claimed/reserved/
aboard" state + recomputes the total + auto-closes ~950ms). The action bar IS the business (the $12
publish / the pick mechanic). Note: in the CURRENT SEAT model these behaviors are the **host runtime**
the model only *tags* (`data-peek-*`) and *styles per state* — but the visual grammar above is what
"good" looks like.

### 5.5 Imagery treatment

Every image slot is framed/masked/duotoned/scrimmed to belong to the object — "a bare rectangle is a
decision you forgot." Frame catalog from the mockups: vinyl, porthole, polaroid, arch, locket, idcard,
ticket/stub (punched notches + perforation), stamp, wax-seal/hanko. **Use a real image (host-filled
slot) when CSS would only fake it** — glass/metal/skin/fur/photoreal and **especially the recipient's
actual face** ("their face refracted inside the crystal ball … the trading-card portrait, the face in
the locket"). (SEAT `:26-27`)

---

## 6. THE ONE STRATEGIC THREAD TO CARRY FORWARD (for the CTO)

Everything above converges on a single defensible claim and one resolved architectural bet:

1. **The moat is taste, encoded as a peer-to-peer "seat," not features or templates.** The product
   wins on the gap between default and designed; that gap is only crossable by an unconstrained model
   running the kill-noun → object → obey method and clearing the 10-point gate.
2. **valid ≠ beautiful is the founding insight, and it was proven empirically.** A deterministic engine
   produced valid-but-"housey" pages and was rejected; the renderer-with-archetypes flattened distinct
   objects into one template (GAP_ANALYSIS). **Resolution (CURRENT SEAT): the model authors raw
   HTML/CSS/SVG directly** — no archetype zoo to collapse into — and the host runtime is a thin
   behavioral layer it only *tags*. This is the single most important design-architecture decision in
   the corpus, and it is what the SEAT operationalizes.
3. **The aesthetic gate has three altitudes:** the model's pre-authoring 10-point gate (5 fatal axes);
   the cold-range test (10 weird briefs, "range not specimens"); and the safeword report loop for
   tuning. The 15 mockups are the immutable quality bar against which all three are judged — "if a doc
   contradicts what a mockup does, the mockup wins."

---

### Appendix — every design-relevant artifact found (for re-audit)

- **CURRENT doctrine:** `peek-zips/deployed/peek-design-seat.md`, `peek-zips/deployed/netlify/seat.ts`
  (identical text); snapshots at `origin/claude/tender-babbage-ukn6Q:_claude/snapshots/{deployed,iterated}/…`.
- **Prose doctrine (OLD, on all 3 target branches under `peek-jumpoff/`):** `JUMPOFF.md`, `00_MAP.md`,
  `README.md`, `TIPS.md`, `FOR_CODE.md`, `reference/DESIGN_DIRECTOR_AGENT.md`, `reference/REFERENCE.md`,
  `reference/NOTE_TO_SELF.md`, `reference/DESIGN_EXPORT_MANIFEST.md`, `reference/GAP_ANALYSIS.md`,
  `reference/SHELL_SPEC.md`, `reference/vision/{CONCEPT_BREAKDOWN,REQUIREMENTS_SPEC,BACKEND_SERVICES,README}.md`.
- **The 15 mockups:** `peek-jumpoff/reference/original-mockups/*.html` (10) +
  `peek-jumpoff/mockups/*.html` (5) + `peek-jumpoff/mockups/Mockups Gallery.html`.
- **Recon design docs:** `recon-assets/DESIGN_PROJECT_BRIEF.md`, `recon-assets/DESIGN_ENGINE_TOOLKIT.md`,
  `recon-assets/mockup-old-man.png`.
- **Other:** `DESIGN_QUESTIONS.md`, `docs/DESIGN_REVIEW_2026-06-01.md`, samples
  `peek-jumpoff/samples/{charity-gala,dad-60th,el-taquito}.ir.json`.
- **REJECTED (do not build):** `peek-jumpoff/reference/engine-parametric-REJECTED/{resolver,director}.js`.
- **Dead path:** `_packets/SPINE/skills/**` does not exist (only operational `_packets/SPINE/*.md`).
