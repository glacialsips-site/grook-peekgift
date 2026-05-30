# Design DNA Catalog — Conformance Suite (10 sites)

_Distilled (analysis agent) from the 10 `design/sites/*.html`. The schema-actionable synthesis.
Full per-site profiles live in the source HTML (our conformance fixtures). **Key finding:** the 10
wildly-different sites reduce to **~7 logical blocks + 3 universal mobile-system blocks**, with all
visual variety carried by **theme tokens + per-block variant enums** — the theme-as-data / block-registry thesis, proven._

## Block registry (union of section/block kinds — every style is token-driven)
**Chrome:** `site.nav` (brand{wordmark|glyph|script}, links[], trailingAction?, liveWidget{clock}?, scrollBehavior) · `site.mobileMenu` (right slide-in) · `site.stickyBar` (scroll-revealed, meta+CTA) · `site.footer` (rich link-columns | centered-lines) · `divider` (marquee|scallop|sprig|rule|proverb) · `marquee`.
**Hero (one block, `variant`):** eyebrow?, greeting{script}?, title{lines,emphasis}, lede?, meta[] (pills|cells|telemetry), media{frame: photographic|arched|polaroid|vinyl|porthole|crew-id|none, badge?}, ctas[], decor[]?, countdown?, backgroundEffect{image-gradient|grid-floor|starfield|conic-rays|sunburst|radial-glow|botanicals|memphis|none}.
**Schedule family (one block + skin enum):** `scheduleTimeline` skin = programme-dots | flight-plan-nodes | afternoon-dots | tickets | record-tracklist | tilted-gigs | step-cards; items[]{time,label,sublabel?,desc?,icon?,group?,side?}. (`courseSequence` = Omakase specialization.)
**Item family (the polymorphic crux):** `card` superset = {name, subtitle?, price?|estimateRange?, description, source{retailer|donor|maker|supplier}?, media{gradient|glyph|photo, swatches[]?}, badge?, claimState{label,claimedLabel,claimedBadge,dimOnClaim}, primaryAction{verb}}. Wrapped by `productCollection` | `giftRegistry` | `lotGallery{headlineLot,lots[]}`. `featureItem` = the headline experience.
**Narrative:** `editorialSplit` · `valueTriptych` · `statBand{countUp?}` · `detailRows{icon,label,value}` · `pricingTiers`.
**Forms (one block, capability varies):** `form` capability = newsletter|rsvp|reserve|auction-register|ticket-list; {eyebrow,title,body,field,submit{label,successLabel},finePrint?,backgroundEffect?}.
**Sheet:** `detailSheet` = a projection of the tapped `card` (never authored standalone).

