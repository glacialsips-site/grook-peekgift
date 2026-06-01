// ============================================================================
// peek-render/styles.ts — the ONE injected stylesheet (per document, deduped)
// ----------------------------------------------------------------------------
// Holds: global keyframes, the reveal/markPlaced systems, the reduced-motion guard
// (global + per-ambient-loop kills, SHELL_SPEC §1.7), and the shell component classes
// whose STRUCTURE is constant and whose SKIN comes from --peek-* vars (SHELL_SPEC §1).
// Every selector is scoped under `.peek-root` so this never leaks into the host app.
// ============================================================================

const STYLE_ID = 'peek-render-styles';

export const PEEK_CSS = /* css */ `
/* ── reset within the root ── */
.peek-root, .peek-root * { box-sizing: border-box; }
.peek-root {
  position: absolute; inset: 0; overflow: hidden;
  background: var(--peek-bg); color: var(--peek-ink);
  font-family: var(--peek-font-body);
  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
  --peek-nav-h: 60px;
}
.peek-root img { max-width: 100%; display: block; }
.peek-root a { color: inherit; }
.peek-root button { font: inherit; cursor: pointer; }

/* ── internal scroll container (overlays are absolute to .peek-root, NOT here) ── */
.peek-scroll {
  position: absolute; inset: 0; overflow-y: auto; overflow-x: hidden;
  z-index: 1; -webkit-overflow-scrolling: touch; scroll-behavior: smooth;
}
.peek-scroll::-webkit-scrollbar { width: 0; height: 0; }
.peek-content { position: relative; z-index: 1; }

/* ── scene layer (z-0, behind content) ── */
.peek-scene { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }

/* ── top bar ── */
.peek-nav {
  position: sticky; top: 0; z-index: 40;
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 14px var(--peek-space-gutter);
  background: transparent; border-bottom: 1px solid transparent;
  transition: background .5s ease, border-color .5s ease, padding .5s ease, color .5s ease;
}
.peek-nav.peek-glass {
  background: color-mix(in srgb, var(--peek-bg) 88%, transparent);
  -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--peek-line);
}
.peek-nav.peek-nav-ondark { color: #fff; border-bottom-color: transparent; background: transparent; }
.peek-nav.peek-nav-solid {
  color: var(--peek-ink); padding-top: 10px; padding-bottom: 10px;
  background: color-mix(in srgb, var(--peek-bg) 90%, transparent);
  -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--peek-line);
}
.peek-wordmark {
  font-family: var(--peek-font-display); font-size: 16px; font-weight: 700;
  letter-spacing: .04em; text-transform: var(--peek-display-case); color: inherit;
}
.peek-wordmark b { color: var(--peek-accent); }

/* ── hamburger morph ── */
.peek-burger {
  width: 40px; height: 40px; border: none; background: transparent;
  display: grid; place-items: center; position: relative; color: inherit;
}
.peek-burger span, .peek-burger span::before, .peek-burger span::after {
  content: ''; position: absolute; width: 22px; height: 2px; border-radius: 2px;
  background: currentColor; transition: transform .3s ease, background .2s ease, top .3s ease;
}
.peek-burger span { position: relative; }
.peek-burger span::before { top: -7px; left: 0; }
.peek-burger span::after { top: 7px; left: 0; }
.peek-root.peek-menu-open .peek-burger span { background: transparent; }
.peek-root.peek-menu-open .peek-burger span::before { top: 0; transform: rotate(45deg); }
.peek-root.peek-menu-open .peek-burger span::after { top: 0; transform: rotate(-45deg); }

/* ── scroll progress ── */
.peek-progress {
  position: absolute; top: 0; left: 0; height: 2px; width: 0; z-index: 90;
  background: linear-gradient(90deg, var(--peek-accent), var(--peek-accent-2));
  transition: width .1s linear; pointer-events: none;
}

/* ── menu scrim + panel ── */
.peek-scrim {
  position: absolute; inset: 0; z-index: 95;
  background: color-mix(in srgb, var(--peek-ink) 55%, transparent);
  -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
  opacity: 0; visibility: hidden; transition: opacity .4s, visibility .4s;
}
.peek-root.peek-menu-open .peek-scrim { opacity: 1; visibility: visible; }
.peek-menu {
  position: absolute; top: 0; right: 0; bottom: 0; z-index: 96;
  width: min(85vw, 360px); background: var(--peek-surface);
  border-left: 1px solid var(--peek-line);
  transform: translateX(100%); transition: transform .45s var(--peek-ease-panel);
  display: flex; flex-direction: column;
  padding: calc(54px + var(--peek-safe-t)) 26px calc(28px + var(--peek-safe-b));
  box-shadow: -30px 0 80px rgba(0,0,0,.35); overflow-y: auto;
}
.peek-root.peek-menu-open .peek-menu { transform: none; }
.peek-menu-head {
  font-family: var(--peek-font-display); font-size: 15px; letter-spacing: .14em;
  text-transform: uppercase; color: var(--peek-muted); margin-bottom: 24px;
}
.peek-mlink {
  display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
  font-family: var(--peek-font-display); font-size: 28px;
  letter-spacing: var(--peek-display-tracking); text-transform: var(--peek-display-case);
  color: var(--peek-ink); text-decoration: none; padding: 13px 0;
  border-bottom: 1px solid var(--peek-line);
  opacity: 0; transform: translateX(15px);
  transition: opacity .45s var(--peek-ease-panel), transform .45s var(--peek-ease-panel);
}
.peek-mlink .peek-ix {
  font-family: var(--peek-font-accent); font-size: 13px; color: var(--peek-accent);
  opacity: .8; letter-spacing: .08em;
}
.peek-root.peek-menu-open .peek-mlink { opacity: 1; transform: none; }
.peek-menu-foot { margin-top: auto; padding-top: 22px; }
.peek-menu-foot .peek-eyebrow { margin-bottom: 6px; }
.peek-menu-foot .peek-when {
  font-family: var(--peek-font-body); font-size: 13px; color: var(--peek-muted); line-height: 1.5;
}

/* ── sticky action bar (the money bar) ── */
.peek-bar {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 85;
  display: flex; align-items: center; gap: 14px;
  padding: 12px var(--peek-space-gutter) calc(14px + var(--peek-safe-b));
  background: color-mix(in srgb, var(--peek-surface) 92%, transparent);
  -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
  border-top: 1px solid var(--peek-line);
  transform: translateY(150%); transition: transform .45s var(--peek-ease-panel);
}
.peek-bar.peek-show { transform: none; }
.peek-bar-meta { flex: 1; min-width: 0; }
.peek-bar-meta .peek-k {
  font-family: var(--peek-font-body); font-size: 10px; letter-spacing: .14em;
  text-transform: uppercase; color: var(--peek-muted);
}
.peek-bar-meta .peek-v {
  font-family: var(--peek-font-display); font-size: 18px; color: var(--peek-ink);
  text-transform: var(--peek-display-case); letter-spacing: var(--peek-display-tracking);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ── shared button ── */
.peek-btn {
  font-family: var(--peek-font-body); font-weight: 600; font-size: 14px;
  border: none; border-radius: var(--peek-radius-pill);
  padding: 13px 20px; background: var(--peek-accent); color: var(--peek-btn-ink);
  box-shadow: var(--peek-glow); white-space: nowrap;
  transition: transform .15s ease, opacity .2s ease, filter .2s ease;
}
.peek-btn:active { transform: translateY(1px); }
.peek-btn:disabled { opacity: .8; cursor: default; }
.peek-btn-ghost {
  background: transparent; color: var(--peek-ink); border: 1px solid var(--peek-line);
  box-shadow: none;
}

/* ── bottom sheet ── */
.peek-sheet-scrim {
  position: absolute; inset: 0; z-index: 97;
  background: color-mix(in srgb, var(--peek-ink) 60%, transparent);
  opacity: 0; visibility: hidden; transition: opacity .38s, visibility .38s;
}
.peek-root.peek-sheet-open .peek-sheet-scrim { opacity: 1; visibility: visible; }
.peek-sheet {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 98;
  background: var(--peek-surface);
  border-radius: var(--peek-radius-lg) var(--peek-radius-lg) 0 0;
  transform: translateY(101%); transition: transform .48s var(--peek-ease-sheet);
  padding: 10px var(--peek-space-gutter) calc(30px + var(--peek-safe-b));
  max-height: 90%; overflow-y: auto; box-shadow: 0 -30px 80px rgba(0,0,0,.4);
}
.peek-root.peek-sheet-open .peek-sheet { transform: none; }
.peek-grab {
  width: 46px; height: 5px; border-radius: 999px; background: var(--peek-line);
  margin: 6px auto 18px;
}
.peek-sheet-chip {
  display: inline-block; font-family: var(--peek-font-accent); font-size: 10px;
  letter-spacing: .1em; text-transform: uppercase; color: var(--peek-accent);
  background: var(--peek-accent-soft); padding: 3px 9px; border-radius: var(--peek-radius-pill);
}
.peek-sheet-name {
  font-family: var(--peek-font-display); font-size: 26px; color: var(--peek-ink);
  line-height: 1.08; letter-spacing: var(--peek-display-tracking);
  text-transform: var(--peek-display-case); margin: 12px 0 0;
}
.peek-sheet-desc { font-family: var(--peek-font-body); font-size: 14px; line-height: 1.55; color: var(--peek-muted); margin-top: 8px; }
.peek-sheet-price { font-family: var(--peek-font-display); font-size: 22px; color: var(--peek-accent); margin-top: 12px; }
.peek-sheet-cta { display: flex; gap: 12px; margin-top: 22px; }
.peek-sheet-cta .peek-btn { flex: 1; padding: 14px; }
.peek-swatches { display: flex; gap: 10px; margin-top: 16px; }
.peek-swatch { width: 26px; height: 26px; border-radius: 999px; border: 1px solid var(--peek-line); cursor: pointer; }
.peek-swatch.peek-sel { box-shadow: 0 0 0 2px var(--peek-surface), 0 0 0 4px var(--peek-accent); }

/* ── eyebrows / section heads (shared chrome) ── */
.peek-eyebrow {
  font-family: var(--peek-font-body); font-size: 11px; font-weight: 700;
  letter-spacing: var(--peek-eyebrow-tracking); text-transform: uppercase;
  color: var(--peek-accent);
}
.peek-sec { padding: var(--peek-space-section-y) var(--peek-space-gutter); position: relative; }
.peek-sec.peek-band {
  background: var(--peek-surface);
  border-top: 1px solid var(--peek-line); border-bottom: 1px solid var(--peek-line);
}
.peek-sechead { margin-bottom: 18px; }
.peek-sechead.peek-split { display: flex; align-items: baseline; justify-content: space-between; gap: 14px; }
.peek-sechead h2 {
  margin: 6px 0 0; font-family: var(--peek-font-display); font-size: 26px; font-weight: 700;
  color: var(--peek-ink); letter-spacing: var(--peek-display-tracking);
  text-transform: var(--peek-display-case); line-height: 1.05;
}
.peek-sechead .peek-meta-note { font-family: var(--peek-font-body); font-size: 12px; letter-spacing: .1em; color: var(--peek-muted); white-space: nowrap; }
.peek-dek { font-family: var(--peek-font-body); font-size: 15px; line-height: 1.55; color: var(--peek-muted); }

/* ── reveal system (SHELL_SPEC §1.5) ── */
.peek-reveal {
  opacity: 0; transform: translateY(26px);
  transition: opacity .85s var(--peek-ease-reveal), transform .85s var(--peek-ease-reveal);
}
.peek-reveal.peek-in { opacity: 1; transform: none; }

/* ── hero load cascade (SHELL_SPEC §1.5B) ── */
.peek-anim { opacity: 0; transform: translateY(30px); animation: peek-rise 1.1s var(--peek-ease-reveal) forwards; }
@keyframes peek-rise { to { opacity: 1; transform: none; } }

/* ── markPlaced highlight (SHELL_SPEC §0) ── */
.peek-placed { animation: peek-placed-pulse 1.6s ease-out 3 alternate; position: relative; z-index: 2; }
@keyframes peek-placed-pulse {
  from { box-shadow: 0 0 0 3px var(--peek-accent); }
  to { box-shadow: 0 0 0 6px color-mix(in srgb, var(--peek-accent) 40%, transparent); }
}
.peek-newbadge {
  position: absolute; top: 8px; right: 8px; z-index: 3;
  font-family: var(--peek-font-accent); font-size: 9px; font-weight: 700; letter-spacing: .12em;
  text-transform: uppercase; color: var(--peek-btn-ink); background: var(--peek-accent);
  padding: 3px 7px; border-radius: var(--peek-radius-pill);
}

/* ── keyframes for scenes/frames/motifs ── */
@keyframes peek-spin { to { transform: rotate(360deg); } }
@keyframes peek-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
@keyframes peek-drift { 0% { transform: translate(0,0); } 50% { transform: translate(12px,-8px); } 100% { transform: translate(0,0); } }
@keyframes peek-tw { 0%,100% { opacity:.3; } 50% { opacity:1; } }
@keyframes peek-floor { to { background-position: 0 50px; } }
@keyframes peek-conf { to { transform: translateY(125%) rotate(540deg); opacity:.15; } }
@keyframes peek-bub { to { transform: translateY(-120%); opacity:0; } }
@keyframes peek-ken { from { transform: scale(1.06); } to { transform: scale(1.2); } }
@keyframes peek-marq { to { transform: translateX(-50%); } }
@keyframes peek-sway { 0%,100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }

/* ── card grid (giftgrid / rail) shared face ── */
.peek-card {
  background: var(--peek-surface); border: 1px solid var(--peek-line);
  border-radius: var(--peek-radius-card); overflow: hidden; cursor: pointer;
  position: relative; transition: transform .2s ease, box-shadow .2s ease;
  display: flex; flex-direction: column;
}
.peek-card:hover { transform: translateY(-4px); }
.peek-card.peek-claimed { opacity: .6; }
.peek-card-badge {
  position: absolute; top: 8px; right: 8px; z-index: 2;
  font-family: var(--peek-font-accent); font-size: 9px; font-weight: 700; letter-spacing: .08em;
  text-transform: uppercase; color: var(--peek-btn-ink); background: var(--peek-accent);
  padding: 3px 8px; border-radius: var(--peek-radius-pill);
  opacity: 0; transform: scale(.8); transition: opacity .25s, transform .25s;
}
.peek-card.peek-claimed .peek-card-badge { opacity: 1; transform: none; }
.peek-card-src {
  position: absolute; top: 8px; left: 8px; z-index: 2;
  font-family: var(--peek-font-body); font-size: 9px; font-weight: 600; letter-spacing: .04em;
  text-transform: uppercase; padding: 3px 8px; border-radius: var(--peek-radius-pill);
  background: color-mix(in srgb, var(--peek-bg) 78%, transparent); color: var(--peek-ink);
  -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
}
.peek-card-body { padding: 12px 13px; display: flex; flex-direction: column; gap: 6px; }
.peek-card-title { font-family: var(--peek-font-display); font-size: 15px; color: var(--peek-ink); line-height: 1.18; text-transform: var(--peek-display-case); }
.peek-card-foot { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.peek-card-sub { font-family: var(--peek-font-body); font-size: 12px; color: var(--peek-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.peek-card-price { font-family: var(--peek-font-display); font-size: 14px; color: var(--peek-accent); white-space: nowrap; }
.peek-card-locked .peek-media { filter: blur(6px) saturate(.6); }
.peek-lock-badge {
  position: absolute; inset: 0; z-index: 3; display: grid; place-items: center;
  color: var(--peek-ink); font-family: var(--peek-font-accent); font-size: 11px; letter-spacing: .1em;
}

/* taunt card */
.peek-card-taunt { cursor: default; border-style: dashed; }
.peek-card-taunt .peek-card-title { color: var(--peek-muted); text-decoration: line-through; }

/* ── REDUCED MOTION: global guard + explicit ambient kills (SHELL_SPEC §1.7) ── */
@media (prefers-reduced-motion: reduce) {
  .peek-root *, .peek-root *::before, .peek-root *::after {
    animation-duration: .001ms !important; animation-iteration-count: 1 !important;
    transition-duration: .12s !important;
  }
  .peek-scroll { scroll-behavior: auto; }
  .peek-reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
  .peek-anim { opacity: 1 !important; transform: none !important; animation: none !important; }
  /* kill ambient loops that would otherwise freeze at a random frame */
  .peek-amb { animation: none !important; }
}
`;

/** Inject the stylesheet once per document. */
export function ensureStyles(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const s = doc.createElement('style');
  s.id = STYLE_ID;
  s.textContent = PEEK_CSS;
  doc.head.appendChild(s);
}
