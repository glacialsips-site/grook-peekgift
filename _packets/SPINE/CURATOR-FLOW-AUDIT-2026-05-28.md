# CURATOR-FLOW-AUDIT 2026-05-28

End-to-end Playwright drive of the LIVE `https://vnext.peek.gift/` build flow. Both 375x812 (mobile) and 1280x800 (desktop) viewports, headless Chromium. Screenshots in `atelier/tests/e2e/screenshots/curator-flow-2026-05-28/`. Spec: `atelier/tests/e2e/curator-flow-audit.spec.ts`.

## TL;DR

Got as far as ~3 sent chat turns + 1 image upload before the flow stopped producing meaningful Peek replies. Two parallel blockers swallow the experience:

- **Anon meter wall fires at $0.05/24h** (desktop path). After the first turn that triggers tools, the agent route returns `"Error: You've used $0.15 of compute in the last 24h (limit $0.05). Publish a peek to unlock more, or come back tomorrow."` for every subsequent turn. The number is unreachably low; the cap effectively gives anons 1.0 productive turn.
- **Mobile anon path corrupts the tool-loop on turn 2** with a raw Anthropic 400 (`tool_use ids were found without tool_result`) dumped verbatim into the chat bubble. Then bounces the user back to /sign-up mid-session.

The `/g/[slug]` recipient view is still 500ing with digest `3668081153` exactly as `HANDOFF-NEXT-FRAME.md` documented. Cinematic reveal never renders.

Branch: `worktree-agent-a063dbf71270103fd`.

## Flow step-by-step

### Step 1 — Land on `/`

- Files: `desktop-01-landing.png`, `mobile-01-landing.png`
- 🟢 works. Marketing page is polished, communicates the pitch ("Gift giving, made real."), has three example peek mock-ups in the mid-section showing distinct vibes (princess pink, mid-30s burgundy, 70-yo cream), explains "Not a wishlist. Not a card." Final CTA "Try it free. Pay $12 when you publish."

### Step 2 — Click "Make one"

- Files: `desktop-02-signup-wall.png`, `mobile-02-signup-wall.png`
- 🔴 **THE LANDING CTA SKIPS THE ENTIRE ANON ONBOARDING.** Both viewports land on `/sign-up?returnTo=/build`. The landing page actually links to `/sign-up?returnTo=/build`, not `/build`. BRAIN-DUMP / the marketing copy itself promises "Anon users can hit chat for ~1-2 turns before being nudged to sign up" — that funnel is unreachable from the landing CTA. Sign-up wall is also visually flat: just "peek.gift / Make gift giving real again. / Make it real / Create an account to start your first peek." No personality, no Peek voice, no copy that says "Try the chat first."

### Step 3 — Force into `/build` directly

- Files: `desktop-03-build-loaded.png`, `mobile-03-build-loaded.png`
- 🟡 works but the landing CTA is bypassed entirely. After explicit `page.goto('/build')` the server creates an anon peek + redirects to `/build/<id>`. Desktop shows a SAMPLE PEEK ("Sophie / 6th birthday" with balloons hero + child silhouette) in the preview pane on first load, alongside a Peek welcome card "We'll go back and forth. Tell me who it's for and I'll start building — you can drop links, screenshots, or just describe." Mobile shows the same welcome card plus a collapsed "Live preview" sheet at bottom with "SAMPLE PEEK - SOPHIE" pill. Two issues: (a) the sample is misleading — a fresh user might think their peek already has content; (b) the placeholder text in the input is sometimes "tell me who it is for" and sometimes "drop their name or a photo of them" — inconsistent voice.

### Step 4 — Send first message about Mom Cathy / Mother's Day

- Files: `desktop-04-after-first-message.png`, `mobile-04-after-first-message.png`
- 🟡 user message renders cleanly, "Thinking..." spinner appears on send button. BUT the preview pane still shows the SAMPLE Sophie peek — the agent hasn't yet called `set_recipient` so user input has zero visible effect on the right side. Live preview promise unmet for the first 5-15s.

### Step 5 — Send second message with more recipient detail

- Files: `desktop-05-after-second-message.png`, `mobile-05-after-second-message.png`
- DESKTOP 🔴 — Peek replied to message 1 with a thoughtful turn ("Warm linen tones, unhurried layout, all serif — the page already feels like her. What's one specific thing about Cathy that only you would know to put on a gift page — a ritual, a place she loves, something she always says?") + fired 4 tool calls (Peek memory, Peek setting recipient, Peek setting recipient profile, Peek setting vibe). Preview updated to "Cathy / Mother's Day" with a warm cream/linen palette. THEN the second user message returned: `"Error: You've used $0.15 of compute in the last 24h (limit $0.05). Publish a peek to unlock more, or come back tomorrow."` So the anon meter trips after exactly one productive turn. The $0.05/day cap is functionally useless — one Sonnet turn with tool use easily costs $0.15.
- MOBILE 🔴 — On turn 2, the agent returned a raw Anthropic API 400 error dumped verbatim into the chat bubble: `Error: 400 {"type":"error","error":{"type":"invalid_request_error","message":"tool_use ids were found without tool_result blocks immediately after: toolu_013QH2Bhsheqb..., toolu_0145f7gAjhqbv9zfNSEHhAku, toolu_018v8HUM97PgpvtqgKMDh8J5, toolu_01NMBYo6744zyvAfQJakhwtz. Each ... must have a corresponding tool_result block in the same message."},"request_id":"req_011CbUHL2..."}`. This means the chat history serialized to the API has tool_use blocks without paired tool_result blocks — a known anthropic SDK conversation-state bug. The error is dumped raw into the UI with no humanization, no recovery, no "let me try again."

