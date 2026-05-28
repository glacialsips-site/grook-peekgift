/**
 * 7-dial DB Vibe ⇄ grammar VibeSpec reconciliation.
 * =================================================
 *
 * The live DB `vibe` column (`db/schema/peeks.ts`) is the 7-dial subset:
 * palette(hex) / typography / density / shape / mood / motion / voice. The
 * grammar is the richer 10-dim superset. This module maps the subset UP into a
 * grammar `VibeSpec` so EXISTING peeks render through the new renderer with no
 * schema change.
 *
 * Direction of truth: the DB palette is HEX. The grammar wants OKLCH + a seed.
 * We import the hex roles directly into OKLCH (no re-derivation of HUE — we
 * honor the curator's exact colors), then let `validateVibeSpec` run the
 * contrast deriver over them so they're guaranteed legal. Where the DB lacks a
 * grammar dimension (depth, texture detail, imagery, scaleContrast), we infer a
 * sensible value from the dials present (mood/density), falling to SAFE_DEFAULT
 * shape otherwise.
 */

import type { Vibe as DbVibe } from '@/db/schema/peeks';
import type {
  FontRole,
  Oklch,
  Palette,
  TypographySpec,
  Vibe,
  VibeSpec,
} from './grammar';
import { INVARIANTS } from './grammar';
import { hexToOklch } from './oklch';
import { SAFE_DEFAULT, validateVibeSpec } from './engine';

const HEADING_TO_ROLE: Record<string, FontRole> = {
  serif: 'serif',
  display: 'display',
  sans: 'sans',
  mono: 'mono',
  script: 'script',
};
const BODY_TO_ROLE: Record<string, FontRole> = {
  sans: 'sans',
  serif: 'serif',
  mono: 'mono',
};

/** mood → texture/scale character. */
const MOOD_PROFILE: Record<
  string,
  {
    scaleContrast: number;
    grain: number;
    wash: number;
    motif: VibeSpec['texture']['motif'];
    elevation: VibeSpec['depth']['elevation'];
    imagery: VibeSpec['imagery']['treatment'];
    displayCase: TypographySpec['displayCase'];
  }
> = {
  minimal: {
    scaleContrast: 1.2,
    grain: 0,
    wash: 0,
    motif: 'none',
    elevation: 'flat',
    imagery: 'natural',
    displayCase: 'none',
  },
  rich: {
    scaleContrast: 1.333,
    grain: 0.04,
    wash: 0.08,
    motif: 'none',
    elevation: 'lifted',
    imagery: 'framed',
    displayCase: 'none',
  },
  whimsical: {
    scaleContrast: 1.5,
    grain: 0,
    wash: 0.1,
    motif: 'confetti',
    elevation: 'dramatic',
    imagery: 'illustrated',
    displayCase: 'none',
  },
  editorial: {
    scaleContrast: 1.414,
    grain: 0.02,
    wash: 0,
    motif: 'none',
    elevation: 'flat',
    imagery: 'duotone',
    displayCase: 'none',
  },
};

const DENSITY_MAP: Record<string, VibeSpec['spatial']['density']> = {
  compact: 'compact',
  cozy: 'cozy',
  breathable: 'breathable',
};
const SHAPE_MAP: Record<string, VibeSpec['shape']['radius']> = {
  sharp: 'sharp',
  soft: 'soft',
  pillowy: 'pillowy',
};
const MOTION_MAP: Record<string, VibeSpec['motion']['character']> = {
  still: 'still',
  soft: 'soft',
  lively: 'lively',
};

function chromaOf(o: Oklch): number {
  return o.c;
}

/**
 * Build a grammar VibeSpec from the DB 7-dial vibe. The palette is imported as
 * EXPLICIT OKLCH roles (honoring the curator's hex), so the spec carries a
 * `roles` object; `derivePalette`'s seed fields are still required by the type,
 * so we reverse-infer a seed (key/saturation/strategy) from the imported roles
 * purely for metadata — the renderer reads `roles`, validated for contrast.
 */
