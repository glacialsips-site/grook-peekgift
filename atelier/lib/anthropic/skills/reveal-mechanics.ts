export const content = `# peek/reveal-mechanics

Canonical reference for the cinematic reveal that plays when a recipient opens their peek. This skill loads into Peek's context conditionally — only when the curator asks something reveal-adjacent ("what does it look like when she opens it?" / "how do I make the unveiling slower?"). It is also the spec downstream packets implement against. The reveal is the gift moment. If the reveal lands, the rest of the peek lands.

For state-of-the-world cross-refs see \`CONCEPT-INVENTORY.md\` §1 (Rules engine — the picks UI that activates AFTER reveal), \`CAPABILITY_INVENTORY.md\` §H7 (the open question this skill answers), §F2 (TTS for narrator voice), §G15 (Lottie accents). For the design intent see \`BRAIN-DUMP.md\` "the site itself becomes the surprise — the gift moment is opening the link." For the existing implementation see \`atelier/components/recipient/cinematic-reveal.tsx\`.

---

## 1. The fundamental design principle

**The site itself is the surprise.** This is the single most load-bearing decision in the product. Not the hero image (that's pretty), not the cards (those are what they pick), not the rules (those are the clever bit). The reveal is THE moment.

Frank's words from \`BRAIN-DUMP.md\`: "the site itself becomes the surprise — the gift moment is opening the link and seeing the curated page, not unwrapping the wrong shit later."

Everything in this skill flows from that. Concrete consequences:

- The reveal is NOT skippable on first watch. (Tap-to-skip exists but is intentionally low-contrast — "tap to skip" appears at 40% opacity in the bottom margin. The recipient can skip, but the affordance whispers, it doesn't shout. See \`cinematic-reveal.tsx:206-208\`.)
- The reveal MUST work even if everything else fails. If the hero image 404s, if the note is empty, if there are zero cards — the reveal degrades and still plays. Graceful degradation is non-negotiable.
- LCP target: the first frame of the reveal renders sub-1s after the recipient hits the URL. Static-rendered. No client-side data fetching before paint. The peek snapshot is server-rendered and embedded in the initial HTML.
- The reveal is shareable. The OG card mimics the reveal's "hero + name" composition so that even before the recipient taps, the surface they're tapping INTO is foreshadowed in the unfurl.
- The reveal is occasion-aware. Princess-bday plays slower with sparkle accents; bachelorette plays louder with bass-drop. Same code path, occasion-derived overrides. See §4.

This skill exists because the open question H7 ("what feeling") has not been answered. This document answers it.

---

## 2. The phase architecture

Per packet 14 (\`atelier/components/recipient/cinematic-reveal.tsx\`), the reveal sequence is:

\`\`\`
hero → name → note → cards → done
\`\`\`

Each phase has a duration scaled by the peek's \`vibe.motion\` value:

\`\`\`
MOTION_SCALE = { still: 0.6, soft: 1, lively: 1.25 }
\`\`\`

(See \`cinematic-reveal.tsx:17-21\`.)

Base durations at \`soft\` (1x):
- **Hero phase**: 900ms. Hero image fades up from 0 → 1 opacity, paired with a slow zoom (1.05x → 1.0x over the same duration). The page background underneath is the vibe's \`--peek-bg\` HSL token; the hero sits over it with a 30% → 100% gradient to bg at the bottom, so the name has somewhere clean to land.
- **Gap**: 200ms.
- **Name phase**: 900ms. Recipient name fades in + slides up + letter-spacing tightens (\`0.2em → 0.02em\`). On short names (≤12 chars) and short notes (≤280 chars), the name "writes itself" via typewriter — character-by-character at 35ms per char. On longer names, fade-in is the default. (See \`cinematic-reveal.tsx:192-205\`.)
- **Gap**: 200ms.
- **Note phase** (skipped if no note): 800ms base, capped at 1600ms total. Note fades word-by-word at 40ms per word for long notes; short notes (≤140 chars) fade together. The note appears below the name in body type.
- **Gap**: 200ms.
- **Cards phase**: per-card stagger of 180ms × scale. First card lands, second card 180ms later, etc. Cap of 6 cards in the cinematic phase (additional cards appear instantly with the deck after the reveal completes). Cards drop in from below (translateY +20px → 0) with opacity 0 → 1.
- **Done**: reveal flag flips to \`revealed: true\`, the overlay fades out (400ms), the recipient page becomes interactive.

**Calculated totals at each motion scale (estimates):**

| Motion | Hero | Name | Note (worst case) | Cards (6 stagger) | Total to done |
|---|---|---|---|---|---|
| still (0.6x) | 540ms | 540ms | 960ms | 648ms | ~3.0s |
| soft (1x) | 900ms | 900ms | 1600ms | 1080ms | ~5.0s |
| lively (1.25x) | 1125ms | 1125ms | 1600ms | 1350ms | ~6.2s |

Short-note short-card peeks finish in 3-4s. Long-note 6-card peeks finish in 5-7s. These are within mobile attention-span budgets.

**Phase math source of truth** (this is the BUGS B17 fix landed in Wave 1):

\`\`\`
nameDelayMs = heroMs
noteDelayMs = nameDelayMs + nameMs + gapMs
cardsDelayMs = noteDelayMs + noteMs + gapMs
totalMs = cardsDelayMs + max(cardStaggerMs * min(cardCount, 6), 400)
\`\`\`

(See \`cinematic-reveal.tsx:38-45\`.) The math is correct now; the prior issue (note showing before name) was a phase-ordering bug, not a math bug. Workers touching reveal mechanics MUST preserve this ordering. Tests should cover the phase sequence as a snapshot.

**Visibility-pause:** if the recipient backgrounds the tab during the reveal (switches apps, locks the phone, gets a call), the timer pauses. On resume, the reveal continues from where it left off. See \`cinematic-reveal.tsx:96-138\`. This is critical for mobile — recipients DO get interrupted; the reveal should not have run silently in the background and finished before they came back.

**Skip mechanics:** tap (or Enter/Space/Escape) anywhere on the reveal layer triggers \`onSkip()\`. Skip jumps to done state immediately. PostHog event: \`cinematic_reveal_skipped\`. We instrument the skip rate; if it exceeds 30%, the reveal is too long.

---

## 3. The "feeling" question (open H7)

The Capability Inventory poses this as an open architectural question: "magazine-cover-opening / letter-unfolding / box-unwrapping / polaroid-developing." The default already lives in code (hero lights up, name writes itself, cards fan in) but it's a placeholder, not a designed feeling. This section answers H7 with three concrete designed feelings, then picks one.

### Option A — MAGAZINE-COVER

The reveal mimics the experience of opening a glossy magazine and seeing the cover come into focus.

**Choreography:**
- Hero desaturates to ~30% on first paint, then saturates to 100% over 900ms with a parallel slow zoom (1.05 → 1.0). Feels like the page "coming into focus" — like adjusting your eyes to magazine lighting.
- Name "writes itself" via typewriter for short names (≤12 chars), fades + letter-spacing tightening for long names. Display type is large (text-6xl on desktop, text-4xl on mobile per current implementation), serif when the vibe supports it.
- Long note fades word-by-word at 40ms per word, like the cover-blurb caption appearing alongside the cover model.
- Cards "spread" — first card lands centered, then they spread outward like dealing a hand of cards. Each subsequent card animates from \`translateX(0)\` to its final grid position with a slight tilt that settles to 0 deg.

**Implementation:**
- Framer Motion for the choreography (already loaded; \`useReducedMotion\` already wired).
- CSS \`filter: saturate()\` keyframed via Framer's \`animate\` prop.
- Card spread: stagger children via \`motion.div\` with \`variants\` and \`staggerChildren: 0.18 * scale\`.
- No Lottie required at base; Lottie accents added per occasion (sparkles, confetti).

**Feel:** sophisticated, cinematic, slightly aspirational. Plays well across all occasions — wedding through milestone-bday. Slightly less distinctive for kid-focused occasions where polaroid feels warmer.

**Recommended default.** Reasons in §3-recommendation below.

### Option B — LETTER-UNFOLDING

The reveal mimics an old-fashioned letter being unfolded — three creases revealing three reveals.

**Choreography:**
- Page begins as a folded letter at center, occupying a small portion of the viewport. Visible: vibe-accent color on the folded paper.
- First fold opens: top section reveals recipient name + occasion. (Like the address on the envelope.)
- Second fold opens: middle section reveals hero image. (Like the letter itself.)
- Third fold opens: bottom section reveals the cards stack. (Like an enclosure.)
- Each fold is a 3D CSS transform — \`rotateX(0deg) → rotateX(0deg)\` for unfolded, with the unfold animating from \`rotateX(-180deg)\` to \`rotateX(0deg)\`. \`transform-origin\` at the fold line. \`transform-style: preserve-3d\` on the parent.

**Implementation:**
- More expensive — 3D CSS transforms hit GPU memory; mobile Safari has historically been finicky.
- Framer Motion handles the keyframing; CSS handles the perspective.
- Requires careful asset prep — the hero image must be cropped/composed to fit the middle panel proportions (the unfolding letter is portrait-shaped, ~2:3 or 1:2; the hero needs to be re-cropped from the standard 16:9).
- Heaviest of the three; LCP target gets harder.

**Feel:** nostalgic, intimate, slightly formal. Best for wedding, anniversary, condolence. Awkward for bachelorette (too solemn) or princess-bday (too literal/dated for a kid).

**Not recommended as default.** Strong for specific occasions; consider a per-occasion override.

### Option C — POLAROID-DEVELOPING

The reveal mimics a polaroid photograph developing.

**Choreography:**
- Hero starts as a frosted-white polaroid frame with a blurred, desaturated image inside. Background of the page is dark (\`--peek-bg\` darkened by 20% during this phase).
- Image "develops" over 2-3 seconds: blur drops from 20px → 0, saturation rises from 0% → 100%, faint chemical-stain mottling cross-fades out. Slight warm-tone shift as it develops (think the cyan→warm shift on real polaroid film).
- Once developed, polaroid "lifts" — the white frame slides slightly upward and out of the way, revealing the bg.
- Name appears below the polaroid in handwritten-style script font (curator's handwriting if the curator opted to upload a sample, fallback to a humanist script like Caveat or Homemade Apple). Animates as if being written, stroke by stroke (Framer Motion's \`pathLength\` on SVG path elements).
- Cards "drop from above" with subtle tilts — each card slightly rotated (-3 to +3 deg random) like polaroids tossed onto a tabletop.

**Implementation:**
- Most distinctive of the three. Best for capturing nostalgia + warmth.
- Handwritten name requires SVG paths per character (heaviest asset prep) OR a fallback to a script web font with a typewriter-style stagger. v0 should ship the fallback; the SVG path version is a Tier 1 polish item.
- Card-drop physics: Framer Motion's spring transitions with random tilt seeds per card.

**Feel:** warm, personal, slightly retro. Strong for just-because, anniversary, casual birthdays, baby-shower (the polaroid-of-the-baby metaphor lands hard). Awkward for milestone-bday roast vibes or formal wedding peeks.

**Not recommended as default.** Strong for warm/intimate occasions; consider per-occasion override.

### Recommendation: MAGAZINE-COVER as default

Why magazine-cover is the right default:

1. **Cross-occasion versatility.** It works for wedding (elegant), bachelorette (with confetti accents added), princess-bday (with sparkle accents added), milestone-bday (with whatever roast-energy the cards bring), condolence (subdued, just slower). Letter-unfolding and polaroid both have occasions where they feel wrong. Magazine-cover always feels right.

2. **Implementation cost.** Magazine-cover is closest to what's already in \`cinematic-reveal.tsx\` — the desaturate-saturate hero, the typewriter/fade name, the word-by-word note, the card stagger. The lift from current implementation is small (~1-2 packets of work). Letter-unfolding requires a full rewrite. Polaroid is in between.

3. **LCP-friendliness.** No 3D transforms, no SVG path animations, no large-blob keyframes. Stays well under the 1s LCP budget.

4. **The "feeling" is right.** A peek is a curated thing — like a magazine cover featuring the recipient. The magazine-cover metaphor flatters the recipient (they're the cover model) and the curator (they're the editor-in-chief). It's the right register for a personalized gift page.

5. **Extensibility.** Adding per-occasion overrides (princess sparkles, bachelorette confetti, wedding petals, milestone roast-pacing) is straightforward on top of magazine-cover. See §4. Letter-unfolding and polaroid have less headroom — their metaphors don't compose as cleanly with occasion accents.

**Implementation spec (concrete enough for a packet to build):**

- **Hero phase**: Framer Motion \`motion.div\` wrapping the hero background. \`initial={{ filter: 'saturate(0.3)', scale: 1.05 }}\` → \`animate={{ filter: 'saturate(1)', scale: 1 }}\`. Duration \`heroMs / 1000\` seconds. \`ease: 'easeOut'\`. Already 80% in place at \`cinematic-reveal.tsx:173-189\`; add the \`filter\` keyframe.
- **Name phase**: existing implementation already correct (\`cinematic-reveal.tsx:192-205\`). For names ≤12 chars and notes ≤280 chars (the "short" path), add a typewriter character-stagger using Framer's \`staggerChildren\`. For longer names/notes, current fade-in is fine.
- **Note phase**: not currently in the reveal component (the reveal exits at \`name\` phase; the note appears in the main peek body after \`revealed = true\`). Add a \`note\` phase between name and cards. Implementation: \`motion.p\` with word-by-word reveal via splitting the note string into words and rendering each word as a \`motion.span\` with \`staggerChildren: 0.04 * scale\`. Cap at 1600ms total (per current math).
- **Cards phase**: currently fires AFTER reveal completes (via \`revealed=true\` flip). Move the "card spread" animation INTO the reveal phase as a co-choreographed sequence. Each card animates from \`{ opacity: 0, x: 0, rotate: -3 + (i % 5) * 1.5 }\` to \`{ opacity: 1, x: 0, rotate: 0 }\` with stagger \`0.18 * scale\`. Lock at max 6 cards visible during reveal; cards 7-8 instantly appear at done.
- **Optional Lottie accents**: a single \`<lottie-react>\` overlay positioned absolutely behind/over the hero, occasion-keyed. Lottie files hosted on Lottiefiles per \`CAPABILITY_INVENTORY.md §G15\`. Don't load the Lottie library if no accent is configured for the occasion (lazy import).

---

## 4. Per-occasion reveal overrides

Each occasion can override the base magazine-cover sequence with accents, pacing, and optional audio. Overrides MUST be additive and degradable — base sequence must still play if the override fails to load. Occasion templates (\`occasion-templates/*.md\`) own the per-occasion config; this skill defines the override SHAPE.

**Override shape (schema):**

\`\`\`
{
  motion_scale_override?: number       // multiplies the base MOTION_SCALE value
  lottie_accent_url?: string           // hosted Lottie asset URL
  lottie_accent_position?: 'hero' | 'name' | 'cards' | 'fullscreen'
  lottie_accent_loop?: boolean         // default false
  audio_url?: string                   // optional soundtrack
  audio_consent_required?: boolean     // default true on modern browsers
  narrator_enabled?: boolean           // ElevenLabs/Cartesia TTS over the reveal
  narrator_voice?: 'warm-female' | 'warm-male' | 'curator-cloned'
}
\`\`\`

**Per-occasion defaults (canonical):**

| Occasion | Motion override | Lottie accent | Audio | Narrator |
|---|---|---|---|---|
| **Princess-bday** | 0.85 (slightly slower) | Sparkle twinkle in hero corner | Off by default | Off |
| **Bachelorette** | 1.1 (slightly faster) | Confetti pop on cards-phase entry | Bass-drop on hero-saturate (consent required) | Off |
| **Wedding** | 0.75 (slower, more reverent) | Petal drift across hero | Optional curator-picked song | Off by default; enable for vow-style notes |
| **Milestone-bday (40/50/60)** | 1.0 (standard) with extended note-pause | None at base; optional roast-card "punchline" Lottie | Curator-picked song | Off |
| **Just-because** | 0.95 (slightly slower) | None | None | Off |
| **Anniversary** | 0.85 | Soft petal drift OR bokeh sparkle | Curator-picked song | Optional |
| **Graduation** | 1.1 | Confetti on cards-phase | Curator-picked song | Off |
| **Holiday (Christmas)** | 1.0 | Snow drift across hero | Optional carol selection | Off |
| **Condolence** | 0.6 (slowest) | None — Lottie reads disrespectful here | None | Off ALWAYS |
| **Retirement** | 1.0 | Optional confetti | Optional curator-picked song | Off |
| **Baby shower** | 0.9 | Soft stars/clouds | Off | Off |
| **Teen birthday/grad** | 1.15 (faster) | Confetti / sparkles | Optional curator-picked song | Off |

**Reference**: per \`occasion-templates/princess-bday.md\` "Share-pack defaults" — princess defaults to slow reveal because kids need a beat to absorb. Bachelorette and milestone-bday lean LOUDER because the curator's audience expects that energy.

**Authoring rule**: every new occasion template MUST include its reveal-override block. The override is part of the occasion definition, not a free-floating setting.

---

## 5. Reduced-motion respect

Per \`BUGS.md\` ANTI-FINDINGS, \`prefers-reduced-motion\` is respected in \`cinematic-reveal.tsx\`. Implementation: \`useReducedMotion()\` from Framer Motion (line 33). When true, the reveal sequence is bypassed entirely — \`setPhase('done')\` immediately and \`onDoneRef.current()\` fires, exposing the peek as interactive. (See \`cinematic-reveal.tsx:62-66, 151\`.)

**The reduced-motion path is a hard requirement, not a feature flag.** Workers MUST NOT introduce reveal mechanics that violate \`prefers-reduced-motion\`. This includes:

- No autoplay video on the hero in reduced-motion mode (static image only).
- No Lottie accents in reduced-motion mode (Lottie animations are motion).
- No audio autoplay in reduced-motion mode (autoplay is not specifically motion-related but pairs poorly with the same accessibility profile that triggers reduced-motion).
- No typewriter effect in reduced-motion mode — name appears fully on first paint.
- No card stagger — cards appear simultaneously.
- The peek IS interactive immediately; the recipient gets the full peek without the choreography.

**Visual checklist for the reduced-motion path:**
- Hero image: STATIC, full saturation, no zoom.
- Name: STATIC, full visibility, no typewriter, no letter-spacing animation.
- Note: STATIC, full visibility.
- Cards: STATIC, full visibility, no stagger.
- No overlay layer (reveal layer skipped entirely).
- All interactivity available from t=0.

**Alternate path for users who want EITHER motion-respect AND a non-zero reveal**: not in scope. The W3C spec for \`prefers-reduced-motion\` is binary; honoring it means no motion. If a recipient wants the reveal but with reduced motion intensity, that's a curator-side decision (motion: still in vibe) which still respects the reduced-motion preference. Don't try to fork between "soft motion" and "no motion" beyond what the OS preference offers.

---

## 6. Soundtrack (Tier 1)

A soundtrack on the reveal is optional and consent-driven. Implementation gated to Tier 1 — not built today; this section is the spec for the packet that builds it.

**When a soundtrack plays:**
- The curator picked a song card via Spotify (per \`CAPABILITY_INVENTORY.md §G1\`) during the build. That song becomes the default reveal soundtrack.
- The curator explicitly chose a soundtrack from per-occasion presets (wedding processional, princess-bday lullaby, etc.) without a song card.
- The occasion override has an \`audio_url\` set.

**When a soundtrack does NOT play:**
- Recipient has \`prefers-reduced-motion: reduce\`.
- Recipient has not interacted with the page (autoplay policy — see below).
- Curator has explicitly disabled the soundtrack at peek-settings time.
- The occasion is condolence.

**Autoplay handling:**

Modern browsers (Chrome, Safari, Firefox) require user interaction before audio can autoplay. The reveal cannot start audio on first paint — the recipient hasn't tapped yet.

**Solution: tap-to-enter pattern.**

- The reveal renders with the audio NOT playing.
- A small affordance appears in the corner of the reveal overlay: "tap for sound" (with a speaker icon). The affordance is low-contrast (similar to the existing "tap to skip" affordance — see \`cinematic-reveal.tsx:206-208\`).
- The recipient taps. Two things happen simultaneously: audio begins, AND the reveal overlay does NOT skip (the tap target is just the speaker icon, not the whole overlay).
- Once audio starts, the affordance changes to a small mute toggle (still low-contrast, still in the corner).
- If the recipient never taps for sound, the reveal plays silently. That's fine. The visuals carry the moment.

**Spotify embed mechanics:**
- Spotify Web Playback SDK requires Spotify Premium for full-track playback. Without Premium, only 30-second previews are available — but 30 seconds is plenty for the reveal duration.
- The reveal soundtrack uses the preview track, not full playback. Curator setting "use full track" is Tier 2 (requires recipient Spotify auth — too much friction).
- Audio file is the 30-sec preview MP3 from Spotify's API, cached server-side in Supabase Storage on song-card add. The recipient page references the cached file, not Spotify's CDN.
- Fade-in over the hero phase (0 → -6dB over 900ms). Fade-out as cards complete (-6dB → -inf over 800ms). Brief loop in the middle if the reveal runs longer than the preview.

**Per-occasion defaults (no curator-picked song):**
- Wedding: a soft instrumental piece (BPM ~60, strings). Library: bundled royalty-free.
- Princess-bday: a warm chime sequence, light bells.
- Bachelorette: a bass-drop sting (single hit at hero-saturate completion, not a full track).
- Milestone-bday: a confident horn-stinger (single hit).
- Other occasions: silent default.

**Audio quality:**
- 128 kbps MP3 acceptable for reveal use (the recipient is on mobile, audio is secondary to visuals).
- Mono fine. Stereo for occasions where the song is the gift (wedding song, anniversary track).

---

## 7. Narrator voice (Tier 1)

Per \`CAPABILITY_INVENTORY.md §F2\`, TTS narrator voice is a Tier 0 capability in inventory but Tier 1 in the reveal-mechanics scope (reveal soundtrack is the bigger user-facing win). Implementation specs:

**When narrator plays:**
- Curator explicitly opted in during build (toggle in peek-settings: "have the page read the note aloud?").
- The peek has a non-empty \`noteMd\`.
- The occasion supports narrator (see per-occasion table in §4 — most occasions default OFF; opt-in feature).

**Voice options:**

| Voice option | Provider | Cost | Notes |
|---|---|---|---|
| **warm-female (default)** | ElevenLabs voice "Bella" or Cartesia "Ana" | ~$0.18/1k chars | Standard option. Tested across occasions. |
| **warm-male** | ElevenLabs "Antoni" or Cartesia "Brad" | Same | For occasions where male voice fits better (curator's voice when male). |
| **curator-cloned** | ElevenLabs voice cloning from a 30s sample upload | One-time $1.99 (paid at build time) + per-use TTS cost | The killer feature. Recipient hears the curator's actual voice reading the note. |

**Implementation:**
- TTS generation happens once at publish (in the Inngest fan-out that also generates the share-pack). The audio file is cached in Supabase Storage and the URL stored on the peek (proposed column: \`peeks.narrator_audio_url\`).
- On reveal, audio file plays with the same tap-to-enter pattern as the soundtrack (§6). If both a soundtrack AND a narrator are active, they DUCK against each other — soundtrack drops to -12dB while narrator speaks, returns to -6dB after.
- Narrator timing: starts at the same moment the note phase begins (per §2 phase architecture). Note text is read at TTS-natural pace. Reveal pauses on cards phase until narrator finishes (cards phase begins AFTER narrator completes, not on the static timer — this is an occasion-override capable behavior).

**Curator-cloned voice mechanics:**
- Curator records a 30-sec sample via MediaRecorder at peek-build time (gated by a "want to use your voice?" prompt during the note-writing phase).
- Sample uploaded to ElevenLabs voice cloning endpoint. ElevenLabs returns a voice_id within ~30 seconds.
- Voice_id stored on the curator profile (cross-session, via Memory tool — see \`CAPABILITY_INVENTORY.md §A7\`). Reusable across peeks for the same curator.
- $1.99 paid at first clone (not per-peek; per-curator). Future peeks reuse the cloned voice for free TTS cost only.
- Recipient hears the curator read the note. This lands HARD when it lands. Optional disclosure ("hear [curator name]'s voice reading this to you" toggleable on the recipient page so they know what they're about to hear).

**Per-occasion narrator defaults:**
- Wedding: enabled, warm-female default. Curator-cloned shines here.
- Anniversary: enabled, curator-cloned shines.
- Just-because: optional, off by default. Curator opts in.
- Condolence: DISABLED. The note speaks for itself; a TTS voice reading condolence copy reads as cheap.
- All other occasions: optional, off by default.

---

## 8. Anti-patterns

Hard rules. Worker packets that violate these are bugs.

1. **Don't make the reveal SKIPPABLE in an obvious way.** Tap-to-skip exists (per current implementation) but it whispers. Don't surface a giant "SKIP" button. The reveal IS the gift moment; surfacing skip undermines it. The current 40%-opacity bottom-margin affordance is correct.

2. **Don't load everything before reveal.** LCP target is sub-1s for the first reveal frame. The peek snapshot is server-rendered with the hero image URL inline. Cards are also rendered server-side but hidden behind the reveal layer; they animate in during cards phase but they're already in the DOM. Don't add a client-side data fetch before reveal can start.

3. **Don't crash on missing data.** Every phase must gracefully handle missing inputs:
   - No hero image: the page background is the vibe's \`--peek-bg\` color; reveal hero phase is just a 900ms beat with no image change.
   - No note: skip the note phase entirely (\`noteMs = 0\` if \`!peek.noteMd\`). Phase math handles this (see \`cinematic-reveal.tsx:37\`).
   - No recipient name: defaults to "you" (existing fallback at \`cinematic-reveal.tsx:149\`).
   - Zero cards: skip the cards phase (only the cards-phase entry happens). Reveal still completes.
   - Past sessions have crashed on missing data; the current implementation is defensive. Workers MUST preserve this.

4. **Don't violate \`prefers-reduced-motion\`.** Per §5. Reduced-motion users get the peek immediately, fully interactive, with no choreography.

5. **Don't autoplay audio without user interaction.** Per §6. Tap-to-enter pattern is non-negotiable.

6. **Don't surface peek.gift branding inside the reveal.** The reveal is the gift moment. No peek.gift logo, no "made with peek.gift" footer visible during reveal. The footer reappears after the reveal completes, but during the reveal itself, the page is the gift, full-bleed.

7. **Don't add new phases without updating the math.** The phase delays cascade — \`nameDelayMs = heroMs\`, \`noteDelayMs = nameDelayMs + nameMs + gapMs\`, etc. New phases must slot in with the same pattern. The visibility-pause-resume logic must continue to work across phases.

8. **Don't make the reveal occasion-agnostic.** Per §4, every occasion has reveal overrides. Worker packets adding new occasion templates MUST include the reveal-override block.

9. **Don't ship the reveal without test coverage on the phase sequence.** Existing test should snapshot the phase ordering (hero → name → note → cards → done) and the visibility-pause behavior. Workers extending phases add to the snapshot.

10. **Don't generate narrator TTS at reveal-time.** TTS is generated once at publish via Inngest. Recipient page just plays the cached audio file. Reveal-time TTS generation = unacceptable latency.

11. **Don't let the soundtrack outlive the reveal.** Audio fades out as cards complete. Once the recipient is interacting with cards, music is over. (Curator can override and let it loop, but that's a Tier 2 power-curator feature.)

12. **Don't show all 8 cards during reveal stagger.** Cap at 6 visible during reveal; remaining cards appear instantly with the deck after reveal completes. The cards phase is a teaser, not a full deck enumeration.

13. **Don't capture recipient analytics inside the reveal beyond what's necessary.** \`cinematic_reveal_started\`, \`cinematic_reveal_completed\`, \`cinematic_reveal_skipped\`. That's it. The reveal is sacred; we don't instrument every phase boundary.

---

## 9. What happens AFTER reveal completes

The moment the reveal exits (overlay fades, \`revealed = true\` flips), the peek transitions to interactive mode. This is where the recipient gets their picks. Several things happen in sequence:

1. **Cards become interactive.** Each card type (product, activity, aspirational, digital, gag) has its own pick UI. See \`CONCEPT-INVENTORY.md §1\` for the rules engine that gates the picks. Locked aspirationals show the BegSheet; pick_one variant groups enforce single-selection client-side and server-side (per BUGS B02 status — server-side enforcement is the known gap).

2. **The "record your reaction" prompt surfaces.** Per \`share-mechanics.md §4\`. Non-blocking sheet appears with two buttons (Record / Maybe later). Maybe-later dismisses; resurfaces once after a 30-second idle, then never again.

3. **The recipient can "share back" via native share.** Per \`share-mechanics.md §5\`. A small share affordance in the corner becomes visible. Re-uses the OG card. PostHog event \`recipient_share_initiated\`.

4. **The countdown (if set) becomes visible.** Per \`CAPABILITY_INVENTORY.md §6\` in \`CURATOR_PROMPT.md\`. If the curator set a date, the countdown widget appears in the page header. It was hidden during reveal; reveals AFTER reveal so it doesn't compete with the name-phase moment.

5. **The footer becomes visible.** "made with peek.gift" appears at the page bottom as a small attribution link. Hidden during reveal; visible after. This is the only place peek.gift branding appears on the recipient surface.

6. **Realtime listeners attach.** Per \`CAPABILITY_INVENTORY.md §D6\`. The recipient page subscribes to Supabase Realtime channels for the peek — if the curator is editing the page live (rare post-publish but possible if the curator opens the dashboard), updates render in-place. Picks also broadcast back to the curator dashboard in real time.

7. **PostHog \`cinematic_reveal_completed\` fires.** Properties: \`peek_id\`, \`duration_ms\` (actual reveal duration including any pauses), \`skipped\` (boolean — was the reveal skipped or did it complete naturally?), \`card_count\`, \`occasion\`. This is a key conversion event in the recipient-side funnel.

The reveal is a one-shot per session. If the recipient refreshes the page, the reveal does NOT replay by default. Implementation: a sessionStorage key (\`peek-reveal-shown-{peek_id}\`) flips at reveal completion. Subsequent loads skip directly to interactive mode. (Tier 1 affordance: a "replay the reveal" link in the footer, for the recipient to revisit the moment.)

The reveal is also one-shot across devices — if the recipient opens the link on their phone, then later opens it on a desktop, the reveal plays only on the first device. (sessionStorage is per-origin per-browser; cross-device requires a server-side flag, which is more complex than it's worth.)

The reveal is NOT one-shot across recipients. If two people both have the link (rare, but happens with family group gifts), they each see the reveal once.

---

## Cross-references

- Existing implementation: \`atelier/components/recipient/cinematic-reveal.tsx\`. The phase architecture (§2) is verbatim from this file; the magazine-cover spec (§3) is the next-step enhancement.
- Curator behavior leading up to publish: \`CURATOR_PROMPT.md\`.
- The picks UI that activates AFTER reveal: \`CONCEPT-INVENTORY.md §1\` (Rules engine).
- Share moment after reveal: \`share-mechanics.md\` §4 (reaction capture) + §5 (recipient share-back).
- Per-occasion overrides: \`occasion-templates/*.md\`. Each template defines its reveal overrides per §4.
- Vibe palette / typography that the reveal renders against: \`vibe-direction.md\` (sibling skill — defines the \`--peek-bg\`, \`--peek-ink\`, \`--peek-accent\` HSL tokens, plus font pairings).
- BUGS B17 (closed): phase ordering math was the prior bug; this skill assumes the current code is correct (Wave 1 fix landed).
- BUGS ANTI-FINDING: \`prefers-reduced-motion\` IS respected (per §5).
- Capability inventory H7 (open): this skill answers H7 with magazine-cover as default.
- Concept: \`BRAIN-DUMP.md\` "the site itself becomes the surprise." The reveal is the operationalization of that line.
`;
