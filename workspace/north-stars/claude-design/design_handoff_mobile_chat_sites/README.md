# Handoff: Mobile Chat — Conversational Site Builder

> **Read `ARCHITECTURE.md` before writing a single line of code.** This product
> has a history of being trapped at MVP by ceilings baked deep into the codebase.
> The architecture document is a binding mandate, not a suggestion. This README
> covers *what to build* (the design). `ARCHITECTURE.md` covers *how to build it
> so it never hits a ceiling*. `CLAUDE.md` is the always-on guardrail for the
> agent working in the repo.

---

## Overview

A **mobile-first, conversational website builder**. The user chats with Claude on
their phone and Claude generates a fully-themed, occasion-specific one-page site
**live, rendered inside the phone** — a party invite, a product shop, a charity
gala, an omakase menu, a warehouse-rave promo. The user art-directs in plain
language ("make the red suits neon", "add a roller-disco as the big gift") and the
site updates in place.

Each generated site is not a flat page — it ships with a complete **mobile
interaction system**: a themed slide-in menu, tap-to-open detail sheets, a
scroll-aware sticky action bar, and occasion-tuned primary actions (Shop / RSVP /
Reserve / Register-to-bid / Send-aboard).

The chat surface itself is a **liquid-glass overlay** that floats over the live
preview: a translucent header, a feathered "ink-wash" message stream that stays
legible over any backdrop, a thin input pill, and an iOS-26-style keyboard. When
the keyboard is dismissed, the chat collapses to a single **dock pill** so the
finished site shows through whole.

## About the design files

Everything in `design/` is a **design reference created in HTML** — high-fidelity
prototypes that show the intended look, motion, and behavior. **They are not
production code to copy.** Several are React-in-the-browser (Babel `text/babel`
scripts) purely so they render standalone; that is a prototyping convenience and
says nothing about the production stack.

Your job is to **recreate these designs in the production architecture described in
`ARCHITECTURE.md`** — using its IR-driven rendering model, its component system,
and its bounded contexts. Do **not** lift the inline-styled JSX or the per-site
`<style>` blocks into the app as-is; they are visual targets to hit, not modules to
import.

## Fidelity

**High-fidelity.** Colors, typography, spacing, motion curves, and interaction
states are final and intentional. Recreate them precisely using the production
design-token system and component library. Exact values are tabulated below and
visible in the source files.

---

## The two surfaces

This product is really **two distinct rendering problems**, and the architecture
treats them as such:

1. **The Builder shell** — the chat + phone-frame + glass overlay. One app, one
   design language (warm cream / coral / Source Serif, iOS-26 liquid glass).
2. **The generated sites** — infinitely many themes, authored by the generation
   engine, rendered from the **Site IR** (see `ARCHITECTURE.md`). The ten sites in
   `design/sites/` are *examples of output*, not screens you hand-build. What you
   build is the **rendering + theming system** that can produce them — and anything
   else — from structured data.

Treat the sites as a **conformance suite**: when the IR + renderer + theme engine
can reproduce all ten pixel-for-pixel from structured input, the rendering layer is
done.

---

## Screens / Views (the Builder shell)

Source of truth: `design/Mobile Chat - Sites.html` (the gallery) plus the chat
component files. The phone frame is `design/ios-frame.jsx` (`IOSDevice`).

### 1. Phone frame — `IOSDevice`
- **Purpose:** the device chrome every Builder view lives inside.
- **Layout:** fixed canvas `402×874` (design artboards pad to `442×914`).
  Corner radius `48`. Dynamic Island: `126×37`, radius `24`, top `11`, centered.
  Status bar at top (`9:41`, signal/wifi/battery glyphs). Home indicator at
  bottom: `139×5` pill, radius `100`, `rgba(0,0,0,0.25)` (or `0.7` white on dark).
- **Key detail:** a `backdrop` layer sits at `z-index:0` *below* all UI, so the
  live site preview blurs through the glass header, input pill, and keyboard.

