# peek.gift — Product & Technical Brief

Cold-start reference for Claude. Factual specification of the target product, its
architecture, and the build requirements.

---

## 1. Product definition
peek.gift is a chat-driven builder for **single-recipient gift pages and invitations**.
A user (the "curator") describes an occasion in natural language; an in-app Claude model
authors an art-directed **mobile-first web page** that renders live alongside the
conversation. The page is shared with a recipient, who opens it and **selects** from
curated items. Publishing a page is monetized as a **$12 Stripe checkout**.

Two page types share one underlying structure:
- **Gift page** (primary): a hero, a personal note, and a set of **cards** the recipient
  chooses from. Card categories: real retail products (multiple sources), shared
  activities/experiences, aspirational/"taunt" items, custom or homemade items, and
  digital items. The page itself is the gift-giving artifact.
- **Invitation**: a hero, event details (date, location), a plan/schedule, and an action
  (RSVP, tickets).

## 2. System decomposition
The product is divided into three parts over a shared data spine:
1. **Landing / Auth** — marketing entry and sign-in.
2. **Chat-Builder** — the chat plus the live page preview; where pages are authored.
3. **Checkout** — the $12 publish flow, the published recipient page, and item selection.

These communicate only through the shared data structure (the IR; see §5).

## 3. Generation model
The page-authoring intelligence is a Claude model (Opus class) running inside the
Chat-Builder. It generates the page design directly from its own judgment rather than
from a fixed template set or a constrained design enumeration. Design parameters —
typography, color, structure, ornament — are selected per page and are not limited to a
predefined list. The renderer must therefore accept arbitrary, model-authored design
specifications rather than a closed set of presets.

## 4. Output requirements
A produced gift page must satisfy two requirement sets simultaneously.

### 4a. Visual
- Premium, art-directed quality consistent with the project's reference mockups.
- One coherent design concept per page, expressed through typography, color, layout,
  ornament, section naming, and copy voice.
- A distinct display typeface chosen per page; not a shared default across pages.
- Clear, dramatic type hierarchy; restrained use of a single dominant accent color.
- Standard mobile interaction system: a fixed top bar, a slide-in menu, a persistent
  bottom action bar, a bottom sheet for item detail, and scroll-triggered reveals.
- Responsive: renders correctly on mobile and desktop from one document.

### 4b. Functional
- **Product cards from multiple retailers**, each with an image, a source/retailer
  label, a title, an optional price, and a selection control.
- **Custom / homemade items** supporting a user-supplied photo and free-text description.
- **Selection rules engine**: items can be grouped into variant groups with selection
  modes — `pick_one`, `pick_any`/`pick_all`, and lock/unlock conditions (e.g.
  beg-to-unlock, date-gated). The rendered controls must reflect the active rule
  (single-select, multi-select, or locked state), not a uniform control.
- **Experiences rendered as itineraries** (date, location, ordered steps) rather than as
  product tiles.
- **Aspirational/taunt cards**, **digital items**, value/price display toggles, a
  recipient claim mechanic, and group/collaborative gifting (multiple contributors).
- A generated, shareable page slug served at a public route (e.g. `/g/<slug>`).

## 5. Data architecture
- The source of truth for a page is a **structured intermediate representation (IR)** —
  a validated data object, never raw HTML. The chat authors and mutates the IR; a single
  generic renderer paints the IR into the live page and the published page.
- The IR carries: page type, recipient/occasion metadata, the design concept, a theme
  specification (typography, palette, scene/motif/frame, spacing, motion), ordered
  page sections, cards, variant groups, media slots, the note, and the call-to-action.
- Media is represented as **slots**: either a resolved URL or a directive describing how
  to obtain the image (generate, search, edit, background-removal, upscale). The renderer
  shows a themed placeholder until a slot resolves.
- The IR is versioned to support history, editing, and migration without data loss.

## 6. Service integration (ports/adapters)
- Every external capability is accessed through a **typed interface (port)** with a
  default stub implementation. Concrete vendor adapters are registered per port and
  selected by configuration. The application runs end-to-end on stubs with no keys set.
- Adding or replacing a backend is implemented as a new adapter behind an existing port,
  without changes to the renderer, the chat core, or other parts.
- Port surface includes: LLM (chat, tool use, streaming, vision, web search, prompt
  caching), product sourcing, image generation/editing, a research/last-resort resolver,
  persistence + versioning, payment, auth, email, analytics, content moderation, file
  storage, and a bot gate.

### 6a. Card fulfillment cascade
Resolving an item from a user request runs an **ordered, configurable cascade**:
1. Direct retailer/product APIs.
2. URL or screenshot scrape of a provided/known page.
3. LLM web search + vision as a last resort (reads result pages, screenshots, and
   user-supplied photos to extract a card).
The tier order is configuration data and is expected to change as backends are added or
removed; it must not be hardcoded.

## 7. Chat interface
- The chat is presented as a **transparent overlay** on the live page preview; the page
  remains visible and updates behind the conversation.
- Input bar is a standard mobile composer with: text entry, file attachment, camera
  capture, microphone/voice, and send.
- The interface leverages model **vision** (uploaded and camera images inform design and
  item recognition), **voice** input, and attachments.
- Interaction pattern: the model infers requirements from sparse input and asks at most
  one clarifying question, only when a detail is decision-critical and cannot be
  inferred. Refinement is driven by natural language. Publish is offered as soon as the
  page is usable.

## 8. Backend environment
- Repository: `glacialsips-site/grook-peekgift`.
- Target deployment: Netlify site `peek-gift-vnext` (Next.js).
- Provisioned services (keys configured): Anthropic, Clerk (auth), Supabase
  (Postgres + storage), Stripe (live, gated by a pay-mode flag), Browserbase, ZenRows,
  Google Places, Resend (email), PostHog (analytics).
- Image generation is provider-agnostic behind the image port.

## 9. Engineering principles
- Define complete, stable interfaces (the IR and the ports) up front; implement behind
  them incrementally, beginning with stubs.
- The renderer is parametric: it understands section *kinds* and theme tokens, never
  specific pages. A model-authored design must render without renderer changes.
- The reference mockups define the visual quality target for the renderer; they are not
  templates to hardcode and are not the format the chat emits.
- No closed design enumeration (e.g. a fixed font/theme preset list) — that constrains
  output quality to the enumeration and is excluded by design.

## 10. Reference artifacts (in this project)
- **Reference mockups** — hand-built occasion and gift pages defining the visual bar.
- **`Peek Gift + Chat.html`** — a gift page demonstrating the full card system
  (multi-retailer products, a pick-one variant group, a custom item with a photo slot,
  an experience itinerary, a taunt card, a persistent action bar, a page slug) alongside
  the transparent chat overlay with the full input bar.
- **`Four Pages.html`** — four single-concept pages demonstrating per-page design range.

## 11. Design method (page authoring)
1. Identify the emotional core beneath the stated facts.
2. Commit to one specific organizing concept (often a real-world artifact or metaphor)
   precise enough to exclude generic options.
3. Derive every design decision from that concept: display typeface (varied per page),
   accent color, section names, a signature hero element, and copy voice; borrow the
   visual codes of the referenced genre.
4. Apply a consistent page skeleton — hero, two to four themed sections (cards, note,
   plan), one action, footer — plus the standard mobile interaction system.
5. Make the page specific to the individual recipient (name in the typography, the gift
   as the focal element). Genericness is the primary failure condition.
