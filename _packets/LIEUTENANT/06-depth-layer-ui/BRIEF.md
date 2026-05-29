# BRIEF 06 — Depth-layer mobile chat UI (production)

**Source of need:** the spine-thread proved the integration works but uses a basic `components/spine/spine-builder.tsx`. This is the production version of the **K↔L keyboard-driven depth-layered chat over live preview** — Frank's signature screen. It replaces the spine's basic builder.

**Read first (in order, must read):**
1. `_packets/SPINE/STACK-LOCK.md` — locked stack, the no-Tailwind rule, the renderer invariant.
2. `_packets/LIEUTENANT/_research/depth-layer-ux/REPORT.md` — the research sub's production-readiness verdict + gestures + haptics + diff-mark vocab + perf instrumentation + iOS 26 visualViewport bug warning.
3. `_packets/LIEUTENANT/01-spine-thread/RETURN.md` — what the spine-thread did + its integration pitfalls.
4. `atelier/app/spine/[peekId]/page.tsx` + `atelier/components/spine/spine-builder.tsx` — current basic implementation; you replace this.
5. `atelier/components/renderer/` — the renderer (sacred, do not fork; you mount it).

## DELIVERABLES

Produce a production-ready depth-layer chat surface that REPLACES `components/spine/spine-builder.tsx`. Lives at `atelier/components/build/depth-layer-builder.tsx` (or your preferred path under `components/build/`), wired into `atelier/app/spine/[peekId]/page.tsx` (the spine route stays; we promote to canonical `/build/` in a later cutover brief).

### Required features

1. **Two states driven by keyboard:**
   - K (keyboard up): chat foreground, translucent scrim w/ backdrop-blur, page ghosted underneath.
   - L (keyboard down): page foreground, chat collapsed to thin "Ask Peek to refine…" bar pinned to bottom.
   - Smooth transition (driven by `visualViewport` + `--kb` CSS var + `html[data-kbd]` boolean per research §1).
2. **Mobile-first sizing** — shell sized to `window.visualViewport`, NEVER `100vh`/`100dvh`. `interactive-widget=resizes-content` (Android). `font-size:16px` on inputs (kills iOS focus-zoom).
3. **Chat input row** (per research) — text + attach (`+`) + camera + voice (mic) — like Claude mobile. Real file picker for attach; real `MediaDevices.getUserMedia({ video: true })` for camera; voice can be stubbed (start with `<input type="file" accept="audio/*">` fallback if MediaRecorder is unstable).
4. **Live preview mount** — render the existing `<SlugRenderer>` (do not fork) driven by page-state from the spine's SSE chat. Renderer reads the validated `Vibe` and `--vibe-*` vars; depth-layer is a SHELL, no styling control over renderer internals.
5. **Diff-mark vocabulary** (per research §3 — 4 states):
   - THINKING (per-section shimmer + scrim header pill "Peek is thinking…")
   - EDITING (per-card animated ring + scrim header pill "Peek is editing")
   - JUST PLACED (per-card "JUST PLACED" chip, fades after 5s)
   - NEEDS YOU (chat bubble only, errors)
   - Aggregator pill in scrim header reflects highest state.
6. **Diff-mark perf rule (load-bearing):** SUSPEND the chat scrim backdrop-blur during the ~650ms diff-mark animation; restore after. Animating content under a live backdrop-blur tanks FPS (~30 from ~60). Captured in research §4 + spine-thread bake-off.
7. **Gestures (per research §1):**
   - tap-anywhere-on-overlay = skip/dismiss reveal (already in legacy cinematic-reveal).
   - swipe-down on scrim = dismiss chat (drops to L).
   - long-press on a card = context sheet (Apple HIG Sheets pattern) with `⋯` button fallback per WCAG 2.5.1.
   - pull-down on chat scrim = recap card showing peek summary.
   - Cut: pinch-zoom, edge-swipe back, shake-to-undo.
8. **Haptics** — implement `haptic(intent)` with `select | place | commit | warn`. iOS 17.4+ `<input type="checkbox switch">` haptic-hack path. `prefers-reduced-motion` kills haptics. Six specific moments per research §2.
9. **L-mode polish (per research §5):**
   - NO watermarks. NO floating action buttons.
   - Scroll-snap on sections with `proximity` (not mandatory) so feed feels natural.
   - `<meta name="theme-color">` matches `--vibe-bg`.
   - "Preview as recipient" one-tap zero-chrome mode (hides all chat/refine bar).
10. **Sibling-pattern for renderer decoration** — depth-layer reads `data-id` attributes on rendered cards/sections to attach diff-mark decorations as SIBLINGS, never imports from `lib/vibe/grammar/`. Renderer stays mount-agnostic.

### Hard rules

- **No Tailwind.** CSS Modules + `--vibe-*` vars only.
- **Renderer is sacred.** Do not modify `atelier/components/renderer/` or `atelier/lib/vibe/grammar/`. If you genuinely need a hook, propose ONE `onDecorate(id)` callback added by the orchestrator in a separate brief — don't bolt it on yourself.
- **Edge-runtime compatibility for any new API routes** — `lib/anthropic-edge` + `lib/db-edge` (BRIEF 03; coordinate; this brief may land before 03, in which case use the inline pattern the spine route already established).
- **iOS 26 visualViewport bug (research §4)** — the spike's load-bearing technique depends on Apple Forum thread 800125. Include the JS workaround as a hard requirement; if Apple ships the fix in 26.1, we keep the workaround anyway (no harm).
- **No images you don't have.** Renderer placeholders cover missing hero images (FAL key still pending per concierge). Don't fake images.
- **Branch:** `lt/depth-layer-ui` off `claude/bold-ride-Li5zK`. Push your branch. Do not merge.

### Perf acceptance (per research §4)

Implement these instrumentation hooks (rAF sampler + LoAF API + INP) so the orchestrator can verify:
- K mode static-blur over scrolling page: ≥60 FPS sustained.
- Diff-mark animation under suspended blur: ≥60 FPS, 0% jank frames.
- K↔L transition: ≤16ms per frame during transition, no content jump.
- INP <200ms on input.

Six physical-device tests in research §4. The lieutenant runs whichever it can in the sandbox + documents the rest for orchestrator/Frank to run.

## VERIFICATION (run + report real results)

- `npm --prefix atelier run typecheck` — 0 errors.
- `npm --prefix atelier run test` — all 212+ tests pass; add new tests for any non-trivial logic (visualViewport hook, diff-mark state machine, haptic dispatcher).
- `APP_URL=https://vnext.peek.gift npm --prefix atelier run build` — clean.
- A demo route or harness page (under `atelier/app/depth-layer-demo/` or similar) that renders the depth-layer with scripted state mutations for orchestrator/Frank to visually inspect.

## RETURN.md

Required sections: what you built; verification results (all 3 commands with exit codes); every integration pitfall (especially anything visualViewport / backdrop-blur / iOS 26-related); what you stubbed; the iOS 26 workaround approach; bright ideas. Be honest about untested-on-physical-device parts.

Per PROTOCOL.md: push `lt/depth-layer-ui`, write RETURN.md, tell Frank "done — `lt/depth-layer-ui` pushed, RETURN.md written." Orchestrator reviews + merges.
