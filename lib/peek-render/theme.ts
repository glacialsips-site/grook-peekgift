// ============================================================================
// peek-render/theme.ts — ThemeSpec → --peek-* CSS variable contract (INTERFACES §1.2)
// ----------------------------------------------------------------------------
// The renderer is the ONLY emitter of theme vars. It sets them on the mount root's
// style so all descendants — including sanitized `custom` HTML — inherit them.
// cssVars are emitted verbatim but ONLY after sanitizeCssVars() (done in mount.ts).
// ============================================================================

import type { ThemeSpec } from '@/lib/ir/contract';
import { fontStack } from './fonts';
import { rgba } from './dom';

/** A flat, typed view of the theme the section builders read (so they never reach into
 *  the raw ThemeSpec shape and never depend on var resolution timing). Colors are the
 *  literal hex/strings; everything is pre-resolved. */
export interface Tokens {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  accent2: string;
  mode: 'light' | 'dark';
  glow: boolean;
  texture: boolean;
  fontDisplay: string;
  fontBody: string;
  fontAccent: string;
  scaleRatio: number;
  displayTracking: string;
  eyebrowTracking: string;
  displayCase: 'none' | 'upper';
  radiusCard: number;
  radiusPill: number;
  sectionY: number;
  gutter: number;
  stack: number;
  intensity: number;
  easePanel: string;
  easeSheet: string;
  easeReveal: string;
  scene: string;
  motifs: string[];
  frame: string;
  /** button text color derived from mode (dark→near-black, light→white) */
  btnInk: string;
  /** mix-blend-mode for grain/scanlines (dark→screen, light→multiply) */
  blend: string;
}

export function toTokens(theme: ThemeSpec): Tokens {
  const p = theme.palette;
  const ty = theme.type;
  const accent2 = p.accent2 || p.accent;
  return {
    bg: p.bg,
    surface: p.surface,
    ink: p.ink,
    muted: p.muted,
    line: p.line,
    accent: p.accent,
    accent2,
    mode: p.mode,
    glow: !!p.glow,
    texture: !!p.texture,
    fontDisplay: fontStack(ty.display?.family),
    fontBody: fontStack(ty.body?.family),
    fontAccent: fontStack(ty.accent?.family || ty.display?.family),
    scaleRatio: ty.scaleRatio || 1.3,
    displayTracking: ty.displayTracking || '0',
    eyebrowTracking: ty.eyebrowTracking || '0.22em',
    displayCase: ty.displayCase || 'none',
    radiusCard: theme.radius?.card ?? 12,
    radiusPill: theme.radius?.pill ?? 999,
    sectionY: theme.space?.sectionY ?? 64,
    gutter: theme.space?.gutter ?? 22,
    stack: theme.space?.stack ?? 12,
    intensity: theme.motion?.intensity ?? 0.5,
    easePanel: theme.motion?.easePanel || 'cubic-bezier(.3,.8,.2,1)',
    easeSheet: theme.motion?.easeSheet || 'cubic-bezier(.3,.85,.2,1)',
    easeReveal: 'cubic-bezier(.2,.7,.2,1)',
    scene: theme.scene || 'none',
    motifs: Array.isArray(theme.motifs) ? theme.motifs : [],
    frame: theme.frame || 'plain',
    btnInk: p.mode === 'dark' ? '#0c0c0c' : '#ffffff',
    blend: p.mode === 'dark' ? 'screen' : 'multiply',
  };
}

/**
 * Emit the full --peek-* var contract onto `root.style`, plus the derived/aliased tokens
 * the shell + custom-block authors rely on (radius-lg, radius-pill, ease-reveal, mode,
 * glow, texture, scene/frame/motifs, safe-area). `extraVars` is the already-sanitized
 * ThemeSpec.cssVars map (sanitizeCssVars run in mount.ts), merged LAST so the model can
 * override any derived token for a one-off `custom` effect.
 */
export function applyThemeVars(
  root: HTMLElement,
  theme: ThemeSpec,
  t: Tokens,
  extraVars: Record<string, string>,
): void {
  const v = root.style;
  const set = (k: string, val: string) => v.setProperty(k, val);

  // ── the documented INTERFACES §1.2 mapping ──
  set('--peek-bg', t.bg);
  set('--peek-surface', t.surface);
  set('--peek-ink', t.ink);
  set('--peek-muted', t.muted);
  set('--peek-line', t.line);
  set('--peek-accent', t.accent);
  set('--peek-accent-2', t.accent2);
  set('--peek-font-display', t.fontDisplay);
  set('--peek-font-body', t.fontBody);
  set('--peek-font-accent', t.fontAccent);
  set('--peek-radius-card', t.radiusCard + 'px');
  set('--peek-radius-pill', t.radiusPill + 'px');
  set('--peek-space-section-y', t.sectionY + 'px');
  set('--peek-space-gutter', t.gutter + 'px');
  set('--peek-space-stack', t.stack + 'px');
  set('--peek-ease-panel', t.easePanel);
  set('--peek-ease-sheet', t.easeSheet);

  // ── derived / aliased tokens the shell + custom HTML also read (SHELL_SPEC §5) ──
  set('--peek-accent2', t.accent2); // alias (some authors write the no-dash form)
  set('--peek-radius', t.radiusCard + 'px'); // SHELL_SPEC names the card radius `--radius`/`--peek-radius`
  set('--peek-radius-lg', Math.round(t.radiusCard * 1.6) + 'px');
  set('--peek-ease-reveal', t.easeReveal);
  set('--peek-display-tracking', t.displayTracking);
  set('--peek-display-case', t.displayCase);
  set('--peek-eyebrow-tracking', t.eyebrowTracking);
  set('--peek-scale-ratio', String(t.scaleRatio));
  set('--peek-mode', t.mode);
  set('--peek-motion-intensity', String(t.intensity));
  set('--peek-blend', t.blend);
  set('--peek-btn-ink', t.btnInk);
  // tinted accent washes used pervasively by section chrome
  set('--peek-accent-soft', rgba(t.accent, 0.12));
  set('--peek-accent-faint', rgba(t.accent, 0.07));
  set('--peek-glow', t.glow ? `0 0 18px ${rgba(t.accent, 0.55)}` : 'none');
  // safe-area insets (every mockup pads the bar/menu/sheet by these)
  set('--peek-safe-b', 'env(safe-area-inset-bottom, 0px)');
  set('--peek-safe-t', 'env(safe-area-inset-top, 0px)');

  // ── escape hatch: model cssVars, merged last (already sanitized) ──
  for (const [k, val] of Object.entries(extraVars)) {
    set(k, val);
  }
}

/** A token-driven multi-stop page background wash (SHELL_SPEC §3: most themes set one).
 *  Subtle so it never fights the hero; keyed to mode + accents. */
export function backgroundWash(t: Tokens): string {
  const a = rgba(t.accent, t.mode === 'dark' ? 0.12 : 0.06);
  const a2 = rgba(t.accent2, t.mode === 'dark' ? 0.1 : 0.05);
  return (
    `radial-gradient(120% 80% at 85% -5%, ${a2}, transparent 55%),` +
    `radial-gradient(100% 70% at 0% 0%, ${a}, transparent 50%),` +
    t.bg
  );
}
