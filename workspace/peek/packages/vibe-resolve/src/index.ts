import type {
  DesignTokens,
  TypeRole,
  TypeTokens,
  TextCase,
  MotionTokens,
  ShadowTokens,
  RadiusTokens,
  TextureTokens,
  ColorTokens,
} from "@peek/design-tokens";
import type { Genome, Knobs, TypeKnobs } from "@peek/vibe-genome";
import { generatePalette, pickFonts, fontStack, typeScale, spaceTokens } from "@peek/vibe-harmony";

/**
 * vibe-resolve — knobs -> a complete, render-ready DesignTokens set. Pure. The renderer reads
 * only what this produces. Resolution is deterministic given a genome.
 */

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

function mapCase(c: TypeKnobs["case"]): TextCase {
  return c === "upper" ? "upper" : c === "lower" ? "lower" : "none";
}

function trackingEm(t: number, role: "display" | "heading" | "eyebrow"): string {
  if (role === "eyebrow") return `${lerp(0.18, 0.42, t).toFixed(3)}em`;
  if (role === "display") return `${lerp(-0.025, 0.005, t).toFixed(3)}em`;
  return `${lerp(-0.015, 0.01, t).toFixed(3)}em`;
}

function buildType(k: TypeKnobs): TypeTokens {
  const { choice, faces } = pickFonts(k);
  const sizes = typeScale(k);
  const heavy = k.displayClass === "chunky-block" || k.displayClass === "condensed";
  const displayWeight = heavy ? 700 : 600;
  const dispStack = fontStack(choice.display, "display", k.displayClass);
  const bodyStack = fontStack(choice.body, "body", k.displayClass);
  const caseV = mapCase(k.case);

  const display: TypeRole = {
    family: dispStack,
    size: sizes.display,
    weight: displayWeight,
    tracking: trackingEm(k.tracking, "display"),
    leading: 0.98,
    case: caseV,
    italic: false,
  };
  const heading: TypeRole = {
    family: dispStack,
    size: sizes.heading,
    weight: displayWeight,
    tracking: trackingEm(k.tracking, "heading"),
    leading: 1.06,
    case: caseV,
    italic: false,
  };
  const body: TypeRole = {
    family: bodyStack,
    size: sizes.body,
    weight: k.bodyWeight,
    tracking: "0",
    leading: 1.55,
    case: "none",
    italic: false,
  };
  const eyebrow: TypeRole = {
    family: bodyStack,
    size: sizes.eyebrow,
    weight: 700,
    tracking: trackingEm(k.tracking, "eyebrow"),
    leading: 1,
    case: "upper",
    italic: false,
  };

  const tt: TypeTokens = { display, heading, body, eyebrow, scaleRatio: k.scaleRatio, faces };
  if (choice.script) {
    tt.script = {
      family: `"${choice.script}", "Brush Script MT", cursive`,
      size: sizes.heading,
      weight: 400,
      tracking: "0",
      leading: 1.1,
      case: "none",
      italic: false,
    };
  }
  if (choice.mono) {
    tt.mono = {
      family: fontStack(choice.mono, "mono", k.displayClass),
      size: "13px",
      weight: 400,
      tracking: "0.05em",
      leading: 1.4,
      case: "none",
      italic: false,
    };
  }
  return tt;
}

function buildRadius(k: Knobs): RadiusTokens {
  const r = (n: number): string => (n >= 999 ? "999px" : `${Math.round(n)}px`);
  return { button: r(k.shape.radiusButton), card: r(k.shape.radiusCard), sheet: r(k.shape.radiusSheet), pill: "999px" };
}

function buildShadow(k: Knobs, color: ColorTokens): ShadowTokens {
  const style = k.texture.surfaceShadow;
  const a0 = color.accents[0] ?? color.accentDeep;
  let card = "none";
  let button = "none";
  if (style === "soft-tint") {
    card = "0 22px 54px -26px rgba(20,16,18,.30)";
    button = "0 10px 22px -10px rgba(20,16,18,.24)";
  } else if (style === "hard-offset") {
    card = `8px 8px 0 ${color.ink}`;
    button = `5px 5px 0 ${color.ink}`;
  } else if (style === "neon-glow") {
    card = `0 0 30px ${a0}55, 0 0 1px ${a0}`;
    button = `0 0 24px ${a0}aa`;
  }
  return {
    style,
    card,
    button,
    border: { weight: `${k.shape.borderWeight}px`, style: k.shape.borderStyle, color: color.line },
  };
}

function buildMotion(k: Knobs): MotionTokens {
  const easings = {
    standard: "cubic-bezier(.3,.8,.2,1)",
    premium: "cubic-bezier(.2,.7,.2,1)",
    springy: "cubic-bezier(.3,.9,.2,1.1)",
  } as const;
  const motion: MotionTokens = {
    intensity: k.motion.intensity,
    easing: {
      standard: easings[k.motion.easingProfile],
      sheet: "cubic-bezier(.3,.85,.2,1)",
      reveal: easings.premium,
    },
    durations: {
      fast: "0.3s",
      base: "0.45s",
      slow: "0.8s",
      marquee: `${Math.round(lerp(34, 18, k.motion.loopSpeed))}s`,
    },
    reducedMotion: true,
  };
  if (k.motion.easingProfile === "springy") motion.easing.spring = easings.springy;
  return motion;
}

function buildTexture(k: Knobs): TextureTokens {
  return { kind: k.texture.kind, glassBlur: k.texture.glassBlur, glassSaturate: 160 };
}

/** Resolve a genome's knob vector into a complete, render-ready token set. */
export function resolveTokens(genome: Genome): DesignTokens {
  const k = genome.knobs;
  const color = generatePalette(k.color);
  return {
    color,
    type: buildType(k.type),
    space: spaceTokens(k.density, k.layout.containerWidth),
    radius: buildRadius(k),
    shadow: buildShadow(k, color),
    motion: buildMotion(k),
    texture: buildTexture(k),
  };
}
