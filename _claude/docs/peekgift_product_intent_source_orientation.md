# peek.gift Product Intent + Source Orientation Brief

## 0. What this document is

This is a product-orientation brief for the next technical pass on `peek.gift`.

It describes the intended product behavior at a high level, using the uploaded product-framing document, the current mobile screenshots, and Frank’s walkthrough as context. It is not a final requirements spec, not a full architecture document, and not a substitute for inspecting the source code.

The expected use is simple: read this first to understand what the app is supposed to be, then inspect the available source code with Frank and decide which existing pieces are the best baseline, which pieces are usable, which pieces are rough, and which pieces need consolidation.

The screenshots in this package were captured from Frank’s phone/browser in dark mode. They are included to explain current visible behavior and flow. They are not meant to be treated as final visual-design direction.

---

## 1. Core product idea

`peek.gift` is a gift-page creation product.

A **Creator** builds a personal gift page for a **Recipient**. The page contains a hero image, visual styling, a personal note, and a curated set of things the Recipient can pick from. The Recipient opens the page, sees something that feels personal, and chooses from inside the Creator’s curated frame.

The product is not simply an AI gift recommendation tool, a wishlist, or a generic ecommerce checkout. The important concept is:

> The Creator creates the emotional frame.  
> The Recipient gets agency inside that frame.

The recipient-facing gift page is a major part of the product. It is intended to feel like a designed personal artifact, not a utility form.

---

## 2. Terms used in this brief

The terminology below is used consistently in this brief so the next chat does not have to infer who is who.

| Term | Meaning |
|---|---|
| **Creator** | The person building the gift page. They may also pay for it and send/share it. |
| **Recipient** | The person receiving the gift page and choosing from the options. |
| **Gift page** | The recipient-facing page being created. |
| **Pick / item** | One selectable option on the gift page. It may be a retail product, experience, IOU, donation, joke, manual entry, etc. |
| **Draft** | The in-progress gift page before checkout/public sharing. |
| **Slug page** | The final recipient-facing URL/page. |
| **Service level** | The public offering type, currently shown as Studio / Concierge / Atelier. Names and details may change. |

In source code, older or alternate labels may appear. For this brief, **Creator** and **Recipient** are the two main human roles.

---

## 3. Current service-level concept

The current landing page presents three public service levels. The current names are:

1. **Studio**
2. **Concierge**
3. **Atelier**

These names and public descriptions are content/product configuration, not the core identity of the app.

### Studio

Studio is the current self-serve concept. The Creator builds the page, pays the page fee, shares or sends the page, the Recipient picks, and the Creator handles actual fulfillment after receiving the result.

### Concierge

Concierge is the higher-touch concept. The Recipient picks, and `peek.gift` can handle ordering/shipping from retailers on the Creator’s behalf. Item costs, service fees, and fulfillment data may interact with checkout or post-selection workflow.

### Atelier

Atelier is the highest-touch concept. Items may route through `peek.gift`, be assembled into a physical gift/package, and shipped as a more complete gift experience.

### Product meaning

The service-level concept affects more than landing-page copy. Depending on the selected offering, it may affect pricing, checkout, contact/shipping information, notifications, and fulfillment workflow.

The current labels are useful public labels, but Frank may rename them, alter them, hide them, combine them, or change the offer details during iteration.

Reference: `screenshots/05-landing-service-levels.jpg`

![Landing service levels](screenshots/05-landing-service-levels.jpg)

---

## 4. Application model: spine + modules

Frank’s intended application model is a central build-flow **spine** with separate modules/boltons plugged into it.

The spine is the route/state/orchestration layer that lets the gift-page build flow work. Modules handle specialized behavior.

Examples of modules/boltons in the product model:

- account/auth/guest flow
- draft persistence
- image upload / stock image selection
- palette extraction
- style generation
- design drawer/customization
- URL product lookup/scraping
- screenshot/image extraction
- API/LLM item search
- manual item entry
- item card rendering
- rules/selection logic
- notifications
- Stripe/checkout/pricing
- done/share page
- recipient slug page