## Knob axes & ranges (the design vector — extremes observed)
1. **layout** — centered-invite (Garden/Princess/Disco/Rad) ↔ editorial-commerce (HEMLOCK/Charity); split-hero (Bachelor/Space/Cyber/Omakase). container 1080–1240.
2. **color** — base light↔dark↔alternating(Charity); application flat(Omakase) → gradient(Princess/Disco) → glow(Space) → holographic(Cyber); accentCount 1(Omakase)–6(Rad); +saturation, lightnessMood, temperature, harmony{mono…clash}.
3. **type** — single tech+mono (Cyber/Space) ↔ 3-family script+serif+sans (Princess/Garden); displayClass {didone(Charity)|classical-serif(Garden/HEMLOCK/Omakase)|grotesque/condensed(Bachelor/Cyber)|chunky-block(Disco/Rad)}; case sentence↔UPPER(.42em); headingScaleMax 38→180; bodyWeight 300→600.
4. **motif** — none(Omakase) ↔ maximal(Rad/Cyber); density none|low|medium|high|maximal; vocabulary[] open set.
5. **texture** — flat(Rad/Princess/Garden) ↔ rich (grain HEMLOCK/Charity · scanlines Cyber · starfield Space); surfaceShadow soft-tint|hard-offset(Rad 8px/Disco)|neon-glow(Cyber)|none; glassBlur 8–28.
6. **shape** — square (HEMLOCK r0/.5px · Cyber chamfer) ↔ round/organic (Princess r999+arched · Garden arched 300px); borderWeight .5→4px; borderStyle solid|dotted|dashed; sheetRadius 0(Omakase)→30(Garden).
7. **motion** — minimal/hover (Omakase/Garden) ↔ live loops (Cyber glitch+holo · Space orbits+clock · Disco vinyl); + scroll-choreographed (Charity reveal+countUp+nav-switch); easing standard `(.3,.8,.2,1)` | premium `(.2,.7,.2,1)` | springy `(.3,.9,.2,1.1)`(Rad); marquee 18s(fast)→32s(slow).
8. **density** — airy (Omakase 104px) ↔ dense (Cyber/Rad); generous(HEMLOCK/Charity/Garden)·medium(Bachelor/Space/Disco/Princess).
9. **imagery** — photo-forward (Charity ken-burns/HEMLOCK) ↔ all-illustration (Cyber/Space neon-stroke · Rad/Disco filled-glyph); photoFrame none|arched|polaroid|circular|porthole|id-card|vertical-label; filter none|grayscale|contrast|ken-burns.
10. **voice** — reverent/formal (Omakase/Charity/Garden) ↔ hype/brash (Cyber/Rad/Bachelor/Disco); whimsical(Princess)·playful-jargon(Space)·craft(HEMLOCK).
11. **capability** — commerce(HEMLOCK) · rsvp(Princess/Disco/Rad/Garden) · reserve(Omakase) · auction(Charity) · ticketing(Cyber) · send-aboard/claim(Space/Bachelor); giftModel buy|claim(dedupe "so guests don't double up")|none.

## Universal interaction systems (the renderer's contract — identical across all 10)
1. **Slide-in menu** (`.scrim`+`.mobile-menu`): right, `min(82–86vw,340–380px)`, `translateX(100%→0)` on `body.menu-open`, `.35–.5s cubic-bezier(.3,.8,.2,1)` (Rad springy); links stagger `~.06–.1s`; scrim `rgba(dark,.4–.78)`±blur; hamburger→X; scroll-lock; safe-area pad.
2. **Detail sheet** (`.sheet`): bottom, `max-height:92vh`, grab-handle, `translateY(101%→0)` on `body.sheet-open`, `.4–.5s cubic-bezier(.3,.85,.2,1)`; **populated from tapped card data**; one occasion-tuned action + Close; top-radius is a theme knob (0→30).
3. **Sticky action bar** (`.mobile-bar`): fixed bottom, `IntersectionObserver` on hero (`rootMargin -40..-50% 0 0 0`) toggles `.show`; `translateY(140–160%→0)`; glass; meta+primary CTA.
4. **Claim/reserve state machine** (7/10): tap→sheet→action marks claimed|reserved|registered|aboard|bagged, disables, badge, dims `.55–.72`, auto-close ~900–1000ms (dedupe = domain invariant). HEMLOCK = cart-counter `.bump` instead (commerce).
5. **Esc closes any overlay** (universal).
6. **Responsive carousel:** desktop `repeat(3–4,1fr)` grids → mobile horizontal snap-carousel with edge-peek (`scroll-snap-type:x`, cards `flex:0 0 ~60–70%`, `margin:0 -20px`). → one `collection` block with `carouselOnMobile`.
7. **Shared scaffolding:** `:root` token palette · `--safe-t/--safe-b` = `env(safe-area-inset-*)` · `.wrap` container · `.eyebrow` · `.btn` variants · glass `header.nav` · marquee · feature+collection+form+footer · the 3 mobile-system blocks · ≥44px touch targets · `prefers-reduced-motion`.
8. **Do NOT port:** the `?cc=menu|sheet|bar` deep-link (screenshot rig); the real trigger is the user interaction.

## Schema takeaways
- ~7 logical blocks + 3 mobile-system blocks; variety = tokens + per-block variant enums → **block registry + theme-as-data**.
- The **item `card`** is the polymorphic crux; the detail-sheet is its projection.
- **schedule/timeline** = one block + skin enum (not 6 sections); **form** = one block + capability enum.
- Each axis (§ ranges above) → a clean enumerable knob. These ARE the `vibe-genome` knob ranges.
