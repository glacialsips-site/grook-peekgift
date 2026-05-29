# BRIEF 10 — Landing page (production)

**Source of need:** vNext's landing is a Tailwind scaffold (raze). The research sub specced a chat-as-hero conversion-focused landing that uses the grammar as proof. This brief builds it.

**Read first (must):**
1. `_packets/LIEUTENANT/_research/landing/REPORT.md` — three hero concepts (Concept A wins), proof element (live peek wall), section sequence, CTA path (guest mode all the way to publish-paywall), mobile-first considerations, anti-patterns.
2. `_packets/SPINE/STACK-LOCK.md` — plain CSS custom properties + CSS Modules only.
3. `atelier/components/renderer/` — the renderer to embed for the peek wall.
4. `atelier/scripts/proof-out/{princess,bachelor,luxe}.html` — three SSR vibes to seed hero cycle.
5. `atelier/lib/vibe/grammar/fixtures.ts` (+ `presets.ts` if BRIEF 07 has landed) — vibe seeds.

## DELIVERABLES

### 1. The landing page

Replace `atelier/app/page.tsx` + everything under `atelier/components/landing/*` (Tailwind, raze) with the new implementation per research §3:

1. **Hero** — Concept A (chat-as-hero). Phone-frame, fake chat textarea with pulsing cursor + rotating placeholder ("My niece Lila's 7th… my best friend's bachelorette… my dad's 70th…"). Behind textarea, a half-visible peek page renders progressively; vibe cycles every 6–8s (princess → bachelor → luxe; expand to more once BRIEF 07 lands). Sub-headline: "Tell us who it's for. We'll build the site together in chat." CTA: "Start the page" (Enter on textarea submits + routes into the real `/spine` build).
   - Idle-state animation: after 4s of no interaction, textarea morphs into a 6-second silent reveal vignette (Concept B layered on A), then back. (See research §1.)
2. **Peek wall** — 6–9 mini-peeks rendered via the actual `<SlugRenderer>` in real `--vibe-*` themes. Horizontally-scrolling marquee on mobile (with scroll-snap), 3-up grid on desktop. Each tappable → opens full-screen read-only preview of that peek. Tagline above: "No two peeks look the same. The page paints itself around the human."
3. **3-step strip** — "Chat → publish → they pick." Three icon-free vertical cards, one sentence each.
4. **Recipient moment** — silent autoplay-muted loop of the cinematic reveal (use the reveal layer from BRIEF 09 if landed; otherwise a hand-cut snippet). Copy: "What they see when they tap the link." Plays once on scroll-into-view, then loops on tap.
5. **Price line, alone** — "$12 to publish and send. Free to build and undo." A whole vertical-rhythm section for one line.
6. **CTA repeat** — second prompt textarea identical to hero.
7. **Tiny footer** — legal, contact, "made by humans in NJ." No newsletter, no social links.

### 2. The CTA path

Per research §4: guest mode all the way to publish-paywall.
- Click "Start the page" → POST `/api/spine/page` (or whatever the spine's draft-creation endpoint is — check the spine route; reuse if exists) with the seeded prompt as the first chat message.
- Redirect to `/spine/<peekId>` (or canonical `/build/<peekId>` once cutover lands).
- The seeded prompt becomes Peek's first input → Peek immediately mutates (per the curator-Sonnet's mutate-first principle).
- NO interstitial occasion picker — Peek extracts occasion + recipient_kind from turn 1 via `set_recipient`.
- Mint anon-session cookie in middleware (`atelier/proxy.ts`) if not present.

### 3. Analytics events (PostHog)

Wire per research §4:
- `landing.prompt_seeded` (anonymized seed text)
- `landing.cta_clicked` (which CTA — hero vs repeat)
- `build.guest_started` (when /spine creates the peek row)

### 4. Mobile-first

- Above-fold on 390×844: headline (2 lines max), 1-line sub, chat textarea (~88px), CTA underneath (44px+ tap target).
- Cut on mobile: soft pulse glows (replace with single solid wash), secondary buttons.
- Scale: headline 38–44px clamp, full-width textarea (16px+ font for iOS no-zoom), full-width CTA.
- Reflow: peek wall = horizontal swipe marquee on mobile w/ scroll-snap, 3-up grid ≥768px.
- `100dvh` not `100vh` (STACK-LOCK rule).

### 5. The vibe-engine flex

Per research §7: cycle vibe in hero idle-state background peek; render peek wall in real vibes. **Do NOT** shift landing's own chrome (header, footer, body type) between vibes — keep landing's frame neutral.

Risk: 0.5s repaint flash if vibe cycle hits during initial paint. Mitigate by inlining the first vibe (princess) in SSR.

## HARD RULES

- **NO Tailwind anywhere in this landing.** CSS Modules + `--vibe-*` tokens + a landing-specific neutral token contract for the frame.
- **Renderer is sacred.** Mount it; don't fork it. The peek wall uses `<SlugRenderer>`.
- **No anti-patterns** (research §8): no "trusted by" logos, no testimonials, no FAQ accordion, no "watch demo" modal, no newsletter capture, no scroll-arrow chevron, no founder-story video, no fake user counter.
- **Branch:** `lt/landing` off `claude/bold-ride-Li5zK`. Push.

## VERIFICATION

- `npm --prefix atelier run typecheck` — 0 errors.
- `npm --prefix atelier run test` — pass.
- `npm --prefix atelier run build` — clean; landing prerenders.
- Smoke-test: open `/`; verify hero textarea works, vibe cycles, peek wall scrolls on mobile, CTA flow creates a peek.

## RETURN.md

Sections: what you built; section-by-section file list; mobile vs desktop reflow notes; analytics events wired; any rough edges in the vibe-cycling animation or peek-wall renders; bright ideas (e.g. when the meter ships, the price-line section can react to throttle state); a Frank-facing screenshot of the hero (or a dev-mode URL he can hit). Honesty section.

Per PROTOCOL.md: push `lt/landing`, write RETURN.md.