The reason this matters is maintainability. Frank expects to keep iterating. Pricing, service levels, add-item providers, notification providers, and visual logic may change. The app is intended to be structured so those pieces can be reviewed and modified without turning the whole project into one monolithic file or a scattered set of hardcoded behaviors.

This brief does not define the exact code structure. The actual source needs to be inspected. The key product context is that the app is meant to work as a spine with modules attached, not as a single tangled implementation.

---

## 5. Persistent draft model

The build flow is intended to behave like a persistent draft composer.

The Creator is not filling out six unrelated pages. They are progressively composing one gift page. As they move through the flow, the draft accumulates data.

Conceptually, a draft includes:

- Creator/session/account identity
- Recipient name
- occasion/context
- Creator/from name
- personal note
- optional Recipient email/phone
- selected/uploaded hero image
- image-derived palette/style data
- selected/generated style settings
- item cards
- rules
- notification settings
- checkout/payment state
- final slug/share state

The Creator may move forward and backward through the flow. Basics data, style choices, items, rules, and other draft state are expected to persist. For example, if the Creator adds items, goes back to change the hero image or note, and then returns to Picks, the existing items should still be part of the draft.

Authenticated Creators may have saved drafts/projects. Guest Creators may build with lower friction, with whatever saving/resume limitations exist in the current implementation.

---

## 6. High-level visible flow

The current visible flow appears to be:

1. Landing page
2. Build CTA
3. Auth / continue-as-guest gate
4. Step 1 — The Basics
5. Step 2 — The Look
6. Step 3 — The Picks
7. Step 4 — The Rules
8. Step 5 — What They’ll See
9. Step 6 — Checkout
10. Done/share page
11. Recipient slug page
12. Recipient finalizes pick
13. Creator receives notification / next steps

The current visible route appears to use `/build?...` style routing. Older route names or labels may exist in code.

The main user experience is mobile-first, because near-term traffic is expected to come heavily from social/mobile channels. Desktop still matters, but the mobile flow is the primary lens for this walkthrough.

---

## 7. Screenshot index

The screenshots are intentionally named in chronological order, with no special-case names.

| Ref | File | Description |
|---|---|---|
| 00 | `00-contact-sheet.jpg` | Quick overview sheet of all screenshots |
| 01 | `01-landing-hero.jpg` | Landing hero / main CTA |
| 02 | `02-landing-positioning.jpg` | Landing emotional positioning / examples |
| 03 | `03-landing-anything-can-go-inside.jpg` | “Anything can go inside” section |
| 04 | `04-landing-page-is-the-gift.jpg` | Page-as-gift section and service-level intro |
| 05 | `05-landing-service-levels.jpg` | Studio / Concierge / Atelier cards |
| 06 | `06-landing-voices-final-cta.jpg` | Voices / final CTA |
| 07 | `07-auth-guest-gate.jpg` | Auth / guest gate |
| 08 | `08-basics-intro.jpg` | Basics intro and hero image area |
| 09 | `09-basics-fields-contact.jpg` | Basics fields and optional Recipient contact |
| 10 | `10-look-intro-preview.jpg` | Look intro and page preview |
| 11 | `11-look-design-drawer.jpg` | Look/design drawer |
| 12 | `12-picks-intro-empty-cards.jpg` | Picks intro and empty cards |
| 13 | `13-picks-add-item-surface.jpg` | Add item surface |
| 14 | `14-picks-sample-item-preview.jpg` | Picks page with sample item |
| 15 | `15-picks-items-drawer.jpg` | Items drawer |
| 16 | `16-rules-intro.jpg` | Rules intro |
| 17 | `17-rules-drawer-settings.jpg` | Rules drawer settings |
| 18 | `18-rules-thermometer-preview.jpg` | Rules preview with thermometer/fill bar |
| 19 | `19-recipient-preview.jpg` | “What They’ll See” recipient preview |
| 20 | `20-checkout.jpg` | Checkout screen |

