import 'server-only';
import type { RecipientProfile, Vibe, VibeMood, VibePalette } from '@/db/schema';

export interface HeroPromptContext {
  recipientName?: string | null;
  relationship?: string | null;
  occasion?: string | null;
  vibe?: Vibe | null;
  recipientProfile?: RecipientProfile | null;
}

const HEX_RE = /^#[0-9a-f]{3,8}$/i;

const STYLE_BY_MOOD: Record<VibeMood, string> = {
  minimal:
    'minimal composition, generous negative space, restrained styling, soft natural light',
  rich:
    'lush layered composition, abundant texture, saturated tones, golden cinematic light',
  whimsical:
    'playful surreal composition, gentle whimsy, dreamlike props, soft diffused light',
  editorial:
    'editorial fashion-magazine composition, confident styling, dramatic directional light',
};

const DEFAULT_STYLE =
  'tasteful composition, balanced palette, soft natural light';

const UNIVERSAL_QUALITY =
  'editorial quality, sharp focus, photorealistic, no text, no watermarks, no logos, no typography';

function uniqueHexes(palette: VibePalette | undefined): string[] {
  if (!palette) return [];
  const candidates = [
    palette.accent,
    palette.accent2,
    palette.bg,
    palette.surface,
    palette.ink,
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of candidates) {
    if (!c) continue;
    const trimmed = c.trim();
    if (!HEX_RE.test(trimmed)) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= 4) break;
  }
  return out;
}

function recipientDescriptor(ctx: HeroPromptContext): string {
  const parts: string[] = [];
  const rel = ctx.relationship?.trim();
  if (rel) parts.push(rel);
  const profileNotes = ctx.recipientProfile?.notes?.trim();
  const ageHint = extractAgeHint(profileNotes ?? '');
  if (ageHint) parts.push(ageHint);
  if (parts.length === 0) return 'someone special';
  return parts.join(', ');
}

function extractAgeHint(notes: string): string | null {
  if (!notes) return null;
  const match = notes.match(/\b(\d{1,2})\s*(?:yo|years?\s*old)\b/i);
  if (match) {
    const n = Number(match[1]);
    if (Number.isFinite(n) && n > 0 && n < 120) return `age ${n}`;
  }
  const range = notes.match(/\b(\d{1,2})\s*[-–]\s*(\d{1,2})\b/);
  if (range) {
    const lo = Number(range[1]);
    const hi = Number(range[2]);
    if (Number.isFinite(lo) && Number.isFinite(hi) && lo > 0 && hi > lo && hi < 120) {
      return `age ${lo}-${hi}`;
    }
  }
  return null;
}

function styleForMood(mood: VibeMood | undefined): string {
  if (!mood) return DEFAULT_STYLE;
  return STYLE_BY_MOOD[mood] ?? DEFAULT_STYLE;
}

export interface BuiltHeroPrompt {
  prompt: string;
  parts: {
    base: string;
    palette: string[];
    mood?: VibeMood;
    occasion?: string;
    recipientDescriptor: string;
    style: string;
  };
}

export function buildHeroPrompt(
  basePrompt: string,
  ctx: HeroPromptContext,
): BuiltHeroPrompt {
  const base = basePrompt.trim();
  const palette = uniqueHexes(ctx.vibe?.palette);
  const mood = ctx.vibe?.mood;
  const occasion = ctx.occasion?.trim() ?? undefined;
  const descriptor = recipientDescriptor(ctx);
  const style = styleForMood(mood);

  const segments: string[] = [base];
  if (palette.length > 0) {
    segments.push(`color palette ${palette.join(' ')}`);
  }
  if (mood) {
    segments.push(`mood: ${mood}`);
  }
  const occasionPhrase = occasion
    ? `suitable for a ${occasion} gift page for ${descriptor}`
    : `suitable for a gift page for ${descriptor}`;
  segments.push(occasionPhrase);
  segments.push(style);
  segments.push(UNIVERSAL_QUALITY);

  const built: BuiltHeroPrompt = {
    prompt: segments.join('. '),
    parts: {
      base,
      palette,
      recipientDescriptor: descriptor,
      style,
    },
  };
  if (mood) built.parts.mood = mood;
  if (occasion) built.parts.occasion = occasion;
  return built;
}