export function dbVibeToSpec(db: DbVibe | null | undefined): VibeSpec {
  if (!db || !db.palette) {
    // No usable palette → SAFE_DEFAULT spec (already valid).
    return specFromVibe(SAFE_DEFAULT);
  }

  const bg = hexToOklch(db.palette.bg) ?? SAFE_DEFAULT.palette.roles.bg;
  const surface = hexToOklch(db.palette.surface) ?? SAFE_DEFAULT.palette.roles.surface;
  const ink = hexToOklch(db.palette.ink) ?? SAFE_DEFAULT.palette.roles.ink;
  const accent = hexToOklch(db.palette.accent) ?? SAFE_DEFAULT.palette.roles.accent;
  const accent2 = db.palette.accent2 ? hexToOklch(db.palette.accent2) ?? undefined : undefined;

  // Derive supporting roles the DB doesn't store.
  const inkMuted: Oklch = { l: (ink.l + bg.l) / 2, c: ink.c * 0.7, h: ink.h };
  const onAccent: Oklch = { l: accent.l > 0.55 ? 0.15 : 0.97, c: 0, h: accent.h };

  const roles: Palette = { bg, surface, ink, inkMuted, accent, onAccent, ...(accent2 ? { accent2 } : {}) };

  // Reverse-infer a seed (metadata only; roles override at validate time).
  const key: VibeSpec['palette']['key'] = bg.l > 0.6 ? 'light' : bg.l > 0.28 ? 'dim' : 'dark';
  const sat = chromaOf(accent);
  const saturation: VibeSpec['palette']['saturation'] = sat > 0.16 ? 'vivid' : sat > 0.08 ? 'medium' : 'muted';

  const mood =
    db.mood && MOOD_PROFILE[db.mood] ? MOOD_PROFILE[db.mood]! : MOOD_PROFILE['rich']!;

  const displayRole = HEADING_TO_ROLE[db.typography?.heading ?? 'serif'] ?? 'serif';
  const bodyRole = BODY_TO_ROLE[db.typography?.body ?? 'sans'] ?? 'sans';

  const spec: VibeSpec = {
    palette: { strategy: 'analogous', baseHue: bg.h, key, saturation, roles },
    typography: {
      displayRole,
      bodyRole,
      scaleContrast: mood.scaleContrast,
      displayCase: mood.displayCase,
      displayTracking: displayRole === 'display' ? 'tight' : 'normal',
      bodyLeading: db.density === 'breathable' ? 'loose' : db.density === 'compact' ? 'tight' : 'normal',
    },
    spatial: {
      density: DENSITY_MAP[db.density ?? 'breathable'] ?? 'breathable',
      baseUnitRem: db.density === 'compact' ? 0.75 : db.density === 'breathable' ? 1.1 : 1,
      gutter: db.density === 'compact' ? 'snug' : 'roomy',
      measureCh: 66,
    },
    shape: {
      radius: SHAPE_MAP[db.shape ?? 'soft'] ?? 'soft',
      imageMask: db.shape === 'pillowy' ? 'rounded' : 'none',
      border: db.mood === 'editorial' ? 'hairline' : 'none',
    },
    depth: { elevation: mood.elevation },
    texture: { grain: mood.grain, wash: mood.wash, motif: mood.motif },
    motion: {
      character: MOTION_MAP[db.motion ?? 'soft'] ?? 'soft',
      easing: db.mood === 'whimsical' ? 'bouncy' : 'eased',
    },
    imagery: { treatment: mood.imagery, textOverImage: false },
    moodWords:
      db.mood_words && db.mood_words.length >= INVARIANTS.MOOD_WORDS_MIN
        ? db.mood_words
        : ['warm', 'considered', 'personal'],
    voice: {
      warmth: db.voice?.warmth ?? 'warm',
      humor: db.voice?.humor ?? 'gentle',
      pace: db.voice?.pace ?? 'natural',
      formality: db.voice?.formality ?? 'neutral',
      emoji: db.voice?.emoji ?? 'rare',
      vocabulary: db.voice?.vocabulary ?? 'neutral',
      length: db.voice?.length ?? 'natural',
    },
  };
  return spec;
}

/** A DB vibe → a VALIDATED grammar Vibe, ready for the renderer. Never fails. */
export function dbVibeToValidated(db: DbVibe | null | undefined): Vibe {
  const spec = dbVibeToSpec(db);
  return validateVibeSpec(spec).vibe;
}

/** Strip a validated Vibe back to a plain VibeSpec (drops the brand + roles seed extras). */
function specFromVibe(v: Vibe): VibeSpec {
  return {
    palette: { ...v.palette },
    typography: v.typography,
    spatial: v.spatial,
    shape: v.shape,
    depth: v.depth,
    texture: v.texture,
    motion: v.motion,
    imagery: v.imagery,
    moodWords: v.moodWords,
    voice: v.voice,
  };
}