---

## 8. Landing page

Reference: `screenshots/01-landing-hero.jpg` through `screenshots/06-landing-voices-final-cta.jpg`

The landing page explains `peek.gift` as a shareable gift page the Recipient picks from.

Visible ideas include:

- a shareable gift page
- the Recipient peeking/picking
- the Creator shipping or fulfilling at the current self-serve level
- one flat page fee / no subscription
- a more emotional gift framing than a generic gift card
- examples of what can go inside
- service levels
- testimonials/voices
- repeated Build/Start CTA

The exact copy is not final. The current flat fee shown in screenshots is a current/placeholder value and may be driven by Stripe/configuration rather than static text.

The landing page also broadens the meaning of a “pick.” A pick can be a retail product, money toward something, recurring/personal gesture, experience, donation, note, joke, or other relationship-specific entry.

![Landing hero](screenshots/01-landing-hero.jpg)

![Anything can go inside](screenshots/03-landing-anything-can-go-inside.jpg)

---

## 9. Auth / guest entry

Reference: `screenshots/07-auth-guest-gate.jpg`

After the Build CTA, the current flow shows an auth/guest gate.

Visible options include:

- Continue with Google
- email/password account creation
- sign in
- continue as guest

The product concept supports low-friction building. A Creator can begin without a heavy account setup. Authenticated Creators can have saved drafts/projects and return to work later.

The auth flow connects to the draft model. It is not just a login screen floating outside the product.

![Auth / guest gate](screenshots/07-auth-guest-gate.jpg)

---

## 10. Step 1 — The Basics

Reference: `screenshots/08-basics-intro.jpg`, `screenshots/09-basics-fields-contact.jpg`

Step label: **Step 1 of 6 — The Basics**

This step collects the core information needed to begin composing the gift page.

Visible/current fields include:

- hero image
- Recipient name
- occasion
- Creator/from name
- personal note
- optional Recipient email
- optional Recipient phone

The hero image is especially important. It is not just decoration. It feeds the visual styling system and helps make the final page feel personal.

Hero image paths visible or intended include:

- upload an image
- use a default image
- browse/select from Frank-supplied stock images
- possible broader image selection/search later

The occasion/context field helps shape tone and style. Occasion labels may change. If an “Other” / “Something else” path exists, the concept is that the Creator can manually enter a context, and that context can later influence the style engine.

Recipient email/phone are optional delivery/contact fields. They may support sending the page, notifications, SMS/email behavior, or service-level-specific workflows. They are separate from Creator account identity.

![Basics intro](screenshots/08-basics-intro.jpg)

![Basics fields and contact](screenshots/09-basics-fields-contact.jpg)

---

## 11. Step 2 — The Look

Reference: `screenshots/10-look-intro-preview.jpg`, `screenshots/11-look-design-drawer.jpg`

Step label: **Step 2 of 6 — The Look**

This step controls the visual identity of the recipient-facing gift page.

The intended style model is not a simple generic preset picker. The concept is:

1. The Creator selects or uploads a hero image.
2. The system extracts/digests colors from that image.
3. The system combines image-derived colors with available context, such as occasion.
4. The style engine generates an initial page direction.
5. If the Creator does nothing else, the page is intended to already look good.
6. If the Creator wants alternatives, the drawer can show alternate generated directions.
7. If the Creator wants more control, the drawer can expose manual adjustments.

The current drawer shows controls around:

- generated look/style options
- colors: ink, paper, accent
- type style
- font
- corners/shape
- density/spacing

The experience is layered. The simple path is accepting the generated look. The deeper path is opening the drawer and adjusting the design.

![Look intro / preview](screenshots/10-look-intro-preview.jpg)

![Look drawer](screenshots/11-look-design-drawer.jpg)

---

## 12. Step 3 — The Picks

