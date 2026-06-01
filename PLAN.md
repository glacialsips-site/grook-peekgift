# PLAN.md — peek.gift vNext (STEP 0 plan, for founder + design greenlight)

> Written per `peek-jumpoff/FOR_CODE.md` STEP 0: **before any app code.** Nothing in
> `app/` or `lib/` changes until you + the design side greenlight this.
> Grounded in two audits (the existing v0 build, and the design bundle vs. its own
> mockups). Trust order honored: **mockups > engine/renderer.js > prose docs.**
> Open calls that need taste/spine judgment are in **`DESIGN_QUESTIONS.md`** — not guessed.

## 0. TL;DR
1. **Keep almost all of the existing v0** — cards/variants/picks, the Stripe/Clerk/
   Supabase/Resend/scrape/imagegen plumbing, the recipient flow, and the Peek voice.
2. **Freeze the spine.** Adopt `ir/contract.ts` as the IR; add `ir/ports.ts`; migrate
   `lib/types.ts` as a superset (Vibe→ThemeSpec, 3 hero columns→`MediaSlot`, card
   `image_url`→`MediaSlot`, +`sections[]`/`page_type`/`cta_label`/`concept`). Move every
   vendor call behind a port. Generate the Zod mirror (`ir/schema.ts`) — referenced
   everywhere but it doesn't exist yet.
3. **Swap the brain as a MERGE.** Keep `PEEK_SYSTEM_PROMPT`'s voice + card mechanics; add
   the JUMPOFF design layer; add `set_concept`/`set_theme`/`upsert_section` tools. Move
   the model to Opus + streaming + prompt-caching (today: Sonnet, non-streaming, no cache).
4. **Build Milestone 0 first** — the chat-over-live-preview mobile slice, on the contract
   + port stubs, painting at mockup caliber.
5. **One correction the audit forces:** the bundle's `engine/renderer.js` is a *prior
   generation* — it does NOT consume `PeekIR` (reads `spec.tokens`/`s.items`/`ir.headline`,
   emits `--bg` not `--peek-*`, missing the `details` kind, undeclared `gallery` kind,
   card vocab `homemade/experience/idea`). We **port its proven interaction shell onto the
   contract**; we do not copy it as-is. (§3.)

## 1. Stack — confirm vs "the ultimate stack" (deviations flagged)
| Layer | Handoff | Reality / plan | Deviation |
|---|---|---|---|
| Framework | Next 15 / Netlify | matches | — |
| Brain | Opus, tool use, streaming, vision, web search, prompt-cache JUMPOFF+pantry, behind `LLM` port | today **Sonnet 4.6, non-streaming, no cache**, direct SDK | ⚠ → Opus 4.8 + streaming + caching; wrap in `LLMPort` |
| Auth | Clerk | matches (`lib/clerk-safe`) | — |
| Data | Supabase PG `peek_v2`, IR as JSONB + `*_versions` append | today `pg` Pool, inline SQL, `search_path peek_v2`; **no versions table** | ⚠ add `*_versions`; wrap in `PersistencePort` |
| Storage | Supabase bucket | today **Netlify Blobs** + local fallback | ⚠ behind `StoragePort`; bucket swap is a later adapter |
| Money | Stripe $12 publish | matches (mock today) | — |
| Card fulfillment | tiered **CardResolver**, order = DATA | `CardResolverPort` **already in `ports.ts`**; needs config surface + dispatch impl + tier1/2 split + screenshot input | ⚠ finish cascade (DQ-10) |
| Imagery | vendor-neutral `ImageProvider`, fal first | today **Replicate + Fal via raw fetch** | ⚠ behind `ImagePort` |
| Ops | Upstash/Inngest/Sentry/PostHog | PostHog+Sentry present; rest absent | later adapters |
| Gates | Turnstile + image moderation | absent | `BotGate`/`Moderation` stubs now, real before public publish |

Net: stack matches; deviations are all "existing concrete vendor now sits behind its port" + "Sonnet→Opus, add streaming/caching." No architecture conflict.

## 2. Spine migration — field-exact (from the existing-build audit)
| Today (`lib/types.ts`) | Becomes | Consumers to update |
|---|---|---|
| `Vibe{tone,palette,mood_words,motion?,font_pairing?}` (font always Fraunces+Inter — the trap) | `ThemeSpec` + `Concept` | `set_vibe`→`set_theme`, `lib/themes.ts` presets→seed ThemeSpecs, `vibeToCssVars`, `RecipientView`, OG gen |
| `Peek.hero_image_url`+`hero_image_source`(+untyped `hero_prompt`) | `hero: MediaSlot\|null` | RecipientView ×4, imagegen |
| `Card.image_url:string\|null` | `media: MediaSlot\|null` | RecipientView ×3, `add_card` |
| (none) | **+`page_type`,`cta_label`,`concept`,`sections[]`** | RecipientView (today a hardcoded `door→note→cards→done` machine → render from `sections[]`/`page_type`) |
| `Card`/`VariantGroup`/`Pick` | **kept verbatim** (only `image_url`→`media`) | — |

