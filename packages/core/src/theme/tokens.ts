import type { ThemeSpec } from "../document/contract";
import { ensureReadable } from "./contrast";

export interface Tokens {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  accent2: string;
  mode: "light" | "dark";
  glow: boolean;
  texture: boolean;
  fontDisplay: string;
  fontBody: string;
  fontAccent: string;
  scaleRatio: number;
  displayTracking: string;
  eyebrowTracking: string;
  displayCase: "none" | "upper";
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
  btnInk: string;
  blend: string;
  displayShadow: string;
  cardShadow: string;
  borderWeight: number;
  textureStrength: number;
}

export function fontStack(family?: string): string {
  const fallback = `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  return family ? `"${family}", ${fallback}` : fallback;
}

function mixAlpha(color: string, alpha: number): string {
  const pct = Math.round(Math.max(0, Math.min(1, alpha)) * 100);
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

export function toTokens(theme: ThemeSpec): Tokens {
  const p = ensureReadable(theme.palette);
  const ty = theme.type;
  const accent2 = p.accent2 || p.accent;
  const loud = theme.loud || {};

  const resolveColor = (c: string | undefined, fallback: string): string =>
    c === "accent" ? p.accent : c === "accent2" ? accent2 : c === "ink" ? p.ink : c || fallback;

  let displayShadow = "";
  if (typeof loud.displayShadow === "string" && loud.displayShadow.trim()) {
    displayShadow = loud.displayShadow
      .replace(/\baccent2\b/g, accent2)
      .replace(/\baccent\b/g, p.accent)
      .replace(/\bink\b/g, p.ink);
  } else if (p.glow) {
    displayShadow = `0 0 24px ${mixAlpha(p.accent, 0.55)}`;
  }

  let cardShadow = "none";
  if (loud.cardShadow) {
    const cs = loud.cardShadow;
    const col = resolveColor(cs.color, p.ink);
    cardShadow = `${cs.x}px ${cs.y}px ${cs.blur ?? 0}px ${cs.spread ?? 0}px ${col}`;
  }

  const borderWeight =
    typeof loud.borderWeight === "number" && loud.borderWeight > 0 ? loud.borderWeight : 1;
  const textureStrength =
    typeof loud.textureStrength === "number" ? Math.max(0, Math.min(1, loud.textureStrength)) : 0.06;

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
    displayTracking: ty.displayTracking || "0",
    eyebrowTracking: ty.eyebrowTracking || "0.22em",
    displayCase: ty.displayCase || "none",
    radiusCard: theme.radius?.card ?? 12,
    radiusPill: theme.radius?.pill ?? 999,
    sectionY: theme.space?.sectionY ?? 64,
    gutter: theme.space?.gutter ?? 22,
    stack: theme.space?.stack ?? 12,
    intensity: theme.motion?.intensity ?? 0.5,
    easePanel: theme.motion?.easePanel || "cubic-bezier(.3,.8,.2,1)",
    easeSheet: theme.motion?.easeSheet || "cubic-bezier(.3,.85,.2,1)",
    easeReveal: "cubic-bezier(.2,.7,.2,1)",
    scene: theme.scene || "none",
    motifs: Array.isArray(theme.motifs) ? theme.motifs : [],
    frame: theme.frame || "plain",
    btnInk: p.mode === "dark" ? "#0c0c0c" : "#ffffff",
    blend: p.mode === "dark" ? "screen" : "multiply",
    displayShadow,
    cardShadow,
    borderWeight,
    textureStrength,
  };
}

export function themeToCSSVars(theme: ThemeSpec): Record<string, string> {
  const t = toTokens(theme);
  const vars: Record<string, string> = {
    "--peek-bg": t.bg,
    "--peek-surface": t.surface,
    "--peek-ink": t.ink,
    "--peek-muted": t.muted,
    "--peek-line": t.line,
    "--peek-accent": t.accent,
    "--peek-accent-2": t.accent2,
    "--peek-accent2": t.accent2,
    "--peek-font-display": t.fontDisplay,
    "--peek-font-body": t.fontBody,
    "--peek-font-accent": t.fontAccent,
    "--peek-radius-card": `${t.radiusCard}px`,
    "--peek-radius": `${t.radiusCard}px`,
    "--peek-radius-lg": `${Math.round(t.radiusCard * 1.6)}px`,
    "--peek-radius-pill": `${t.radiusPill}px`,
    "--peek-space-section-y": `${t.sectionY}px`,
    "--peek-space-gutter": `${t.gutter}px`,
    "--peek-space-stack": `${t.stack}px`,
    "--peek-ease-panel": t.easePanel,
    "--peek-ease-sheet": t.easeSheet,
    "--peek-ease-reveal": t.easeReveal,
    "--peek-display-tracking": t.displayTracking,
    "--peek-display-case": t.displayCase === "upper" ? "uppercase" : "none",
    "--peek-eyebrow-tracking": t.eyebrowTracking,
    "--peek-scale-ratio": String(t.scaleRatio),
    "--peek-mode": t.mode,
    "--peek-motion-intensity": String(t.intensity),
    "--peek-blend": t.blend,
    "--peek-btn-ink": t.btnInk,
    "--peek-accent-soft": mixAlpha(t.accent, 0.12),
    "--peek-accent-faint": mixAlpha(t.accent, 0.07),
    "--peek-glow": t.glow ? `0 0 18px ${mixAlpha(t.accent, 0.55)}` : "none",
    "--peek-display-shadow": t.displayShadow || "none",
    "--peek-card-shadow": t.cardShadow,
    "--peek-border-weight": `${t.borderWeight}px`,
    "--peek-texture-strength": String(t.textureStrength),
    "--peek-scene": t.scene,
    "--peek-frame": t.frame,
    "--peek-motifs": t.motifs.join(" "),
    "--peek-texture": t.texture ? "1" : "0",
    "--peek-glow-on": t.glow ? "1" : "0",
    "--peek-bg-wash": backgroundWash(t),
    "--peek-safe-b": "env(safe-area-inset-bottom, 0px)",
    "--peek-safe-t": "env(safe-area-inset-top, 0px)",
  };

  if (theme.cssVars) {
    for (const [k, v] of Object.entries(theme.cssVars)) {
      if (k.startsWith("--peek-") && typeof v === "string") vars[k] = v;
    }
  }
  return vars;
}

export function backgroundWash(t: Tokens): string {
  const a = mixAlpha(t.accent, t.mode === "dark" ? 0.12 : 0.06);
  const a2 = mixAlpha(t.accent2, t.mode === "dark" ? 0.1 : 0.05);
  return (
    `radial-gradient(120% 80% at 85% -5%, ${a2}, transparent 55%),` +
    `radial-gradient(100% 70% at 0% 0%, ${a}, transparent 50%),` +
    t.bg
  );
}