Reference: `screenshots/12-picks-intro-empty-cards.jpg`, `screenshots/13-picks-add-item-surface.jpg`, `screenshots/14-picks-sample-item-preview.jpg`, `screenshots/15-picks-items-drawer.jpg`

Step label: **Step 3 of 6 — The Picks**

By this point, the draft has a page shell:

- hero image
- recipient/from/context data
- personal note
- generated visual styling
- empty item-card slots

Step 3 populates those cards with picks the Recipient can choose from.

A pick can be:

- a retail product
- a product from any website
- a screenshot of a product
- an AI/API search result
- a manual entry
- an experience
- an IOU
- a donation
- a joke/gag option
- a personal offer
- a handmade/home-made item
- any other selectable idea the Creator wants to include

The item-card model is broader than normal ecommerce SKUs. Some picks have URLs and prices. Some are custom and may not.

![Picks intro](screenshots/12-picks-intro-empty-cards.jpg)

![Sample item preview](screenshots/14-picks-sample-item-preview.jpg)

---

## 13. Add Item area

Reference: `screenshots/13-picks-add-item-surface.jpg`

Adding items is one of the most important and most delicate UX areas.

The Creator’s mental model is:

> “I want to add something to this card.”

The underlying system may interpret that input through different paths:

1. **URL/product lookup**  
   The Creator has a product link. The system attempts to fetch product details.

2. **Screenshot/image lookup**  
   The Creator has a screenshot or image. The system attempts to extract product/item details.

3. **Search/API lookup**  
   The Creator describes an idea such as “candle under $40” or “cactus gift.” The system searches/generates candidate options.

4. **Manual entry**  
   The Creator directly creates or edits the item.

Manual entry is not only a fallback. It is the path for non-retail, personal, joke, experience, IOU, donation, handmade, or custom entries.

The current screenshot exposes multiple add-item modes. The product intent is that these capabilities exist, while the user-facing experience remains simple and intuitive. The technical details of scraper vs screenshot parser vs API search are internal to the app’s routing, not something the Creator is expected to understand.

Cost matters in the background. URL and screenshot paths are generally preferred before expensive API/LLM usage when those inputs are available. The UI can still make all paths discoverable.

Conceptually, Add Item behaves like a hub:

```text
Add Item area
  ├── URL/product lookup
  ├── Screenshot/image lookup
  ├── Search/API lookup
  └── Manual entry

All paths normalize into:
  → editable item draft
  → saved item/card
  → rendered recipient-facing pick
```

If parsing or fetching creates imperfect data, the next useful state is an editable item draft.

![Add item surface](screenshots/13-picks-add-item-surface.jpg)

---

## 14. Item cards

Item cards need to support retail and non-retail entries.

Conceptual item data may include:

- item id
- title/name
- image/thumbnail
- price/value, optional
- description, optional
- Creator note, optional
- source URL, optional
- source type, such as URL, screenshot, search/API, manual
- status/completeness metadata, if useful

The exact schema belongs to the source code. The product meaning is that items are durable, editable parts of the gift-page draft.

Each added item appears in the visual gift-page preview and is also available through item-management UI.

---

## 15. Picks drawer / item management

Reference: `screenshots/15-picks-items-drawer.jpg`

The Picks page has two related views:

1. **Main page preview**  
   This shows the recipient-facing page layout with cards/placeholders.

2. **Items drawer**  
   This shows a compact management list of the items already added.

Current visible drawer behavior:

- title: Items
- item row with thumbnail/placeholder, title, price
- remove/delete control
- `+ Add an item`

The drawer is the compact item-management view. It is separate from the full visual page preview.

The intended role of this area includes:

- seeing all added picks in one compact list
- adding another item
- deleting/removing an item
- editing/opening details for an existing item
- seeing price/value when available
- seeing incomplete or missing data when an item needs cleanup

The current visible drawer may only show delete/add behavior. That visible state is not necessarily the full ceiling of the item-management module.

![Picks items drawer](screenshots/15-picks-items-drawer.jpg)

