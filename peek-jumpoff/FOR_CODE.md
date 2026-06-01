# FOR CODE — paste-ready build instructions
### (This is the message to give your Claude Code chat. A fresh chat is fine.)

You are picking up **peek.gift vNext** in repo `grook-peekgift`. A design pass produced
this package. **Read `README.md` then `00_MAP.md` in full before writing any code.**

## What you're proving
A cold Opus chat + the `JUMPOFF.md` prompt produces single-recipient gift/invite pages
**as good as `mockups/*.html`, from one sloppy user line**, stored as the shared **IR**
(not HTML), on a **vendor-neutral port** layer. Success = *range* (10 weird briefs all
land at mockup caliber) + *spine conformance* (every page is a valid `PeekIR`).

## STEP 0 — PLAN FIRST. Do not write app code yet.
Before any build, write **`PLAN.md` to the repo root** and STOP for founder review. It must cover:
- **The stack** you'll use (confirm it matches "The ultimate stack" below — flag any deviation).
- **The spine migration** (how you'll evolve `lib/types.ts` → `ir/contract.ts` + add `ir/ports.ts`).
- **The phased build**, starting with the **Milestone 0 vertical slice** (below).
- **The conformance tests** you'll use to prove it.
Then stop. The founder reviews `PLAN.md` with the design side and greenlights before you build.

## Milestone 0 — the operational slice (build this FIRST, once greenlit)
An **operational Opus chat laid over a live-updating page preview**, on mobile-first
layout that also works on desktop, with the chat/keyboard flowing over the real-time
preview. The preview is painted by the **engine renderer** (`peek-jumpoff/engine/renderer.js`
— port it to your component system; it turns `ThemeSpec + IR` into the themed,
interactive page). Prove: type → chat authors IR via tools → preview updates live →
it looks like `mockups/`. Build this slice ON the contract + port stubs from day one so
it's not throwaway. THEN harden into the full spine below.

## Then do this, in this order. Do NOT add features during step 1.
1. **Freeze the spine.**
   - Adopt `ir/contract.ts` as the IR. **Migrate `lib/types.ts` to it as a SUPERSET:**
     keep `Card` / `VariantGroup` / `Pick` exactly; **replace the thin `Vibe`** with
     `ThemeSpec` + `Concept`; **add `sections[]`** and `page_type` / `cta_label`; change
     `hero_image_url`/`hero_image_source` → `hero: MediaSlot`; card `image_url` →
     `media: MediaSlot`.
   - DB migration on `peeks`: drop `vibe`; add `concept`, `theme`, `sections`, `hero`
     (jsonb), `page_type`, `cta_label` (text). Keep `cards`/`variant_groups`/`picks`.
   - Add `ir/ports.ts`. **Move every existing vendor call** (scrape, imagegen, db,
     stripe, storage, email) **behind its port**, using the provided stubs as the
     default. No behavior change — just the seam. (`runTool` should call `ports.*`,
     never a vendor SDK or raw SQL inline.)
   - Generate a Zod mirror of `contract.ts` and **validate every tool payload** before
     persisting. Sanitize any `custom`-block HTML before it can render.

2. **Swap in the design brain — as a MERGE, not a replace.**
   - **Keep** the existing `PEEK_SYSTEM_PROMPT` voice (lowercase, conspiratorial) AND
     the product mechanics (card flow, variant rules, the tool loop). **Do NOT delete
     them.**
   - **Insert** the contents of `JUMPOFF.md` as the *design-direction* layer of the
     system prompt (concept / one bold move / type hierarchy / anti-slop / "infer, don't
     ask"). Net: same Peek personality, now with art direction.
   - Add chat tools so the model authors *design*, not just cards: `set_concept`,
     `set_theme`, `upsert_section` (alongside the existing card tools, now writing
     `MediaSlot`).
   - Make the renderer paint `ThemeSpec` + `sections[]` including the `custom` block
     (map `ThemeSpec` → `--peek-*` CSS vars). The renderer must know *kinds*, never
     specific pages. Reference: `engine/renderer.js` patterns in the prior handoff.

3. **Wire QA.**
   - Run entirely on the **port stubs** (no real API keys needed to test).
   - Implement the **safeword**: when the user message is exactly the configured
     safeword, the chat drops persona and returns a structured self-report (what it
     inferred / the pantry lacked / it faked / fought it / would make gnarlier).
   - Deploy the preview build so the founder can use it.

## Definition of done (before you say it's done)
- [ ] `lib/types.ts` is the superset migration; old `Vibe` is gone; cards untouched.
- [ ] All vendor calls go through `ports`; app runs end-to-end on stubs.
- [ ] System prompt = existing voice + JUMPOFF design layer (merge verified — voice and
      card flow still intact).
- [ ] Renderer paints `samples/dad-60th.ir.json` at the caliber of
      `mockups/For the Old Man.html` with NO chat in the loop (conformance test).
- [ ] Cold round-trip: feed the chat the `_user_input` from that sample; it produces a
      *different concept* at the *same caliber*.
- [ ] Safeword returns a structured report.

## The ultimate stack (confirm in PLAN.md; flag any deviation)
- **Framework:** Next.js 15 App Router, deployed on **Netlify** (edge functions for the chat loop).
- **Brain:** **Anthropic Claude (Opus)** for the chat — tool use, streaming, **vision**, **web search**, **prompt caching** (cache the JUMPOFF + pantry). Behind the `LLM` port.
- **Auth:** Clerk. **Data:** Supabase Postgres (schema `peek_v2`) — IR as JSONB + a `*_versions` append table. **Storage:** Supabase bucket.
- **Money:** Stripe ($12 Checkout = publish). **Email:** Resend.
- **Card fulfillment = a CONFIGURABLE CASCADE** (behind `CardResolver`, see `ir/ports.ts` §2b/2c): tier 1 our **retailer APIs** (Browserbase/ZenRows/Amazon/etsy…) → tier 2 **URL or screenshot scrape** → tier 3 **Anthropic web search + vision** as last resort (reads result pages/screenshots + curator photos to satisfy "a cactus this tall under $X shipped here"). **The tier order is DATA — reorder / add / remove by config, never by editing core**, because this sequence WILL change as backends get stood up.
- **Imagery:** vendor-neutral behind the `ImageProvider` port (fal.ai is the first adapter; swappable).
- **Ops:** Upstash Redis (rate-limit/idempotency), Inngest (background jobs), Sentry, PostHog.
- **Gates:** Turnstile before the first guest LLM call; image moderation before public publish.
- **The rule:** core imports ONLY the ports, never a vendor SDK. Overbuild the contract; stub the implementations; add real adapters one at a time. This is the "ultimate, no-ceiling" part — expressed as seams, not volume. Do NOT add Kafka/K8s/microservices; that's the wrong overbuild.

## The rule for every decision
"If we 10×'d the backends and the design ambition tomorrow, does this still hold?"
Yes → ship. No → fix the seam, not the symptom. Do **not** build a mandatory
deterministic design engine — the model is the resolver.

## When you hit a design gap
Don't guess at taste. Note it in the safeword report / a `DESIGN_QUESTIONS.md` and the
design side will resolve it. Send the **actual IR + the input that produced it**, never a
paraphrase — the IR is the shared language.