### 2. Live chat overlay (keyboard up) — `LiveChat` / `LiveChatOver`
- **Purpose:** the user converses with Claude over the page being built.
- **Header (`LiveHeader`):** compact, `padding 56px 14px 8px`. Glass back/sidebar
  button, center model pill ("Sonnet 4.5" + chevron) on `rgba(30,20,15,0.42)` glass,
  trailing "more" button. Subtle top-fade glass: `blur(8px)`, gradient
  `rgba(255,250,245,0.28)→0`.
- **Message stream:** scrolls under a fixed **smoke film** (see Interactions). Top
  is masked with a `linear-gradient` so messages fade in as they rise. Auto-scrolls
  to bottom on mount.
  - **Claude message (`LClaudeMsg`):** no bubble. White Source Serif, `16.5px`,
    `line-height 1.45`, `letter-spacing -0.1`, `text-shadow 0 1px 1px rgba(0,0,0,.55), 0 0 14px rgba(0,0,0,.35)`. Coral asterisk mark (white variant) at left.
  - **User message (`LUserMsg`):** right-aligned glass bubble, max-width `78%`,
    `background rgba(217,119,87,0.78)`, `backdrop-filter blur(18px) saturate(180%)`,
    border `0.5px rgba(255,210,180,0.55)`, radius `18` (bottom-right `6`). White SF
    text `15px`.
- **Input pill (`LiveInput`):** thin glass pill, `radius 999`, `blur(24px)
  saturate(180%)`, placeholder "Tell Claude what to change…", trailing circular
  send button (white, coral-deep `↑` arrow `#BF5A3D`).
- **Keyboard (`IOSKeyboard`):** full iOS-26 liquid-glass QWERTY with autocorrect
  bar, blue return key (`#08f`), shift/delete glyphs.

### 3. Docked chat (keyboard dismissed) — `LiveChatDocked`
- **Purpose:** reveal the finished site whole; chat reduces to a hint.
- **Layout:** header stays; body is empty; a single bottom **dock pill**:
  `radius 999`, `blur(28px) saturate(180%)`, white asterisk mark, "Ask Claude to
  refine…", plus envelope + mic round buttons (`rgba(255,255,255,0.22)` glass).

### 4. The gallery (`Mobile Chat - Sites.html`)
A pan/zoom design canvas (`DesignCanvas`/`DCSection`/`DCArtboard`) holding the
phones. **This is a presentation artifact for review only — not a product screen.**
It documents five states: finished sites (docked), mid-build (keyboard up), and the
three mobile-system patterns (menu / sheet / bar) held open.

---

## The generated sites — shared interaction system

Every generated site, regardless of theme, implements the **same four patterns**.
These are the contract the renderer must support for *all* IR documents. Reference
implementation: `design/sites/HEMLOCK - Field Collection.html` (cleanest source).

### A. Slide-in menu (`.mobile-menu` + `.scrim`)
- Right-anchored panel, `width min(82vw, 360px)`, full height.
- Closed: `transform: translateX(100%)`. Open (`body.menu-open`): `translateX(0)`.
- Transition `.4s cubic-bezier(.3,.8,.2,1)`. Scrim `rgba(18,12,8,0.5)` + `blur(2px)`,
  fades `.35s`.
- Nav links **stagger in**: each `nth-child` adds `~.06s` delay; links rise from
  `translateX(16px)` + `opacity 0`.
- Respects safe-area: `padding-top: calc(var(--safe-t) + 22px)` etc.
- Hamburger morphs to an X (`body.menu-open .hamburger span`).
- `body.menu-open { overflow: hidden }` locks scroll.

### B. Tap-to-open detail sheet (`.sheet` + `.sheet-scrim`)
- Bottom sheet, `border-radius 22px 22px 0 0`, `max-height 92vh`, scrollable.
- Closed: `translateY(101%)`. Open (`body.sheet-open`): `translateY(0)`.
  Transition `.45s cubic-bezier(.3,.85,.2,1)`. Grab handle `44×5` pill at top.