### Step 6 — Upload a stock image

- Files: `desktop-06-after-image-upload.png`, `mobile-06-after-image-upload.png`
- 🟡 works: tiny PNG attached, "Attached image" preview chip visible above the input. BUT the next agent turn still returns the meter wall (desktop) or the 400 error (mobile), so the upload never reaches a `set_hero_image` tool call. The user sees their image in chat but it never appears in the preview pane.

### Step 7 — "Make the hero feel cozy and warm"

- Files: `desktop-07-after-hero-warmth-request.png`, `mobile-07-after-hero-warmth-request.png`
- 🔴 desktop: meter-wall reply repeated. Mobile: 400 repeated. No vibe updates, no hero image, no tool calls. The preview pane stays frozen on "Cathy / Mother's Day" with empty hero and "No cards yet — keep chatting" placeholder.

### Step 8 — Add a real-product card (gold heart locket)

- Files: `desktop-08-after-card-request.png`, `mobile-08-after-card-request.png`
- 🔴 same. The metered/errored state persists for every subsequent message.

### Step 9 — Add a gag card

- Files: `desktop-09-after-gag-card.png`, `mobile-09-after-gag-card.png`
- 🔴 same.

### Step 10 — Add an activity card

- Files: `desktop-10-after-activity-card.png`, `mobile-10-after-activity-card.png`
- 🔴 desktop: same meter wall. Mobile: WORSE — user has been bounced back to `/sign-up`. The anon turn counter (or token claim) flipped to "must sign up to continue." So the flow doesn't just degrade — it actively kicks the user out of their own draft.

### Step 11/12 — Final state + wall snapshot

- Files: `desktop-11-final-build-state.png`, `desktop-12-auth-or-meter-wall.png`, `desktop-13-preview-isolated.png`, `mobile-11-final-build-state.png`, `mobile-12-auth-or-meter-wall.png`, `mobile-13-preview-isolated.png`
- 🔴 Desktop: preview pane shows the recipient name + occasion + the warm vibe palette but ZERO cards, ZERO hero image. Six user messages, four tool calls, one productive turn. Chat scrollback is half user-input bubbles, half identical-meter-wall errors. Mobile: user is on the sign-up page.

### Recipient view at `/g/31ee6438df38`

- Files: `desktop-r01-pre-reveal-status-500.png`, `desktop-r02-mid-reveal.png`, `desktop-r03-post-reveal.png`, `mobile-r01-pre-reveal-status-500.png`, `mobile-r02-mid-reveal.png`, `mobile-r03-post-reveal.png`
- 🔴 500 server error, all three phases identical. UI is the generic Peek error boundary: "We couldn't open this Peek. The link works, but something hiccuped while loading it. Try again in a moment. [Try again] [Go home]   ref: 3668081153" — the digest matches `HANDOFF-NEXT-FRAME.md` line 61 ("`recipient_segment_error`"). Cinematic reveal cannot be exercised. Note: I sampled a draft slug because `SELECT slug FROM peek_v2.peeks WHERE status IN ('published','claimed')` returned ZERO rows — there are no published or claimed peeks in the DB at all. So even when `/g/[slug]` is fixed, there's a separate gap: nobody has actually completed the flow end-to-end through publish.

## Gap to north star

BRAIN-DUMP's vision is "any moron from Instagram can build a shockingly good custom website in 5 minutes." The current flow does not get close. Concretely:

### Where it stumbles vs the north star

1. **The first 30 seconds break the promise of personalization.** The marketing page is gorgeous and the chat welcome is well-written — but the preview pane is pre-populated with a SAMPLE peek (Sophie). Users land in someone else's draft. The instant the user types "It's for my mom Cathy," the right side should change. It does, eventually, but only after 5-10s and a tool call. The "real-time builds the site behind/beside the chat" promise from BRAIN-DUMP is not realized — there's an empty interstitial where the user's input has no visible effect.

2. **The anon trial is invisible.** Landing page CTA goes straight to `/sign-up`. The "1-2 free turns" from BRAIN-DUMP exists in code (you can reach it via `/build` directly, as anon onboarding does mint a session cookie) but nothing on the landing page actually invites the user to try it. A "moron from Instagram" never finds it.