**DB on `peeks`:** reshape `vibe`→`theme` jsonb; fold `hero_image_url`/`hero_image_source`/`hero_prompt`→`hero` jsonb; add `concept`/`sections` jsonb + `page_type`/`cta_label` text; add `*_versions` append table; **invalidate `og_images`** (caches `vibe.palette`+hero); backfill `vibe`→`theme`. Keep `cards`/`variant_groups`/`picks`/`events`.

**Ports — move these existing call sites behind the seam (no behavior change):**
`PersistencePort` ← all inline SQL (`runTool` + every route; `lib/db.ts` helpers become the adapter body — **`runTool` calls `ports.*` only, never raw SQL**). `LLMPort` ← `lib/anthropic.ts` + chat route. `PaymentPort` ← `lib/stripe.ts` + publish. `ImagePort` ← `lib/imagegen.ts` (Replicate+Fal). `ProductSource`/`CardResolver` ← `app/api/scrape` + the `scrape_url` self-HTTP round-trip (collapse it). `StoragePort` ← `lib/storage.ts`. `EmailPort` ← `lib/resend.ts`. `AnalyticsPort` ← PostHog. `AuthPort` ← clerk-safe. `Moderation`/`BotGate` ← new stubs. **Generate `ir/schema.ts`** (Zod mirror); validate every tool payload before persist; sanitize `custom` html before render.

## 3. Renderer reconciliation (the big audit finding)
The bundle's `engine/renderer.js` is **reference, not a conformant consumer** — it predates the contract: reads `spec.tokens` (nested) not `ThemeSpec`; reads `s.items` not `Section.data`; reads top-level `ir.headline/eyebrow/nav/brand/footer/cta` absent from `PeekIR`; emits `--bg/--accent` (no `--peek-` prefix); implements rail/lookbook/stubs/tiers/tracklist/courses/flightplan/giftgrid/gallery/note/custom/steps but **missing `details`** and has **extra `gallery`**; giftgrid card kinds `homemade/experience/idea` ≠ contract `product/activity/aspirational/digital`; needs richer tokens than `ThemeSpec` defines.

**Plan:** build the renderer as a **component system consuming `PeekIR`/`Section.data`**, **porting the proven interaction shell** (sticky action bar, bottom sheet, slide menu, scroll reveals, the `scene`/`frame`/`motif` builders + the WORLDS/PALETTES pantry in `parts.js`) onto the contract. Renderer knows **kinds, never specific pages** (TIPS trap #4). `custom` stays the primary expressivity (the model is the resolver — no archetype zoo); promote a kind to first-class only when it carries **state/interactivity** sanitized `custom` html can't (see DQ-3). Reconciliation calls that are taste/spine → `DESIGN_QUESTIONS.md`.

## 4. Phased build (each phase composes; no dead ends)
- **Milestone 0 (FIRST, post-greenlight):** Opus chat laid over a live mobile preview, chat/keyboard over the page (the `reference/chat-ui` "Live" shape). A **conformant mini-renderer** (hero + giftgrid + note + custom + sticky bar) consuming `PeekIR`; chat authors IR via `set_concept`/`set_theme`/`upsert_section`/`add_card`; preview updates live; runs **entirely on port stubs (no keys)**; deploy a preview URL. Built ON the contract + ports from day one — not throwaway.
- **Phase 1 — Freeze the spine.** contract + ports + `lib/types.ts`/DB migration + Zod mirror; every vendor call behind its port. **No new features — just the seams.**
- **Phase 2 — Swap the brain.** Merge JUMPOFF into `PEEK_SYSTEM_PROMPT` (keep voice + card flow); add design tools; Opus 4.8 + streaming + prompt-cache.
- **Phase 3 — Renderer to full kind coverage + QA.** all kinds incl. `details`; safeword self-report; the test loop; deploy.
- **Phase 4 — Fill ports for real,** one adapter at a time (CardResolver tiers incl. web-search+vision, fal, Supabase storage, Turnstile, moderation). Nothing upstream changes.

## 5. Conformance tests (the bar — FOR_CODE + TIPS)
1. **Conformance:** `samples/dad-60th.ir.json` → renderer (no chat) paints at `mockups/For the Old Man.html` caliber. (Can't today — renderer non-conformant; Phase 0/3 fixes.)
2. **Cold round-trip:** that sample's `_user_input` → chat cold → *different* concept, *same* caliber.
3. **Range:** 10 weird briefs cold (range is the metric, not one demo).
4. **Spine:** Zod-validate every tool payload; reject invalid; sanitize `custom` html.
5. **Safeword:** returns the structured self-report.

## 6. What I imported / weeded (record)
Canonical bundle (verbatim, vouched) in `peek-jumpoff/`; quality bar + chat-over-preview surface + flagged extras in `peek-jumpoff/reference/` (see `reference/REFERENCE.md` + the design chat's own `DESIGN_EXPORT_MANIFEST.md`). Cut: the drifted `design_handoff_mobile_chat_sites/` doc sprawl, duplicate copies, `qa.html`, the 2.5 MB asset; fenced the parametric `resolver/director` as `engine-parametric-REJECTED/`.

## 7. STOP — greenlight gate
This is STEP 0. **No `app/`/`lib/` changes until you + design sign off** on this plan and the calls in `DESIGN_QUESTIONS.md`. On greenlight I start with Milestone 0.