- Content is **populated from the tapped card's data attributes** (`data-name`,
  `data-price`, `data-sub`, `data-grad`, `data-swatches`, `data-desc`…), then one
  **primary action** tuned per occasion: add-to-bag / claim-a-gift (so guests don't
  double up) / register-to-bid / send-aboard.
- **Every hover interaction has a tap equivalent** — this is the mobile thesis.

### C. Sticky action bar (`.mobile-bar`)
- Fixed bottom bar, hidden until you leave the hero.
- An `IntersectionObserver` on the hero toggles `.show` (`rootMargin: -40% 0 0 0`).
- Closed: `translateY(140%)`. Shown: `translateY(0)`, `.45s cubic-bezier(.3,.8,.2,1)`.
- Glass: `rgba(251,246,236,.9)` + `blur(18px)`. Holds meta (label + value) and the
  always-present primary CTA (Shop now / RSVP / Are you in?! …).

### D. Micro-interactions
- **Cart bump:** count badge replays a `.bump` keyframe on add (force reflow with
  `void el.offsetWidth`).
- **Esc** closes any open overlay.
- **Deep-link state hook** (prototype-only, for the gallery): `?cc=menu|sheet|bar`
  forces a state ~120ms after load. *Do not port the `cc` hook — it's a screenshot
  rig.* The real triggers are the user interactions above.

### The ten reference themes (`design/sites/`)
| File | Theme | Primary action |
|---|---|---|
| HEMLOCK - Field Collection | Earthy heritage outfitter | Shop / Add to bag |
| Princess Party | Pastel fairytale invite | RSVP |
| Bachelor Party | High-roller Atlantic City noir | Claim the loot |
| Disco Birthday | 70s disco, vinyl tracklist | RSVP |
| Charity Gala | Editorial black-tie, animated | Register to bid |
| Space Mission Party | Retro mission control | Send aboard |
| Totally Rad Bash | Memphis maximalism | Are you in?! |
| Omakase Evening | Zen Japanese, negative space | Reserve |
| Cyber Rave | Y2K cyber, neon glitch | VIP / tickets |
| Garden Party | Botanical, soft & organic | RSVP |

These span the full design range on purpose — calm/zen to loud/glitch. The theme
system must be expressive enough to cover all of them **as data**, not as ten
bespoke stylesheets.

---

## Interactions & behavior (Builder shell)

- **The "being built" feeling.** Newly-added elements get a transient highlight —
  e.g. a `NEW` / `JUST PLACED` chip and a pulsing ring (`live-preview.jsx`
  `justPlaced`: `box-shadow 0 0 0 3px wash` + `rcardIn` alternate animation). When
  Claude changes a section, it should visibly ping.
- **Smoke film legibility** (`SmokeFilm`): one continuous gradient floor
  (`transparent → rgba(14,8,5,.62)` top-to-bottom) + a masked `backdrop-filter
  blur(22px) saturate(140%)` behind the message stream. Net effect: text is legible
  over any backdrop with no hard rectangles.
- **Auto-scroll** chat to bottom on mount.
- **Keyboard up/down** toggles between `LiveChat` and `LiveChatDocked`.
- Streaming: Claude messages should stream token-by-token (design implies live
  building; treat the stream as first-class — see `ARCHITECTURE.md` › Conversation).

---

## Design tokens

### Builder shell palette (`chat-shared.jsx` `C`)
| Token | Hex | Use |
|---|---|---|
| cream | `#FAF7F2` | app background / header |
| surface | `#FFFFFF` | cards |
| ink | `#1F1E1D` | primary text |
| muted | `#6B6862` | secondary text |
| faint | `#9C988F` | tertiary / loading |
| border | `#E8E1D5` | hairlines |
| borderSoft | `#EFEAE0` | softer hairlines |
| coral | `#D97757` | brand accent |
| coralDeep | `#BF5A3D` | pressed / icon on white |
| coralWash | `#F4E4D8` | user-bubble fill (opaque), tints |
| coralTint | `#FBEFE6` | lightest wash |
| canvas bg | `#1A1518` | gallery letterbox only |