---

## 16. Step 4 — The Rules

Reference: `screenshots/16-rules-intro.jpg`, `screenshots/17-rules-drawer-settings.jpg`, `screenshots/18-rules-thermometer-preview.jpg`

Step label: **Step 4 of 6 — The Rules**

This step defines how the Recipient can choose from the available picks.

Current visible concepts include:

- show/hide fill bar / thermometer
- fill by dollar amount
- fill by item count
- fill by both
- dollar cap
- item cap
- show/hide dollar value to Recipient
- hard stop
- allow over cap
- allow over cap but require note/request
- notification toggles

The Rules step allows different gift patterns:

- Recipient picks one item.
- Recipient picks up to a number of items.
- Recipient picks up to a dollar amount.
- Recipient picks according to both item count and dollar value.
- Recipient may be blocked from going over.
- Recipient may be allowed to go over.
- Recipient may be allowed to request going over with a note.

The fill bar/thermometer is recipient-facing. It shows progress against the configured rule if enabled.

Rule defaults are intended to be aware of the actual item set. For example, if the current draft contains a $900 item, a default $200 cap would not make sense as a blind static default. The exact formula is not settled in this brief, but the concept is that rule defaults can use item data rather than static constants alone.

![Rules intro](screenshots/16-rules-intro.jpg)

![Rules drawer](screenshots/17-rules-drawer-settings.jpg)

![Rules thermometer preview](screenshots/18-rules-thermometer-preview.jpg)

---

## 17. Notifications

The Rules drawer currently shows notification preferences such as:

- Recipient opens the page
- Recipient makes a selection
- Recipient submits an over-cap request
- Recipient finalizes pick
- page is about to expire
- page expired

The notification concept is provider/channel-agnostic at this level. Email and SMS may both matter. The exact current implementation and providers need source verification.

At the current self-serve level, the key product behavior is that after the Recipient finalizes, the Creator receives enough information to understand what was selected and handle next steps.

---

## 18. Step 5 — What They’ll See

Reference: `screenshots/19-recipient-preview.jpg`

Step label: **Step 5 of 6 — What They’ll See**

This is a Creator-side preview/test of the Recipient experience.

Visible/current preview behavior includes:

- recipient-facing page preview
- item selection behavior
- fill bar/thermometer behavior
- finalize button
- reset preview
- continue to checkout

This is not the live Recipient session. It is a preview/test mode before checkout/share.

If something looks wrong, the Creator can go back through the flow, change earlier inputs, and return forward with draft state preserved.

There may be duplicate or incorrect button behavior in the current visible implementation. The source needs to be checked before treating the current screen as final.

![Recipient preview](screenshots/19-recipient-preview.jpg)

---

## 19. Step 6 — Checkout

Reference: `screenshots/20-checkout.jpg`

Step label: **Step 6 of 6 — Checkout**

The current visible checkout path is broken/incomplete in the live flow. This screenshot captures the visible screen state, not the final intended payment behavior.

Conceptually, checkout is Stripe-backed and configuration-driven where possible.

Checkout may involve:

- selected service level
- page/service fee
- promo/coupon behavior
- Stripe payment
- receipt email
- relevant tax/payment configuration
- service-level-specific contact/shipping information
- post-payment handoff into the done/share page

The current pricing shown in screenshots is not the core product truth. Pricing and service-level behavior are intended to come from configuration/Stripe-related state rather than being buried as scattered static values.

The checkout experience is intended to feel like part of `peek.gift`, even where Stripe is powering payment underneath.

![Checkout](screenshots/20-checkout.jpg)

---

## 20. Done / share page

No screenshot of the post-checkout/done page was captured because the current visible checkout path could not be completed.

The expected behavior needs source verification.

Conceptually, after successful checkout/payment, the Creator lands on a done/share page with:

- final gift-page link / slug URL
- copy-link action
- send/share action
- possible email/SMS sending if configured
- confirmation that the page is ready
- guidance on what happens next

