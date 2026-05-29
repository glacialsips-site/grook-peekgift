# Depth-Layer Chat — production-readiness research

**Scope.** Turn the proven `prototypes/build-actor-ux` technique (chat-overlay-over-live-DOM, visualViewport-sized shell, blur-suspend mitigation) into a phone-grade product surface. No-touch zone: `atelier/components/renderer/` + `atelier/lib/vibe/grammar/`. The depth layer **mounts** the renderer; never restyles it.

---

## 1. Gesture model — 5 gestures, no more

Mobile-2026 consensus: compound gestures + haptics are standard ([Muzli](https://muz.li/blog/whats-changing-in-mobile-app-design-ui-patterns-that-matter-in-2026/)), but every gesture needs a visible fallback or it fails accessibility ([WCAG 2.5.1](https://www.w3.org/WAI/WCAG21/Techniques/css/C39), [TestParty](https://testparty.ai/blog/mobile-accessibility-patterns)). Opinionated set, in priority order:

1. **Tap input → K. Tap stage or Return → L.** Shipped in spike. The discoverable affordance.
2. **Swipe down on scrim → L.** iOS bottom-sheet expectation since iOS 15 ([Apple HIG Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)). Threshold ~80px, velocity > 0.6 commits. Disable mid-stream so users don't lose their thread.
3. **Long-press card → context sheet** ("Why this pick?" / "Swap" / "Remove"). The only way to say "change *this thing*" without typing — the curator's most-wanted shortcut. iMessage/Telegram pattern; 500ms hold, haptic on activation. **Fallback**: `⋯` button on each card focus state.
4. **Pull down from top of stage (L state) → recap card.** Last 3 Peek changes + "undo last." Reuses the change-log we maintain for diff-marks. First-session peek-bounce for discovery.
5. **Two-finger drag UP from refine bar → K, pre-filled with section name under touch.** Power-user "edit this section" shortcut. Hidden by design; surface in v1.1 onboarding once usage data exists.

**Cut**: pinch-zoom (breaks renderer scale), edge-swipe back (steals iOS nav), 3D Touch (dead), shake-to-undo (novelty). Ship 1–3 in v1; add 4–5 once instrumented.

## 2. Haptic moments — small, deliberate, fallback-aware

iOS Safari ships **no** Vibration API support ([progressier.com](https://progressier.com/pwa-capabilities/vibration-api)). The 2025/26 workaround: `<input type="checkbox switch">` — click() a hidden labeled switch and iOS 17.4+ emits a haptic ([ios-haptics](https://github.com/tijnjh/ios-haptics)). Android Chrome supports `navigator.vibrate()` natively. Build a `haptic(intent)` helper, `intent ∈ {select, place, commit, warn}`. Spec the moments tight — overuse desensitizes:

| moment | intent | rationale |
|---|---|---|
| Card just placed (diff-mark fires) | `place` (medium tap) | The signature beat. Haptic + JUST PLACED chip = the magic moment. |
| Send button pressed | `select` (light tap) | Confirms input went; cheap. |
| Long-press card opens sheet | `select` | Affordance discovery feedback. |
| Vibe palette shift (recolor commit) | `commit` (double-tap pattern) | Whole-page mutation; deserves a different signal. |
| Publish-fee Checkout submit | `commit` | Last confirmation before $$. |
| Recipient hits "Pick this" | `place` | Recipient's version of the curator's moment. |

iOS pattern: one hidden `<label><input type="checkbox" switch></label>` at app root; `haptic()` toggles checked + clicks. Android: `navigator.vibrate([15])` for `select`, `[25]` for `place`, `[40,30,40]` for `commit`. Feature-detect; never throw on older Android WebView. Honor `prefers-reduced-motion` as a kill switch.

## 3. Diff-mark vocabulary — 4 states

Streaming-state indicators have converged across Cursor/Linear/Notion AI ([Mantlr](https://mantlr.com/blog/designing-for-ai-agents-ux-patterns-2026), [thefrontkit](https://thefrontkit.com/blogs/ai-chat-ui-best-practices)). Lock these:

| state | visual | location | duration |
|---|---|---|---|
| **THINKING** | typing-dots + soft scrim-header pulse ("Peek is thinking…") | chat / scrim header (K-down) | `message_start` → first tool call |
| **EDITING `<thing>`** | shimmer underline on section label; live tool count in scrim header ("editing the rail · 2/3") | per-section + header | tool_use → tool_result |
| **JUST PLACED / CHANGED** | spike's chip + ring + pill | per-card / per-section | 1.4s after tool_result; clears on next user msg or 8s |
| **NEEDS YOU** | yellow pill on bubble asking for clarification | chat only | until reply |

**Per layer**: per-card → only JUST PLACED chip+ring (anything more is noise). Per-section → EDITING shimmer + "updated by claude" pill (section is the natural grain of mutation). Scrim header → THINKING/EDITING aggregate; in L this becomes a thin "Peek is editing the rail…" strip above the refine bar — the only persistent indicator when keyboard's down. Tappable → opens chat. Bubble → NEEDS YOU + errors only.

**Anti-pattern**: streaming partial card content as tokens emit. Cards are atomic — stream *narration* in the bubble; commit the mutation when `tool_result` lands.

## 4. Compositing perf — physical-device verification

Emulation says GO. Physical retest must answer: **does iOS Safari hold 60fps with our exact mitigation, and does a Mali GPU survive?** Three instrumentation layers:

**a) rAF delta sampler** (already in spike; carry forward). p50/p95/worst + % janky frames over 18ms.

**b) Long Animation Frames API** — Chrome 123+ attributes long frames to scripts/style/layout/render ([Chrome dev](https://developer.chrome.com/docs/web-platform/long-animation-frames)):

```js
new PerformanceObserver(list => list.getEntries()
  .filter(e => e.duration > 50)
  .forEach(e => navigator.sendBeacon('/api/perf/loaf', JSON.stringify(e.toJSON()))))
  .observe({ type: 'long-animation-frame', buffered: true });
```

Wire to PostHog. Safari won't emit LoAF, falls back to (a).

**c) Per-mutation INP** — `event-timing` PerformanceObserver wrapping send-tap → first paint of diff-mark. The user-perceived latency we care about.

**6 physical tests** (real device, cellular + Wi-Fi):
1. iPhone 13 Safari (A15) — K↔L 10×, transition smoothness, `visualViewport.offsetTop` doesn't go negative.
2. iPhone 13 Safari + **iOS 26** — repro the offsetTop-doesn't-reset bug ([Apple Forum 800125](https://developer.apple.com/forums/thread/800125)); persistent 24px gap after dismiss. If repro'd, ship JS workaround (snapshot `innerHeight` pre-focus, subtract on blur).
3. iPhone SE 2nd-gen — small-screen + older GPU; scrim doesn't bleed under notch, input bar above home indicator.
4. Pixel 7a Chrome — Mali-G610 baseline; scenarios B (blur-over-scroll) and F (mitigated diff-mark) must hold 60fps.
5. $300 Samsung A-series Chrome — worst realistic device. If F dips below 50fps p50, ship "low-power mode" branch that drops scrim blur entirely (uses spike's `blur-suspended` styling permanently). Detect via `navigator.deviceMemory < 4 || navigator.hardwareConcurrency < 6`.
6. Android Chrome on cellular — verify `interactive-widget=resizes-content`; Chrome 108+ default is now `resizes-visual` — we MUST set it explicitly ([Chrome dev](https://developer.chrome.com/blog/viewport-resize-behavior)).

**Risk**: iOS 26's bug means the spike's visualViewport technique is now load-bearing on a *bug fix*, not just an API. If 26.1 ships the fix we're fine; otherwise test 2's workaround becomes a hard launch requirement.

## 5. "Page foreground" mode — making L feel published

Goal: keyboard-down, the page reads as a real published peek, indistinguishable from `/g/[slug]` rendered cold.

- **Refine bar = only chat affordance.** No FAB, no bubble, no badge. 56pt tall, "Ask Peek to refine…" + sparkle, scroll-pinned via flex. Scroll-up fades to 60% opacity but never disappears — fade-and-reappear patterns (Linear/Instagram) break iOS rubber-band scroll.
- **CSS scroll-snap on top-level sections.** `scroll-snap-type: y proximity` on the stage, `scroll-snap-align: start` on each `.sec`. Proximity not mandatory — mandatory fights tall rails ([css-tricks](https://css-tricks.com/practical-css-scroll-snapping/)). Renderer doesn't know; rules live in depth-layer wrapper.
- **No "still building" watermark.** That admission says *preview*. Live-editing energy comes via the scrim-header strip (§3), only when Peek is working. Idle = the page is the page.
- **"Preview as recipient" one-tap**: sub-2s cinematic cross-fade to zero-chrome (bar slides out, header hides), triggered from the long-press card menu. Frank's reveal moment, on tap.
- **Status bar tint matches `--vibe-bg`** via `<meta name="theme-color">` written from the validated vibe at mount. Free polish; massive perception win.

## 6. What we DON'T touch — boundary

The depth layer is a **shell** around `SlugRenderer`. Hard rules:

- **Never import from `atelier/lib/vibe/grammar/`.** Depth layer subscribes to mutations and re-renders; never derives palette, validates compositions, or picks archetypes.
- **Never restyle inside `atelier/components/renderer/`.** No `:global`, no `!important`, no parent-class overrides. Diff-mark chips/pills/rings attach as **siblings** to rendered nodes via a thin decoration layer keyed off `data-id` attrs the renderer already emits — the spike's pattern (`els.set(id, node)`).
- **Decoration source = commit's `changed: Set<id>`** that mutators return (spike §3). Renderer is keyed by id; we add/remove `.show-placed`/`.show-claude` on the decoration sibling. No DOM diffing, no MutationObserver. If a hook is needed, negotiate one `onDecorate(id)` prop with renderer owners — never reach in.
- **Wrapper styles use only `--vibe-*` vars the renderer publishes** for any Peek-themed surface color. Scrim blur intensity and diff-mark accent are wrapper-owned, not vibe-owned.
- **No grammar contributions.** No new section types, no new palette dials. Mutation surface = exactly `set_hero`/`add_card`/`set_section`/`set_vibe`/etc. — the curator-Sonnet's tool palette.

---

**Bottom line.** Spike's technique is the right spine. Production-readiness = ship the iOS 26 visualViewport workaround behind a flag, build `haptic(intent)` with iOS 17.4+ switch + Android vibrate branches, lock the 4-state diff-mark vocab with scrim-header aggregation, run the 6 physical-device tests before promotion, treat the renderer as a black box.
