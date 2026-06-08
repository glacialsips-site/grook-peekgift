# PANTRY-TOKENS — The Reusable Design Vocabulary ("the pantry the model draws from but is never limited to")

**Author:** recon agent · **Date:** 2026-06-08 · **For:** CTO
**Mandate:** Mine the reusable design vocabulary across the design/vibe branches. Capture it as a usable menu with sources. KEEP all of this as cached model context / safety-net. DROP only the *closed-vocabulary cage* — i.e. never enforce these enums as the *only* legal values; they are a pantry (a floor and a suggestion), not a gate.

**READ-ONLY recon.** Nothing was checked out, edited, or committed. All citations are `branch:path` via `git show`. Real names/hex/values quoted verbatim.

---

## 0 · WHERE THE PANTRY LIVES (source map + CURRENT vs DEAD)

There are **TWO PARALLEL DESIGN ENGINES** in the tree. Both are pantry. They overlap conceptually but use different schemas/vocabularies. Mining both is the point.

| Engine | Vocabulary home | Status | Branches |
|---|---|---|---|
| **A. Atelier "7-dial / grammar" engine** (OKLCH, presets, occasion templates) | `atelier/lib/vibe/grammar/*.ts`, `atelier/lib/anthropic/skills/*` | **CURRENT** (this is the live `atelier` app; `peek-clean` is the clean snapshot) | `origin/peek-clean`, `origin/claude/research/depth-layer-ux` |
| **B. peek-jumpoff "ThemeSpec / WORLDS" engine** (worlds, named palettes, scenes/frames/motifs, IR) | `peek-jumpoff/engine/parts.js`, `lib/peek-render/*.ts`, `lib/ir/contract.ts`, `recon-assets/DESIGN_ENGINE_TOOLKIT.md` | **REFERENCE / pantry** (the "jumpoff" reference engine; the `engine-parametric-REJECTED/` sibling is **DEAD**) | `origin/claude/bold-feynman-SZzaO`, `origin/claude/gallant-planck-pu51x` |
| **C. vibe-genome / vibe-harmony packages** (knob schemas, design-DNA catalog) | `workspace/peek/packages/vibe-genome/`, `workspace/peek/packages/vibe-harmony/`, `workspace/peek/docs/design-dna-catalog.md` | **RESEARCH** (the knob-axis distillation; superseded conceptually by A's grammar but the *knob axes* are reusable pantry) | `origin/claude/jolly-mccarthy-QMqC9` |

**The single richest pantry document** is the §10 toolkit referenced in the BUILD-BOOK:
> `origin/claude/gallant-planck-pu51x:recon-assets/DESIGN_ENGINE_TOOLKIT.md` (1130 lines, "Master Vocabulary Catalog"). It is the externalized vocabulary behind the 10 occasion-site mockups. **It explicitly tags every entry `REUSABLE` / `HYBRID` / `ADHOC`** — that honesty key IS the keep/drop signal.
> (Same file also at `origin/claude/in-site-chat-buildout`, `origin/claude/studio-integration`, `origin/claude/studio-vnext`, and the `…-snapshot-2026-06-02` branch.)

DEAD / do-not-mine: `peek-jumpoff/reference/engine-parametric-REJECTED/{director.js,resolver.js}` (explicitly rejected parametric approach).

---

## 1 · THE FONT / PERSONALITY TAXONOMY (groups + "pairs with")

### 1A · Master font index — 17 personality groups (the engine's primary selection buckets)
Source: `origin/claude/gallant-planck-pu51x:recon-assets/DESIGN_ENGINE_TOOLKIT.md` §1.1–1.17. Each group = a `fontClass`. A theme picks **one display class + one body class + (rarely) one script/mono accent**. Honesty tag in caps.

| # | Group | Tag | Vibe / occasions | Representative families |
|---|---|---|---|---|
| 1.1 | **Didone / high-contrast display** | REUSABLE | fashion, luxury, editorial, galas, perfume | Playfair Display, Bodoni Moda, Abril Fatface, DM Serif Display, Cormorant Garamond, Italiana, Prata, Gilda Display, Rufina, Bodoni Moda SC |
| 1.2 | **Classical / transitional serif** (body workhorses) | REUSABLE | heritage, literary, default warm body | Source Serif 4 (house body), Lora, EB Garamond, Libre Baskerville, Crimson Pro, Spectral, PT Serif, Vollkorn, Domine, Cardo, Sorts Mill Goudy, Newsreader, Literata |
| 1.3 | **Humanist / quirky-modern serif** | REUSABLE | brands, boutiques, "crafted" | Fraunces, Bitter, Zilla Slab, Roboto Slab, Aleo, Frank Ruhl Libre, Piazzolla |
| 1.4 | **Neo-grotesque & grotesque sans** (UI/brand) | REUSABLE | SaaS, neutral, modern brand | Inter, Work Sans, Manrope, Archivo, Space Grotesk, Hanken Grotesk, Schibsted Grotesk, Bricolage Grotesque, Sora, Be Vietnam Pro, Plus Jakarta Sans, Public Sans, Familjen Grotesk, Darker Grotesque |
| 1.5 | **Geometric & rounded sans** | REUSABLE | startup, minimal, kids/wellness | Poppins, Montserrat, Jost, Outfit, Urbanist, League Spartan, Questrial, Comfortaa, Quicksand, DM Sans, Figtree, Lexend |
| 1.6 | **Humanist sans** (warm body) | REUSABLE | approachable body | Source Sans 3 (house UI), Open Sans, Nunito Sans, Mulish, Karla, Rubik, Lato, Assistant, Cabin, PT Sans |
| 1.7 | **Condensed / compressed** | REUSABLE | impact, sport, posters | Oswald, Bebas Neue, Anton, Archivo Narrow, Fjalla One, Saira Condensed, Barlow Condensed, Pathway Gothic One, Teko, Khand, Staatliches |
| 1.8 | **Chunky / fat display** | REUSABLE | loud, fun, kids, sale | Archivo Black, Alfa Slab One, Bungee, Titan One, Luckiest Guy, Passion One, Bowlby One SC, Lilita One, Paytone One, Sigmar, Climate Crisis |
| 1.9 | **Retro / groovy / 70s–80s** | HYBRID | disco, funk, diner | Shrikhand, Bagel Fat One, Monoton, Righteous, Audiowide, Lobster, Pacifico, Codystar, Bungee Shade, Kalnia |
| 1.10 | **Script / handwriting / signature** | REUSABLE | weddings, invites, personal | Great Vibes, Pinyon Script, Allura, Parisienne, Tangerine, Sacramento, Dancing Script, Yellowtail, Satisfy, Caveat, Kalam, Shadows Into Light, Cookie, Petit Formal Script, Mr Dafoe/Mr De Haviland, Birthstone/Ms Madi |
| 1.11 | **Elegant uppercase / fashion-caps / deco-glam** | REUSABLE | luxury, gala, spa, wine | Cinzel, Cinzel Decorative, Marcellus/Marcellus SC, Forum, Cormorant SC, Tenor Sans, Poiret One, Megrim, Limelight, Della Respira, Antic Didone, Josefin Sans |
| 1.12 | **Techno / mono / digital / sci-fi** | REUSABLE | cyber, space, HUD, dev | Space Mono, JetBrains Mono, IBM Plex Mono, Major Mono Display, Share Tech Mono, VT323, Orbitron, Audiowide, Michroma, Chakra Petch, Rajdhani, Syncopate, Tektur, Wallpoet, Exo 2, Nova Square/Nova Mono |
| 1.13 | **Pixel / arcade / Y2K** | HYBRID | 8-bit, retro game | Press Start 2P, Silkscreen, Pixelify Sans, Jersey 10/15/25, Handjet, DotGothic16 |
| 1.14 | **Blackletter / gothic / metal** | ADHOC | medieval, tattoo, metal | UnifrakturMaguntia, UnifrakturCook, Pirata One, Grenze Gotisch, Eagle Lake |
| 1.15 | **Playful / kids / storybook** | REUSABLE | kids, party | Fredoka, Baloo 2, Chewy, Bubblegum Sans, Grandstander, Patrick Hand, Schoolbell, Gochi Hand, Coming Soon, Sniglet, Modak |
| 1.16 | **Western / vintage Americana / circus** | ADHOC | saloon, carnival | Rye, Sancreek, Smokum, Ewert, Bigshot One |
| 1.17 | **Stencil / military / industrial** | REUSABLE | military, crate | Black Ops One, Stardos Stencil, Saira Stencil One, Allerta Stencil, Wallpoet |

### 1B · Pairing rules (§2.1 of toolkit) — `REUSABLE`
1. **Contrast of CLASS, not mood.** Pair across categories (serif display × sans body, or vice-versa). Same-class only if one is far heavier weight.
2. **Mood must agree.** Both families share the occasion's adjective set. Didone + geometric-sans = luxury; fat-display + rounded-sans = party.
3. **One voice leads.** Display talks (big, tight); body stays quiet (neutral, `line-height 1.5–1.65`).
4. **x-height harmony** for body (Inter / Work Sans / Source Sans = safe universal bodies).
5. **Tracking by size.** Display tighten `-0.01em…-0.04em`; all-caps eyebrows open `+0.12em…+0.22em`; body `0`.
6. **Max two families + maybe one script accent.** Three text families = ceiling.
7. **Numerals matter** for prices/itineraries: `font-variant-numeric: tabular-nums lining-nums`.

### 1C · The 10 proven "pairing presets" (the named pairings, engine presets)
Source: `…DESIGN_ENGINE_TOOLKIT.md` §2.1 JSON block. `{display, body, accent?, vibe[]}`:

| Name | display | body | accent | vibe |
|---|---|---|---|---|
| Heritage | Fraunces | Inter | — | earthy, crafted, outdoor |
| Gala | Cinzel | Cormorant Garamond | Pinyon Script | black-tie, formal |
| Fashion | Bodoni Moda | Work Sans | — | luxury, editorial |
| Zen | Marcellus | Mulish | — | calm, japanese, minimal |
| Disco | Shrikhand | Poppins | — | 70s, funk, party |
| Cyber | Orbitron | Rajdhani | Share Tech Mono | y2k, rave, neon |
| Princess | Dancing Script | Quicksand | Baloo 2 | kids, sweet, fairytale |
| Memphis | Archivo Black | Space Grotesk | — | 80s, maximal, playful |
| MissionCtrl | Saira Condensed | Space Mono | — | retro-tech, space |
| Garden | Cormorant | Nunito Sans | — | botanical, soft, organic |
| Casino | Cinzel Decorative | Jost | Monoton | high-roller, deco, noir |

### 1D · Grammar engine's 5 abstract FONT ROLES + LEGAL_FONT_PAIRS (engine A, the live contract)
Source: `origin/peek-clean:atelier/lib/vibe/grammar/grammar.ts`.
- Roles: `serif` (Fraunces, Playfair, Cormorant) · `sans` (Inter, Geist, Manrope) · `display` (Anton, Bowlby One, Abril Fatface) · `mono` (JetBrains Mono, IBM Plex Mono) · `script` (Caveat, Dancing Script).
- `LEGAL_FONT_PAIRS` (display,body) — the never-ugly set; anything else is auto-repaired to nearest legal body:
  `[serif,serif] [serif,sans] [sans,sans] [sans,serif] [display,sans] [display,serif] [display,mono] [mono,sans] [mono,mono] [script,serif] [script,sans]`
- `nearestLegalBody()` preference order when repairing: sans → serif → mono (`engine.ts`).

### 1E · The loadable font registry (the "FONT_SPECS pantry" — a floor, NOT a gate)
Source: `origin/claude/bold-feynman-SZzaO:lib/peek-render/fonts.ts` (~50 families with Google css2 axis queries) + `peek-jumpoff/engine/parts.js` FONT_SPECS (30 families). Key comment (`fonts.ts`): *"the built-in registry is a floor, NOT a gate … FONT_SPECS is a pantry suggestion"* — model may pick ANY family; loader synthesizes an axis query from weights if unknown. Fallback classes computed from `SERIFS` / `SCRIPTS` / `MONO` sets.

### 1F · vibe-genome `displayClass` enum (engine C, knob form)
Source: `origin/claude/jolly-mccarthy-QMqC9:workspace/peek/packages/vibe-genome/src/index.ts`: `didone · classical-serif · humanist-serif · grotesque · condensed · chunky-block · script-led · techno-mono`. Pairing knob: `harmonious · contrast · superfamily · expressive-neutral`. Case knob: `sentence · title · upper · lower · expressive`.

---

## 2 · NAMED PALETTES + WORLD BUNDLES + COLOR-HARMONY SCHEMES

### 2A · The 20 named example palettes (hex) — `REUSABLE`
Source: `…DESIGN_ENGINE_TOOLKIT.md` §3.2 (mirrored in `peek-jumpoff/engine/parts.js` PALETTES and `lib/peek-render/theme.ts` shape). Recipe per palette = `{ bg, surface, ink, muted, line, accent, accent2?, glow? }`.

| Palette | mode | bg | surface | ink | muted | line | accent | accent2 | glow | vibe |
|---|---|---|---|---|---|---|---|---|---|---|
| **Hemlock Field** | light+grain | #FBF6EC | #FFFFFF | #23190F | #7A6A55 | #E7DAC4 | #9A5B33 | #5E6B4F | — | earthy, heritage, outdoor |
| **Forest Lodge** | dark | #15140F | #211E16 | #EDE4D2 | #9C9277 | #34301F | #C8772E | — | wood, cabin, rugged |
| **Ballroom Noir** | dark | #0E0D10 | #16151A | #F2EEE6 | #9D97A6 | #2A2730 | #CBA14A | #7E1E2B | — | black-tie, gala, luxury |
| **Champagne** | light | #F7F1E8 | #FFFFFF | #2C2622 | #8A7E70 | #EADDCB | #B9925A | #7C2233 | — | wedding, elegant, soft-luxe |
| **Casino Gold** | dark | #0B0D10 | #121620 | #F4EFE2 | #8C93A1 | #23303f | #E8C35A | #E0245E | — | high-roller, deco, bachelor |
| **Disco Heat** | dark+glow | #1A0A1F | #28103a | #FFF3DA | #C79CCB | #3a1b4d | #FF7A29 | #F4C04E | yes | 70s, funk, party |
| **Cyber Afterglow** | dark+glow | #05060E | #0B1024 | #EAFBFF | #7FA6C8 | #16204a | #FF2D95 | #28E0FF | #B388FF | y2k, rave, neon |
| **Vapor Sunset** | dark+gradient | #180A2B | #24123f | #FFE9F6 | #C79AD8 | #3a1c5e | #FF61C6 | #7B5Cff | yes | retrowave, dreamy |
| **Mission Control** | dark | #0A0E12 | #11181F | #E6EEF2 | #7E909B | #1f2a33 | #F2A33C | #43C5C9 | — | space, retro-tech |
| **Deep Space** | dark | #070914 | #0E1226 | #E8ECFF | #7C84B0 | #181e3c | #8AB4FF | #C9A6FF | — | cosmic, mystery |
| **Princess Pastel** | light | #FFF1F7 | #FFFFFF | #5A2A55 | #B07AA0 | #FBD9E8 | #FF7FB6 | #B59CFF | — | kids, fairytale, sweet |
| **Cotton Candy** | light | #F4FBFF | #FFFFFF | #3A4A66 | #8AA0BE | #DCEFFB | #7CC6FF | #FFAFD7 | — | soft, playful, baby |
| **Memphis Pop** | light | #FDF4E3 | #FFFFFF | #1C1B22 | #6c6a78 | #1C1B22 | #FF4D6D | #2EC4B6 | — | 80s, maximal, fun |
| **Rad Bash** | light | #10D8C9 (toolkit lists #11E0D0) | #FFFFFF | #13123A | #5b5a86 | #13123A | #FF2E88 | #FFE03A | — | 90s, arcade, loud |
| **Botanical Garden** | light | #F2F6EC | #FFFFFF | #26331F | #6E7B5F | #DDE7CC | #5E8C4A | #E59AB0 | — | nature, fresh, brunch |
| **Sage Linen** | light | #F1EFE6 | #FBFAF4 | #2C3128 | #7E8472 | #E0DECF | #7A8B6F | #A98E63 | — | wellness, calm, spa |
| **Hanami Ink** | light | #F6F3EC | #FFFFFF | #1C1B18 | #82796B | #E5DECF | #B23A33 | #2E2A26 | — | japanese, zen, omakase |
| **Sumi Night** | dark | #11100E | #1A1816 | #EFE9DC | #9A9079 | #2a2722 | #C4452F | #B89968 | — | japanese, moody, izakaya |
| **Coastal Citrus** | light | #FFFBF0 | #FFFFFF | #173A4A | #5e8294 | #DCEFF0 | #FF8A3C | #2BB1C4 | — | summer, beach, bright |
| **Merlot Editorial** | light | #F7F0EC | #FFFFFF | #2A1719 | #8a6c66 | #E7D6CE | #7C2233 | #C68A3E | — | wine, autumn, refined |

> Note: `parts.js` adds `texture:true` flags on Hemlock Field / Sage Linen / Hanami Ink. Minor hex disagreement on Rad Bash bg (parts.js `#10D8C9` vs toolkit `#11E0D0`) — both are pantry; pick either.

### 2B · The 10 WORLD bundles (anchor knobs + full token bundle) — engine B
Source: `origin/claude/bold-feynman-SZzaO:peek-jumpoff/engine/parts.js` WORLDS + `…DESIGN_ENGINE_TOOLKIT.md` §10.3. A "world" = a labeled point in knob-space with an attached preset bundle (`fonts · palettes · scenes · motifs · frames · sections · hero · cta · voice`). The generator snaps to the nearest world (weighted Euclidean over knobs), optionally blends top-2.

| World | fonts (display/body/accent) | palettes | scenes | motifs | frames | sections | hero | cta | voice |
|---|---|---|---|---|---|---|---|---|---|
| **Heritage** | Fraunces / Inter / Inter | Hemlock Field, Forest Lodge, Sage Linen | topo, grain | star, stamp | stamp, arch | lookbook, rail, steps | framed-media | "Shop the collection" | crafted, understated, earthy |
| **Gala** | Cinzel / Cormorant Garamond / Pinyon Script | Ballroom Noir, Champagne, Merlot Editorial | rayfan, starfield, grain | sparkle, rule | arch, locket | tiers, stubs, lookbook | type-mega | "Register to bid" | gracious, restrained, certain |
| **Zen** | Marcellus / Mulish / Marcellus | Hanami Ink, Sumi Night, Sage Linen | grain | rule, hanko | hanko, arch | courses, steps | type-mega | "Reserve a seat" | calm, precise, quiet |
| **Disco** | Shrikhand / Poppins / Monoton | Disco Heat, Vapor Sunset | mirrorball, rayfan | star, sunburst | vinyl, polaroid | tracklist, rail, steps | framed-media | "RSVP to the floor" | groovy, warm, fun |
| **Cyber** | Orbitron / Rajdhani / Share Tech Mono | Cyber Afterglow, Vapor Sunset | gridfloor, scanlines | chrome, zigzag | idcard, polaroid | stubs, tiers, steps | type-mega | "Get tickets" | hype, loud, electric |
| **Princess** | Dancing Script / Quicksand / Baloo 2 | Princess Pastel, Cotton Candy | sunburst, confetti | crown, sparkle, dots | locket, polaroid | steps, rail | centered | "RSVP" | wonder-struck, sweet, magical |
| **Memphis** | Archivo Black / Space Grotesk / Space Grotesk | Memphis Pop, Rad Bash | halftone, confetti | zigzag, dots, star | polaroid | steps, rail | centered | "Are you in?!" | loud, playful, exclamatory |
| **MissionCtrl** | Saira Condensed / Space Mono / Space Mono | Mission Control, Deep Space | starfield, blueprint | star, rule | porthole, idcard | flightplan, stubs | type-mega | "Send aboard" | precise, retro-technical |
| **Garden** | Cormorant / Nunito Sans / Cormorant | Botanical Garden, Sage Linen, Coastal Citrus | mesh, grain | leaf, sparkle | arch, locket | rail, steps | framed-media | "RSVP" | fresh, soft, organic |
| **Casino** | Cinzel Decorative / Jost / Monoton | Casino Gold, Ballroom Noir | rayfan, scanlines | suit, sparkle | stamp, idcard | stubs, tiers, steps | type-mega | "Claim the loot" | high-roller, sly, confident |

World anchor-knob vectors (verbatim, parts.js) — e.g. **Cyber**: `{formality:.1, energy:.95, whimsy:.35, warmth:.4, saturation:1, ornament:.5, contrast:.9, motion:.95, luminosity:'dark', era:'y2k'}`. **Princess**: `{formality:.2, energy:.6, whimsy:.95, warmth:.4, saturation:.6, ornament:.7, motion:.45, luminosity:'light', era:'contemporary'}`. (Full set in `parts.js` lines 79–119.)

### 2C · Color harmony schemes — `REUSABLE`
Source `…TOOLKIT.md` §3.1 + grammar `HarmonyStrategy` (`grammar.ts`) + vibe-genome `harmonySchema`. Compute off a seed hue `h` (HSL/OKLCH):

| Scheme | Hues | Feel | Accent offset in grammar engine (`engine.ts` STRATEGY_ACCENT_OFFSET / _2) |
|---|---|---|---|
| Monochrome | `h` + value steps | calm, minimal, zen | accent +0°, accent2 none |
| Analogous | `h, h±25°…±50°` | harmonious, organic, botanical | accent +32°, accent2 −32° |
| Complementary | `h, h+180°` | punchy, sport, bold | accent +180°, accent2 +150° |
| Split-complementary | `h, h+150°, h+210°` | lively but safe | accent +150°, accent2 +210° |
| Triad | `h, h+120°, h+240°` | playful, memphis, kids | accent +120°, accent2 +240° |
| Tetradic | `h, h+90°, h+180°, h+270°` | maximal, festival | (toolkit only; not in grammar engine) |
| Clash | — | (vibe-genome only) | — |

**Value modes:** `light` (paper bg) · `dark` (ink bg) · `alternating` (sections flip — "our most-used") · `duotone` (two hues).
**Surface treatments / color application:** `flat · gradient (linear/radial/conic) · glow (dark+neon shadows) · holographic (animated multi-stop) · mesh (radial blobs) · grain (overlay noise)`. (vibe-genome `colorKnobs.application = flat|gradient|glow|holographic`.)
**Saturation chroma ceilings** (grammar `engine.ts` SATURATION_CHROMA, OKLCH): `muted:0.06 · medium:0.13 · vivid:0.22`. `CHROMA_MAX=0.37`.
**Key lightness anchors** (grammar `engine.ts` KEY_LIGHTNESS, bg/surface/ink/inkMuted L): `light:{.97,.93,.22,.46} · dim:{.32,.38,.92,.74} · dark:{.17,.23,.95,.74}`.

---

## 3 · TYPE-ART / "LOUD" CSS VOCABULARY (glitch / holo / chrome / outline / gradient-clip / textPath / letterpress)

### 3A · Type-art techniques with CSS — `REUSABLE`
Source: `origin/claude/gallant-planck-pu51x:recon-assets/DESIGN_ENGINE_TOOLKIT.md` §2.2 (verbatim).

- **Outline / stroke headline** — `.h-outline{ color:transparent; -webkit-text-stroke:2px var(--ink); }` (fill on hover/alt words; "ghost layer trick" = filled+outlined stacked for depth).
- **Gradient-clip text** (neon/sunset) — `.h-gradient{ background:linear-gradient(92deg,#ff2d95,#ffd24c 45%,#28e0ff); -webkit-background-clip:text; color:transparent; }`
- **Holographic** — `.h-holo{ background:linear-gradient(120deg,#ff8ad8,#b388ff,#84f7ff,#bdffd0,#ff8ad8); background-size:300% 100%; -webkit-background-clip:text; color:transparent; animation:holoShift 6s linear infinite; } @keyframes holoShift{to{background-position:300% 0}}`
- **3D / retro offset** (Memphis/disco/arcade) — `.h-3d{ text-shadow:1px 1px var(--c2),2px 2px var(--c2),3px 3px var(--c2),4px 4px var(--c2),5px 5px rgba(0,0,0,.25); }` · `.h-longshadow{ text-shadow:0 1px 0 #c44,0 2px 0 #c44,0 3px 0 #b33,0 18px 22px rgba(0,0,0,.3); }`
- **Glitch / RGB split** (cyber/rave) — `.h-glitch` with `::before` (`#ff003c`, `clip-path:inset(0 0 55% 0)`, `mix-blend-mode:screen`, `animation:glx 2.6s steps(2) infinite`) and `::after` (`#00eaff`, `clip-path:inset(55% 0 0 0)`, reverse). `@keyframes glx{0%,92%,100%{transform:translate(0)}94%{translate(-3px,1px)}96%{translate(3px,-1px)}}` — uses `content:attr(data-text)`.
- **Neon glow / tube** — `.h-neon{ color:#fff; text-shadow:0 0 4px #fff,0 0 11px #ff32d0,0 0 22px #ff32d0,0 0 42px #b0228f; }`
- **Chrome / metallic** — `.h-chrome{ background:linear-gradient(#f8fbff 0%,#aab4c4 40%,#5a6678 50%,#dfe6ef 60%,#fff 100%); -webkit-background-clip:text; color:transparent; filter:drop-shadow(0 1px 0 #fff) drop-shadow(0 2px 1px rgba(0,0,0,.4)); }`
- **Highlight box** (multi-line marker) — `.h-mark{ display:inline; background:var(--accent); color:#fff; padding:.06em .28em; box-decoration-break:clone; -webkit-box-decoration-break:clone; line-height:1.6; }`
- **Arched / curved text** (SVG `textPath`) `HYBRID` — `<svg><path id="arc" d="M20,140 A130,130 0 0,1 280,140" fill="none"/><text><textPath href="#arc" startOffset="50%" text-anchor="middle">CELEBRATE TONIGHT</textPath></text></svg>`
- **Letterpress / embossed** (heritage/stationery) — `.h-press{ color:#d9cdb8; text-shadow:0 1px 0 rgba(255,255,255,.45),0 -1px 0 rgba(0,0,0,.35); }`
- **Drop cap** — `.dropcap::first-letter{ font-family:'Playfair Display',serif; float:left; font-size:3.6em; line-height:.82; color:var(--accent); }`

### 3B · The "LOUD" decorative TOKENS (the live IR contract — engine B, CURRENT)
Source: `origin/claude/bold-feynman-SZzaO:lib/ir/contract.ts` `LoudSpec` + `lib/peek-render/theme.ts`. **ADDITIVE — all optional; omitting reproduces the prior quiet look.** Maps to `--peek-*` vars.
- `displayShadow?: string` — hard-offset `text-shadow` on display headlines, e.g. `"3px 3px 0 var(--peek-accent-2)"` (theme.ts expands `accent`/`accent2`/`ink` keyword shorthands to literal colors). → `--peek-display-shadow`.
- `cardShadow?: { x, y, blur?, spread?, color? }` — hard-offset box-shadow on cards/panels (Memphis 8px hard offset). → `--peek-card-shadow`.
- `borderWeight?: number` — thick ink border px (default 1; mockups run .5→4px). → `--peek-border-weight`.
- `textureStrength?: number` — grain overlay opacity 0..1 (mockups run .07; old fixed .06). → `--peek-texture-strength`.
- `cssVars?: Record<string,string>` — **the escape hatch**: raw `--peek-*` custom props the model injects (sanitized server-side via `sanitizeCssVars`, merged LAST so a one-off `custom` effect can override any derived token). THIS is the "never limited to" valve.

### 3C · The DNA-catalog confirms the loud knobs as observed extremes
Source: `origin/claude/jolly-mccarthy-QMqC9:workspace/peek/docs/design-dna-catalog.md` knob axes 5–7: surfaceShadow `soft-tint | hard-offset(Rad 8px/Disco) | neon-glow(Cyber) | none`; application `flat → gradient → glow → holographic(Cyber)`; motion "live loops (Cyber glitch+holo · Space orbits+clock · Disco vinyl)". The catalog also names `glassBlur 8–28`, `borderStyle solid|dotted|dashed`, `borderWeight .5→4px`.

---

## 4 · THE SCENE / MOTIF / FRAME MENU (block-registry kinds)

### 4A · SCENES (background effects) — `SceneKind` enum (engine B, CURRENT)
Source: `lib/ir/contract.ts` `SceneKind` + builders in `lib/peek-render/scenes.ts` + CSS recipes in `…TOOLKIT.md` §5. *"Extend the registry, not the schema."* Ambient scenes gate on `motion.intensity` AND `prefers-reduced-motion` (animated els get class `.peek-amb`, killed by the reduced-motion guard).

`none · grain · rayfan · sunburst · starfield · gridfloor · mirrorball · confetti · bubbles · halftone · blueprint · topo · mesh · scanlines`

Per-scene vibe tags + recipe (from §5): **starfield** (space/cosmic/night/gala — radial-gradient + 2 layered `radial-gradient` star-fields drifting) · **gridfloor** (cyber/retrowave/rave — `rotateX(72deg)` perspective + `repeating-linear-gradient`, `gridScroll` anim) · **rayfan/sunburst** (deco/casino/circus/kids/gala — `repeating-conic-gradient`, sunburst masked by `radial-gradient`) · **scanlines** (y2k/vhs/cyber — `repeating-linear-gradient(transparent 0 2px, rgba(0,0,0,.18) 2px 3px)` + `mix-blend-mode`) · **mirrorball** (disco — conic+repeating-linear, `spinSlow 8s`) · **mesh** (modern/dreamy/wellness — 3 radial blobs, `drift 18s`) · **halftone** (pop/comic/memphis — `radial-gradient(circle,var(--ink) 1.4px,transparent 1.6px) 12px`) · **confetti** (party/kids — JS-sprinkled chips, `confFall`) · **bubbles** (10 CSS bubbles rising) · **blueprint** (technical/mission — `#0c2233` + 28px grid) · **topo** (outdoor/heritage — `repeating-radial-gradient` contours) · **grain** (heritage/print — the shared `GRAIN_SVG` feTurbulence noise overlay, opacity driven by `textureStrength`).

### 4B · MOTIFS / ornaments — `MotifKind` enum (engine B, CURRENT)
Source: `lib/ir/contract.ts` `MotifKind` + inline-SVG builders in `scenes.ts` `MOTIFS` (+ duplicated in `parts.js`). Recolored via `currentColor`/token. Budget ≈ 1–4 per page.

`sparkle · star · crown · suit · leaf · zigzag · rule · dots · sunburst · hanko · chrome · stamp`

(Each ships a real inline `<svg>` — e.g. `sparkle` = 4-point star path, `crown` = `M3 8l4 3 5-6 5 6 4-3-2 11H5z`, `chrome` = linear-gradient `#eef4ff→#5b6a82→#dfe8f5` filled circle, `hanko` = round seal w/ kanji-grid strokes.) Toolkit §6 adds non-enum pantry: **card suits diamond/club/spade**, **chromeblob** (`border-radius:40% 60% 55% 45%/55% 45% 60% 40%` bevel), **polka dots**, **memphis squiggle**, **ASCII/dingbat dividers** (`✦ · ✺ · ❋ · ▚ · ◆◇◆ · ※ · ⟡ · ───✶───`), **hand-drawn underline/circle** SVG.

### 4C · FRAMES (media treatments) — `FrameKind` enum (engine B, CURRENT)
Source: `lib/ir/contract.ts` `FrameKind` + builders in `scenes.ts` `frameMedia()` + CSS in `…TOOLKIT.md` §7. Each wraps a media slot; tag = vibes. Per-slot `MediaSlot.frame` overrides the page default.

`plain · arch · locket · vinyl · porthole · polaroid · idcard · stamp · ticket` (scenes.ts also builds `stub` as a ticket alias).

| Frame | vibes | gesture |
|---|---|---|
| vinyl | disco, music | spinning record `border-radius:50%` repeating-radial grooves, center label = the image |
| porthole | space, cosmic | inset-ringed circle (+orbiting `.moon`s in toolkit) |
| polaroid | casual, retro, scrapbook | white pad, `transform:rotate(-3deg)`, caption + tape |
| arch | editorial, wedding, fashion, zen | `border-radius:300px 300px 22px 22px / 60% 60% 22px 22px` (tall arched window) |
| locket | vintage, princess | oval `border-radius:48%` + accent/surface ring shadow |
| idcard | travel, mission, bachelor | 90px photo + mono "BACKSTAGE / ALL ACCESS" grid |
| ticket/stub | gala, rave, bachelor, event | punched notch circles straddling center edges; tear-line dashed border |
| stamp | heritage, postal | dashed border, `rotate(-1.5deg)`, deckle-edge mask in toolkit |
| hanko | japanese, omakase | round red seal (motif version) |

### 4D · SECTION ARCHETYPES (block-registry "section" kinds)
Source: `…TOOLKIT.md` §8 + grammar `SectionType`/variants (`grammar.ts`).
- **Toolkit (engine B) skins:** `tracklist (Side A/B) · flightplan (HUD timeline + live clock) · stubs (perforated tickets) · courses (omakase, kanji numerals) · steps (how-it-works) · lookbook (big editorial cards) · rail (horizontal snap carousel) · tiers (pricing/sponsor levels)`. Hero archetypes: `centered-stack · split-50 · full-bleed-image+overlay · type-only mega · framed-media`. Plus `countdown banner`.
- **Grammar (engine A) section types + variants** (`grammar.ts` SectionType, the validated automaton): `hero · story · productSet · divider · cta · footer`.
  - Hero variants: `full-bleed-image · centered-type · split · stacked-card · minimal-mark`
  - Story variants: `prose · pull-quote · timeline · two-up · banner`
  - ProductSet variants (≥4 required): `editorial-full-bleed · tight-grid · horizontal-scroll · collage-masonry · list · single-hero-product` (each with min/max card-count rules, e.g. `single-hero-product:{1,1}`, `tight-grid:{3,12}`, `list:{2,20}`)
  - Divider: `rule · whitespace · motif · label` · CTA: `button-row · banner-bar · inline-link · sticky-bar` · Footer: `minimal · signature · branded`
- **DNA-catalog (engine C) block registry:** ~7 logical blocks + 3 universal mobile-system blocks (slide-in menu, detail sheet, sticky action bar) — the polymorphic crux is the **`card`** superset; the detail sheet is its projection. (`design-dna-catalog.md`.)

### 4E · MOTION / EASING library — `REUSABLE`
Source `…TOOLKIT.md` §4 + `lib/peek-render/styles.ts` keyframes.
- Easing tokens: `--ease-standard:(.4,0,.2,1) · --ease-out-soft:(.16,1,.3,1) · --ease-in-out:(.65,0,.35,1) · --ease-panel:(.3,.8,.2,1) · --ease-sheet:(.3,.85,.2,1) · --ease-bounce:(.34,1.56,.64,1) · --ease-spring:(.5,1.8,.4,.85) · --ease-linear:linear`. Duration scale: micro 120–180 · UI 240–320 · panel 380–450 · ambient 6–30s.
- Ambient loops: `spinSlow · float · drift · twinkle · pulseGlow · hueRotate · gridScroll · scan · bob`. (styles.ts ships `peek-spin/float/drift/tw/floor/conf/bub/ken/marq/sway`.)
- Scroll-reveals: `.reveal` / `.reveal-stagger` (nth-child delay ramp) / `.clip-up` (curtain). IO `rootMargin:'-12% 0px'`.
- Hover micro: `.lift · .tilt · .shine · .underline-grow · .btn-press`.
- **Reduced-motion guard is MANDATORY:** `@media (prefers-reduced-motion:reduce){*{animation:none!important;transition-duration:.01ms!important;}}` (enforced in both `styles.ts` and toolkit).

---

## 5 · THE OKLCH CONTRAST-REPAIR + 40 VIBE PRESETS + 22-OCCASION TAXONOMY (engine A — CURRENT)

### 5A · The 7-dial vibe (the live DB shape)
Source: `vibe-direction.md` (`…depth-layer-ux:_packets/SPINE/skills/vibe-direction.md`). Seven dials, each → a CSS var at render: **Palette · Typography · Density · Shape · Mood · Motion · Voice tone**. "Mutate-first-narrate-second": fire `set_vibe`/`update_vibe` when signal moves the dial. The progressive engine re-evaluates on every signal (hero upload → `hero_palette`, note → `tone_classifier`, cards → `card_mix`; 10-entry `signal_source_history` audit trail).

### 5B · The OKLCH contrast-repair engine — `derive-until-passes` guarantee
Source: `origin/peek-clean:atelier/lib/vibe/grammar/oklch.ts` + `engine.ts`. Color is stored in **OKLCH** (perceptual); contrast measured in WCAG sRGB luminance. Flow: `OKLCH → linear sRGB → relative luminance → ratio`.
- `deriveContrastingInk(fg, bg, threshold)` — binary search on perceptual lightness `l` toward whichever pole maximizes contrast, preserving h/c; **always converges** (l=0 black / l=1 white are guaranteed poles). 24 iterations, then extreme-pole fallback (chroma dropped).
- `derivePalette(seed)` — seed (`strategy+baseHue+key+saturation`) → fully-resolved contrast-safe role palette (`bg,surface,ink,inkMuted,accent,accent2?,onAccent`). `deriveInkAgainstBoth` clears AA on the WORSE of bg/surface. The deriver **CANNOT return a failing palette**.
- Hard invariants (`grammar.ts` INVARIANTS): `CONTRAST_INK 4.5 · CONTRAST_INK_MUTED 3.0 · CONTRAST_ON_ACCENT 4.5 · CONTRAST_ACCENT_VS_BG 3.0 · MIN_TOUCH_TARGET_PX 44 · MIN_BODY_FONT_PX 16 · SCALE_RATIO [1.067,1.95] · MEASURE_CH [45,80] · BASE_UNIT_REM [0.5,1.25] · GRAIN_MAX 0.06 · WASH_MAX 0.15 · CHROMA_MAX 0.37 · SECTION_COUNT [3,9] · MOOD_WORDS [3,6]`.
- `generateAndRepair(raw, cardCount)` — the full pipeline: Zod gate → `validateVibeSpec` (clamp/repair/derive — never fails) → `validatePageComposition` (R1–R8 automaton + card-count repair). On unrepairable shape, falls back to `SAFE_DEFAULT` (warm saffron `baseHue:50`, light, medium, serif/sans, breathable) AND returns a `repairPrompt`. **The pipeline NEVER hard-fails — a boring-but-valid page always ships.** This is the safety-net to KEEP.

### 5C · The 40 vibe presets — 7 families
Source: `origin/peek-clean:atelier/lib/vibe/grammar/presets.ts` (`VIBE_PRESETS`, 1304 lines). Each preset = a `GenerationOutput` (flows through `generateAndRepair`, no special path). Each carries a 1-line **DNA** + `paletteSeed` + full dial set + `moodWords` + `voice`.

| Family (count) | Presets (key — DNA snippet) |
|---|---|
| **editorial-quiet (8)** | paper-letter (cream serif, wedding-invite-on-linen) · velvet-rope (dark mono serif, ochre, WSJ-after-dark) · chalk-line (dim warm gray, oversized serif, no motif — the memorial spine) · museum-label (white, tiny mono caps, luxury jewelry box) · slow-craft (cream+sage, botanical, pottery studio) · studio-mono (off-white ochre, architect monograph) · silver-print (dim gray duotone, B&W documentary) · linen-warm (cream+dusty-rose, bridal-shower-that-isn't-twee) |
| **playful-bright (8)** | confetti-pop (vivid triad pink/teal/amber, script, confetti) · birthday-balloon (warm analogous, display caps, sparkle) · taffy-pull (pastel triad, pillowy, script+sans) · ice-cream-truck (split-comp mint/strawberry, summer) · crayon-box (primary triad RYB, display, kid-loud) · gummy-bear (pastel split-comp, baby-arrival cheerful) · mermaid-pearl (aqua→coral analogous, mermaid/princess) · flag-stand (primary triad sharper, mono body, HS graduation) |
| **bold-loud (8)** | neon-club (dark complementary purple/cyan, mono, geometric) · concert-poster (vivid analogous orange/red on black, oversized) · vegas-blur (dim split-comp gold/magenta, sparkle) · miami-vice (vivid comp teal/coral, sunset) · racing-stripe (black + safety-yellow, motorsport) · zine-punk (light high-sat, max grain, indie show) · sticker-pack (vivid triad, confetti, stadium tour) · arcade-cabinet (dark vivid triad green/magenta/yellow, gamer) |
| **romantic-sentimental (6)** | garden-letter (light rose/sage analogous, serif, botanical) · dusk-poem (dim plum→peach, serif) · velvet-night (dark mono wine, serif, 25th anniversary) · lace-window (cream+gold, script+serif, bridal shower) · field-flowers (light yellow/sage, sans+serif) · paper-airplane (cream+sky-blue, tender Valentine) |
| **cozy-domestic (4)** | cottage-warm (cream+terracotta, housewarming) · kitchen-table (warm-white+olive, get-well) · cabin-stack (dim warm brown, retirement/lake house) · quilt-square (cream+faded primaries, family holiday) |
| **brutalist-contemporary (3)** | soft-brutalist (light gray mono, display+mono, sharp/flat) · concrete-poet (dim concrete gray, brutal scale-contrast) · wireframe (white+black ink only, mono+mono, dev wedding) |
| **cosmic-cinematic (3)** | stargazer (dark navy+silver, serif+sans, sparkle) · cinema-noir (dark mono charcoal, display+serif, dim-overlay) · aurora-bloom (dim teal mono, sans, soft wash, lively) |

Preset dial sub-enums (from each `GenerationOutput.vibe`): typography `{displayRole, bodyRole, scaleContrast 1.067–1.95, displayCase: none|upper|small-caps|title, displayTracking: tight|normal|wide, bodyLeading: tight|normal|loose}` · spatial `{density: compact|cozy|breathable, baseUnitRem, gutter: edge|snug|roomy, measureCh}` · shape `{radius: sharp|soft|pillowy, imageMask: none|rounded|arch|blob|circle, border: none|hairline|bold}` · depth `{elevation: flat|lifted|dramatic}` · texture `{grain ≤.06, wash ≤.15, motif: none|confetti|sparkle|botanical|geometric}` · motion `{character: still|soft|lively, easing: linear|crisp|eased|bouncy}` · imagery `{treatment: natural|duotone|full-bleed|framed|dim-overlay|illustrated, textOverImage}` · voice (7-axis, see §6).

### 5D · The 22-occasion taxonomy
Source: `presets.ts` `OccasionKey` + `OCCASIONS` descriptor table. Each carries a label, description, and **recipientFeel** (the feeling the recipient leaves with).

`kid-bday-littles (magic was made for me) · kid-bday-tween (you actually get it) · teen-bday (respected, not babied) · bday-adult (they saw the actual me) · milestone-bday (the decade is mine) · bachelorette (we are unhinged together) · bachelor (this is going to be stupid) · wedding (witnessed and celebrated) · engagement (this is real now) · anniversary (still) · baby-shower (we already love them) · baby-arrival (welcome, small one) · graduation (what you did is large) · promotion-new-job (you earned this) · retirement (the work mattered) · housewarming (this is yours) · get-well (we are here, no pressure) · sympathy (we have you) · divorce (the next chapter is yours) · holiday-cheerful (season together) · holiday-tender (I see you specifically) · just-because (you crossed my mind)`

### 5E · The OCCASION → VIBE many-to-many map (ranked: default first, edgier last) + selector + remix
Source: `presets.ts` `OCCASION_VIBES` + `pickPreset(occasion, edginess 0–3)` + `remix()`.

| Occasion | rank0 (default) | rank1 | rank2 | rank3 (wildcard) |
|---|---|---|---|---|
| kid-bday-littles | confetti-pop | taffy-pull | mermaid-pearl | crayon-box |
| kid-bday-tween | ice-cream-truck | sticker-pack | arcade-cabinet | zine-punk |
| teen-bday | sticker-pack | arcade-cabinet | zine-punk | racing-stripe |
| bday-adult | garden-letter | velvet-rope | cinema-noir | concrete-poet |
| milestone-bday | velvet-rope | stargazer | velvet-night | concert-poster |
| bachelorette | miami-vice | confetti-pop | vegas-blur | zine-punk |
| bachelor | neon-club | racing-stripe | vegas-blur | arcade-cabinet |
| wedding | paper-letter | lace-window | velvet-night | wireframe |
| engagement | dusk-poem | garden-letter | velvet-night | aurora-bloom |
| anniversary | garden-letter | velvet-night | dusk-poem | cinema-noir |
| baby-shower | taffy-pull | gummy-bear | paper-airplane | aurora-bloom |
| baby-arrival | gummy-bear | aurora-bloom | taffy-pull | paper-airplane |
| graduation | flag-stand | concert-poster | confetti-pop | zine-punk |
| promotion-new-job | studio-mono | velvet-rope | concrete-poet | racing-stripe |
| retirement | cabin-stack | velvet-rope | chalk-line | silver-print |
| housewarming | cottage-warm | slow-craft | cabin-stack | concrete-poet |
| get-well | kitchen-table | field-flowers | paper-airplane | slow-craft |
| sympathy | chalk-line | silver-print | museum-label | paper-letter |
| divorce | velvet-rope | vegas-blur | concert-poster | zine-punk |
| holiday-cheerful | quilt-square | confetti-pop | cabin-stack | crayon-box |
| holiday-tender | paper-airplane | field-flowers | garden-letter | dusk-poem |
| just-because | field-flowers | paper-airplane | kitchen-table | zine-punk |

**Remix operators** (pure shifts inside the grammar — `RemixAxis`): `+saturation · +contrast · +texture · -texture · +motion · +shape · +depth · -voice · flip-key · weird-pair · {shift-hue, degrees}`. Step tables guarantee bounded escalation (e.g. SAT muted→medium→vivid; MOTION still→soft→lively; RADIUS sharp→soft→pillowy; KEY light↔dark). `axesFromBrief()` maps free-text → axes via regex (e.g. `wild|crazy|unhinged`→+saturation; `loud|bigger`→+contrast; `minimal|cleaner`→-texture; `dark|moody`→flip-key; `weird`→weird-pair).

---

## 6 · PER-OCCASION SEED PALETTES + VOICE (princess / bachelorette / condolence …)

### 6A · The 7-dial seeded palettes per occasion (explicit hex)
Source: `vibe-direction.md` §1.1 ("Default per occasion … the fallback if no template is loaded"). These are the seeds the curator's occasion-templates override.

| Occasion | bg | surface | ink | accent | accent2 |
|---|---|---|---|---|---|
| **princess-bday** | #FFE5F0 | #FFF0F6 | #3D1A2E | #FF6BAF | #FFD166 |
| **bachelorette** | #0A0A0F | #1A0A1F | #FFF | #FF1F8F | #9D4EDD |
| **wedding** | #F8F4EE | #FFF | #2C2418 | #9C7A50 | #C7A87A |
| **milestone-bday (80th)** | #F2EDE5 | #FFFBF4 | #1F1812 | #8B5A2B | #D4A574 |
| **anniversary** | #1A0A0E | #2A0F15 | #F5E6E0 | #C9304F | #E8B3A8 |
| **baby-shower** | #EAF4F8 | #FFF | #2A3B4A | #A8C8E8 | #FCD7C2 |
| **graduation** | #0F1A2E | #1F2A40 | #FFE599 | #F5C518 | #4A90E2 |
| **holiday-christmas** | #0F1A12 | #1A2A1E | #F5E6D3 | #B91C1C | #15803D |
| **retirement** | #F4F0EA | #FAF6F0 | #2A2418 | #5A6F4F | #A89776 |
| **condolence** | #F2F0EC | #FFFCF7 | #1F1A14 | #5A5048 | #A89C8E |
| **just-because** | — | — | — | — | — (no seed; force tone-classifier read on first 2 messages) |

### 6B · The 6 worked "radical morph" VIBE TUPLES (full dial-sets per occasion)
Source: `vibe-direction.md` §3. The skeleton is constant; the dials produce radical divergence.

- **Princess-bday (7yo niece):** `display(Bowlby One)/sans(Nunito)` · compact · pillowy · whimsical · lively · voice{warm, gentle, casual, emoji:playful} · moodWords [sparkle, bouncy, sweet, royal, dreamy]
- **Bachelorette (28yo bride):** bg#0A0A0F accent#FF1F8F accent2#9D4EDD · `display(Anton)/sans(Inter)` · compact · sharp · rich · lively · voice{warm, sharp, quick, slangy, punchy} · [neon, wild, sticky, feral, illegal]
- **Wedding (couple):** bg#F8F4EE accent#9C7A50 · `serif(Cormorant Garamond)/serif(Lora)` · breathable · soft · rich · soft · voice{warm, gentle, considered, elevated, fuller} · [tender, rooted, witnessed, timeless, intentional]
- **80th birthday (grandfather):** bg#F2EDE5 accent#8B5A2B · `serif(Playfair)/sans(Inter)` · breathable · sharp · editorial · still · voice{warm, gentle, considered, emoji:none, elevated, fuller} · [lifework, witnessed, rooted, distinguished, crafted]
- **Bachelor-party (30yo groom — Frank's "cash-pile" ref):** bg#0A0A0A accent#D4AF37(gold) accent2#0F8A4F(green) · `display(Bowlby One)/mono(JetBrains Mono)` · compact · sharp · rich · lively · voice{measured, sharp, quick, slangy, punchy, emoji:none} · [gold, run-it, degenerate, high-stakes, filthy]
- **Condolence (recent loss):** bg#F2F0EC accent#5A5048 accent2#A89C8E · `serif(Cormorant)/serif(Lora)` · breathable · sharp · minimal · **still (no motion)** · voice{warm, humor:none, considered, formal, emoji:none, elevated} · [held, steady, present, quiet, unrushed]. **No gag cards. The note is the entire point.**

### 6C · Occasion-template skill files (the loadable per-occasion bundles)
Source (markdown form): `…depth-layer-ux:_packets/SPINE/skills/occasion-templates/*.md` ; (TS form, live): `…peek-clean:atelier/lib/anthropic/skills/occasion-templates/*.ts`. 10 templates: `anniversary · baby-shower · bachelorette · holiday · just-because · milestone-bday · princess-bday · retirement · teen-grad · wedding`. Each carries: when-it-applies (Haiku classifier signals), vibe defaults (palette/type/density/shape/mood/motion/voice), typical card mix, default rules pattern, copy register w/ examples, hero-image direction.
- e.g. **princess-bday.md** explicitly steers AWAY from the cage: *"dusty pink + cream + buttery gold + lavender … NOT Disney-store hot-pink-and-purple … Think Sofia Coppola Marie Antoinette rather than Target birthday aisle … NEVER Comic Sans, NEVER bubble-cute novelty fonts."*

### 6D · The 7-axis VOICE dial (copy register — pairs with copy-house-style)
Source: `grammar.ts` `VoiceSpec` + `vibe-direction.md` §1.7. Every preset & occasion carries one. Axes:
`warmth: restrained|measured|warm|effusive · humor: none|gentle|dry|sharp · pace: considered|natural|quick · formality: casual|neutral|formal · emoji: none|rare|occasional|playful · vocabulary: slangy|neutral|elevated · length: punchy|natural|fuller`.
Curator-diction → voice inference table in `vibe-direction.md` §2.1 (e.g. "she's gonna die"→humor:sharp; "feel really seen"→warmth:effusive,still motion; "roast him"→humor:sharp,mono/display; ALL-CAPS→pace:quick,compact). Companion skills: `copy-house-style.md`, `rules-engine-patterns.md`, `image-direction.md`, `reveal-mechanics.md`.

### 6E · Image-direction pantry (hero brief seeds per occasion)
Source: `…depth-layer-ux:_packets/SPINE/skills/image-direction.md` §2 (Flux prompt templates). Each occasion ships a concrete Flux prompt + "what-NOT-to-include" (the recurring critical line is **"no human figures, no faces, no text"** to prevent AI-face uncanniness). Also: `parts.js` `IMG_STYLE` (per-world art-direction prompts) + `IMG_OPS` (vendor-neutral image ops: generate, styleRef, edit, bgRemove, upscale, inpaint, outpaint, relight, vectorize, animate, paletteFrom).

---

## 7 · KEEP / DROP (the explicit instruction)

- **KEEP (cached model context / safety-net):** everything in §1–§6. The named palettes, world bundles, font groups + "pairs with", type-art CSS, scene/motif/frame menus, the 40 presets, the 22-occasion taxonomy, the occasion→vibe map, the per-occasion seed palettes, the 7-axis voice, the image-brief seeds. These are *priors* and *recipes*, and the OKLCH `derivePalette` + `generateAndRepair` repair layer is the hard safety-net that must always remain.
- **DROP (the closed-vocabulary cage):** any enforcement that these are the *only* legal values. The codebase already encodes the "never limited to" valve in three places — preserve those, drop any rule that contradicts them:
  1. `fonts.ts`: *"the built-in registry is a floor, NOT a gate … a pantry suggestion"* — the model may name ANY Google family; the loader synthesizes the axis query.
  2. `lib/ir/contract.ts` `cssVars?` + comment *"Extend the registry, not the schema"* — the sanitized `--peek-*` escape hatch lets the model inject one-off `custom` effects that override any derived token.
  3. `presets.ts` header: presets are *seeds* consumed by `seedVibeFromBrief` so a preset seeds the vibe **BEFORE the model writes its own** — the model is expected to diverge.
  The grammar engine enforces only the **legal-by-construction invariants** (contrast, touch target, font-pair legality, section automaton) — those are the legitimate gate. The *vocabulary lists* (palette names, world names, motif enums, preset keys) are the cage to dissolve into "pantry."

---

## 8 · COVERAGE & GAPS

**Covered (6/6 deliverables, both engines):** font/personality taxonomy + pairs-with (§1) · named palettes + world bundles + harmony schemes (§2) · type-art/loud CSS — glitch/holo/chrome/outline/gradient-clip/textPath/letterpress all captured verbatim (§3) · scene/motif/frame/section menu (§4) · OKLCH contrast-repair + 40 presets + 22-occasion taxonomy (§5) · per-occasion seed palettes incl. princess/bachelorette/condolence (§6).

**Biggest gap:** The two engines are **NOT reconciled** in any single document. Engine A (atelier grammar: OKLCH roles, 5 abstract font-roles, 40 presets, 22 occasions) and Engine B (peek-jumpoff: literal-hex ThemeSpec, 50-family registry, 10 WORLDS, 14 scenes / 12 motifs / 9 frames) use **different schemas, different occasion sets, and different motif/scene names** (e.g. grammar's 5 motifs `none|confetti|sparkle|botanical|geometric` vs IR's 12 `sparkle|star|crown|suit|leaf|zigzag|rule|dots|sunburst|hanko|chrome|stamp`). `grammar.ts` claims to be a "strict SUPERSET" of the 7-dial vibe via `bridge.ts`, but there is **no bridge from the grammar engine to the peek-jumpoff WORLDS/ThemeSpec vocabulary** — so the WORLDS, the 20 named palettes, and the full type-art CSS library currently live only in the reference engine + the toolkit MD, not wired into the live `generateAndRepair` path. A future merge would map: grammar `VibeFamily`→`WORLD`, `paletteSeed`→named-palette, grammar `motif`→IR `MotifKind`, and pull the §2.2 type-art CSS into `LoudSpec.cssVars` presets. Until then, treat the toolkit MD + parts.js as the *broader* pantry and the atelier grammar as the *enforced/CURRENT* one.

---

### Source index (all `branch:path`)
- `origin/claude/research/depth-layer-ux:_packets/SPINE/skills/vibe-direction.md` (7-dial, occasion seed palettes, morph tuples, voice)
- `origin/claude/research/depth-layer-ux:_packets/SPINE/skills/{image-direction,copy-house-style,rules-engine-patterns}.md` + `occasion-templates/*.md`
- `origin/peek-clean:atelier/lib/vibe/grammar/{presets,oklch,engine,grammar,schema}.ts` (40 presets, 22 occasions, OKLCH repair, invariants) — also on depth-layer-ux as `.ts`
- `origin/claude/bold-feynman-SZzaO:peek-jumpoff/engine/parts.js` (FONT_SPECS, 20 PALETTES, 10 WORLDS, MOTIFS, IMG_STYLE, IMG_OPS) — also `gallant-planck-pu51x`
- `origin/claude/bold-feynman-SZzaO:lib/peek-render/{styles,scenes,theme,fonts}.ts` + `lib/ir/contract.ts` (LoudSpec, SceneKind/MotifKind/FrameKind, frame/scene builders)
- `origin/claude/gallant-planck-pu51x:recon-assets/DESIGN_ENGINE_TOOLKIT.md` (the §10 toolkit / Master Vocabulary Catalog — 17 font groups, type-art CSS, named palettes, scenes/motifs/frames/sections, the engine resolver)
- `origin/claude/jolly-mccarthy-QMqC9:workspace/peek/packages/vibe-genome/src/index.ts` + `workspace/peek/docs/design-dna-catalog.md` (knob-axis schemas, 11-axis design vector)