At the current self-serve level, the Recipient opens the page, finalizes a choice, and the Creator receives the selection so they can handle fulfillment.

---

## 21. Recipient slug page

No direct screenshot of the final Recipient slug page was captured in this walkthrough.

The expected behavior needs source verification.

Conceptually, the slug page is expected to look and behave like the preview from **What They’ll See**:

- styled hero image/page
- personal note/context
- available picks/items
- rule behavior enforced
- fill bar/thermometer if enabled
- prices shown/hidden according to rules
- ability for Recipient to select/finalize
- over-cap note/request if enabled
- confirmation state after finalization

The recipient page matters as much as the Creator-side creation flow because this is the artifact the Creator is paying to send.

---

## 22. Recipient-side account / follow-on behavior

The source may contain recipient-side account prompts or related logic.

The high-level product idea is that a Recipient may eventually be invited to create an account after receiving/finalizing a gift page. That can support growth mechanics such as sending their own page, credits, discounts, or similar offers.

Those mechanics are product/configuration choices, not the core identity of the recipient page.

---

## 23. Dashboard / saved drafts

Authenticated Creators may have an account/dashboard area where they can see and resume saved gift-page drafts/projects.

The current implementation may already contain rough or partial dashboard behavior.

Conceptually, the dashboard area connects to the persistent draft model:

- logged-in Creator sees draft pages
- Creator resumes unfinished drafts
- Creator may manage completed pages if supported
- draft/project data persists through backend storage rather than fragile local-only state

Guest and authenticated flows both point back to the same underlying product concept: the gift page is a persistent draft until it becomes a shareable recipient page.

---

## 24. Known caveats from this walkthrough

This brief was built from:

- Frank’s existing product-framing document
- mobile screenshots of the current visible flow
- Frank’s walkthrough/clarifications

Known caveats:

- The screenshots are in dark browser/device mode.
- Checkout is currently visibly broken/incomplete.
- Done/share page was not captured.
- Final Recipient slug page was not captured.
- The source may contain working versions of screens/modules not visible in the screenshots.
- Some current UI is placeholder or rough.
- Some current copy is placeholder.
- Service-level names/copy/pricing may change.
- The source may contain multiple attempts/versions of the same module.

---

## 25. How this brief relates to source review

This brief is meant to give the next technical chat the product picture before source review.

The practical next step is source-code triage with Frank:

- identify the best source baseline
- locate the existing spine
- locate existing modules/boltons
- identify which pieces are already usable
- identify which pieces are broken/rough
- identify duplicate/older implementations
- understand where module boundaries are clean or blurred
- decide with Frank what to repair, consolidate, defer, or replace

The goal is not to blindly rebuild from scratch. Frank believes the available code contains many useful working pieces, but the current state is fragmented and difficult to continue without a clean product-orientation pass.

---

## 26. Product principles captured from the walkthrough

### Mobile-first, desktop-compatible

The flow is being judged primarily through mobile because social/Instagram traffic is important. Desktop still needs to work.

### The recipient page is the product

The final page is not secondary. It is the artifact the Creator is paying to make.

### Simple path first

A nontechnical Creator is expected to be able to click through and create something good without understanding the internals.

### Deep controls are available when needed

Side drawers expose deeper controls and management views without making them mandatory for the simplest path.

### Add Item is the hardest UX area

The Creator experience is intended to feel like adding “something,” not choosing between backend systems. URL, screenshot, search/API, and manual entry are underlying paths that normalize into item cards.

### Modules remain separable

The app is intended to remain understandable as a spine with modules. Pricing, checkout, notifications, style generation, item ingestion, and service-level behavior are all areas Frank expects to keep iterating.

### Drafts persist

The Creator can move backward and forward through the flow without losing the gift page they are composing.

---

## Appendix A — Screenshot contact sheet

For a quick visual scan of the current screenshot package:

![Contact sheet](screenshots/00-contact-sheet.jpg)