### Typography
- **UI / sans:** `-apple-system, "SF Pro Text", system-ui, sans-serif`.
- **Serif (Claude voice + site display):** `"Source Serif 4", "Tiempos Text",
  "Iowan Old Style", Georgia, serif`. Google import: Source Serif 4, opsz 8–60,
  weights 400/500/600/700 (+ italic on sites).
- Claude messages: serif `16.5px / 1.45`, `letter-spacing -0.1`.
- iOS large title: `34px / 700`. iOS list row: `17px`, `letter-spacing -0.43`.

### Motion
| Pattern | Transform | Duration / curve |
|---|---|---|
| Slide-in menu | `translateX(100%→0)` | `.4s cubic-bezier(.3,.8,.2,1)` |
| Detail sheet | `translateY(101%→0)` | `.45s cubic-bezier(.3,.85,.2,1)` |
| Action bar | `translateY(140%→0)` | `.45s cubic-bezier(.3,.8,.2,1)` |
| Scrims | opacity/visibility | `.35s ease` |
| Nav-link stagger | `translateX(16px)+opacity` | `.4s ease`, `~.06s` step delay |

### Glass recipe (liquid glass)
`backdrop-filter: blur(8–28px) saturate(140–180%)` + translucent fill + `inset`
white shine + `0.5px` translucent border. Tune blur per surface (header 8, input
24, dock 28, keyboard 12, message smoke 22).

### Geometry
- Device radius `48`; sheet top radius `22`; cards `14–22`; pills `999`.
- Safe areas referenced as `--safe-t` / `--safe-b` — must be real `env(safe-area-inset-*)` in production.
- Touch targets ≥ `44px` (the design honors this; keep it).

---

## Assets
- **Fonts:** Source Serif 4 (Google Fonts) + system SF/`-apple-system`. No
  bundled font files; wire Source Serif 4 through the production font pipeline.
- **Icons:** all inline SVG (`chat-shared.jsx` `Icon`, `ios-frame.jsx`). Reproduce
  as a proper icon set/component, not copy-pasted SVG strings.
- **Imagery:** the reference sites use CSS gradients + SVG-noise sheens as image
  *placeholders*. Production must support real media (see `ARCHITECTURE.md` › Media).
- **Claude mark:** `ClaudeMark` is a simplified 4-bar asterisk — Claude visual DNA
  without the exact logo. Replace with the official brand asset from your brand
  system in production.

---

## Files in this bundle
```
design_handoff_mobile_chat_sites/
├── README.md            ← you are here (the design)
├── ARCHITECTURE.md      ← the no-ceilings build mandate (READ FIRST)
├── CLAUDE.md            ← always-on guardrails for the coding agent
└── design/
    ├── Mobile Chat - Sites.html     ← gallery / state catalogue (review only)
    ├── Mobile Chat - Live.html      ← keyboard-up chat over live preview
    ├── Mobile Chat - Glass.html     ← glass-overlay study
    ├── Mobile Chat Templates.html   ← chat template variants
    ├── ios-frame.jsx                ← iOS-26 device frame + keyboard + glass
    ├── chat-shared.jsx              ← tokens, icons, header, messages
    ├── chat-live.jsx / chat-live-docked.jsx / chat-glass.jsx / chat-templates.jsx
    ├── chat-keyboard.jsx            ← custom keyboard w/ embedded tools
    ├── live-preview.jsx / product-preview.jsx ← "being-built" preview studies
    ├── design-canvas.jsx            ← review canvas (NOT product code)
    └── sites/                       ← 10 reference themes = renderer conformance suite
```

To view any reference: open the `.html` files in a browser (they self-render).