3. **The $0.05/24h anon meter is a hostile firewall.** One Sonnet turn with 4 tool calls costs ~$0.10-0.20. The cap therefore allows exactly one productive turn before showing the user a meter wall styled like an error. This is the opposite of "let users feel the magic before sign-up." If retention costs anything, the meter should be at $1/day per anon session — still cheap, ~5-10 productive turns, enough to feel the product.

4. **The chat error states are raw API garbage.** Mobile dumped `{"type":"error","error":{"type":"invalid_request_error","message":"tool_use ids were found without tool_result"...}` into the chat bubble. No human ever wrote that text. This is the single highest-impact polish miss — the chat agent IS the product per BRAIN-DUMP, and the chat is showing developer-language failure modes to recipients.

5. **The preview pane is bland once content lands.** The "Cathy / Mother's Day" state has a warm cream palette but feels SaaS-template: a single Playfair-display name, an italic occasion, two stacked empty rounded-rectangle placeholders. Sophie sample shows what good looks like (balloons hero + child silhouette + "six whole years! princess for the day"). The contrast says: when Peek successfully fires its tools, the page looks magazine-like; when it fails (current default state), it looks like a Stripe dashboard waiting for inputs.

6. **No `set_hero_image` from upload.** The user uploaded an image, it attached to the message, but the agent never set it as the hero before erroring out. So the hero stays empty. Per BRAIN-DUMP this should fire automatically when an image is attached and the agent thinks "this is a hero candidate." A clear tool-routing decision tree is missing.

7. **Mobile pushes the user out of their session.** Half-built draft, user has invested 5+ chat turns, app silently bounces to /sign-up. This is the worst outcome for an "Instagram moron": they think they did something wrong.

8. **Cinematic reveal can't be seen at all** because of the 500. The single most important screen in the entire product (the gift moment) is dark.

### Where the flow feels friction-heavy

- Six messages, four tool calls, one productive turn. Tool call ratio is fine but throughput is broken by the meter.
- Sample peek on first load primes the user to think they need to delete/replace content, not start fresh.
- The "Add image" affordance is a separate button below the input; "drop a product link" is a separate placeholder. Three input modalities (text / link / image) compete for one input slot. A single drag-anywhere drop zone with a single contextual placeholder ("type, drop a link, or drop a photo") would simplify.

### Where it looks like a SaaS template

- Sign-up wall is generic Clerk-styled. Per the prod-parallel policy this is intentional (Clerk live keys), but per BRAIN-DUMP "Clerk forms reskinned with no Clerk branding visible" was the directive — they're not reskinned yet. "Create an account to start your first peek" reads like Linear or Vercel onboarding, not Peek.
- The error boundary on `/g/[slug]` ("We couldn't open this Peek. The link works, but something hiccuped...") is well-written but visually default. A magazine-cover-style fallback would feel more on-brand.
- Empty hero / "No cards yet — keep chatting" placeholder feels like an empty Notion page.

## Top 5 fixes (impact-per-effort)

1. **Raise the anon compute cap to $0.50-$1.00/24h. (~5 min)** The current $0.05 floor cripples the entire trial. One env var bump or code constant. Highest-leverage single change in the audit.

2. **Humanize the chat error envelope. (~30 min)** Wrap any non-200 in `app/api/chat/route.ts` so the chat bubble shows Peek-voice text (`"Yo, the network burped on that one. Try again?"` or `"Hit a limit — sign up real quick and we'll keep going."`) instead of raw API JSON. This single fix turns the worst-feeling moment (mobile turn 2) into a recoverable speed bump.

3. **Fix the `/g/[slug]` 500 (digest 3668081153). (~1-2 hr)** Already at top of `HANDOFF-NEXT-FRAME.md`. Cinematic reveal is the gift moment — until this lands the product literally cannot deliver its core value.

4. **Strip the Sophie sample on first chat load. (~15 min)** Render the welcome card on the left, but the preview pane should be a curiosity-state placeholder ("Your peek lives here — start typing →") instead of someone else's gift. Removes the most confusing UX moment.

5. **Land "Try the chat first" CTA on `/` that hits `/build` not `/sign-up`. (~10 min)** The anon path exists; the landing page needs to advertise it. Add a secondary CTA under "Make one" — "Try it first (no signup)" → `/build`. Same word-of-mouth flywheel the marketing page promises is currently invisible.

## Notes / errata

- I did NOT trigger a Netlify deploy. All testing against the existing live site.
- I did not commit code comments to the spec file per the brief.
- Spec runs both viewports against `https://vnext.peek.gift` with `ignoreHTTPSErrors: true` (sandbox CA is missing).
- Screenshots dir: `atelier/tests/e2e/screenshots/curator-flow-2026-05-28/` (37 files).
- Spec file: `atelier/tests/e2e/curator-flow-audit.spec.ts`.
- DB query: zero peeks with status in ('published', 'claimed'). Six drafts with cards; richest is `31ee6438df38` (Dorothy, 50th birthday, 10 cards) — used as the recipient-view target.
