import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { peeks, type Vibe } from '@/db/schema';
import { trackFireAndForget } from '@/lib/analytics/facade';
import { registerTool } from './index';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

const PaletteSchema = z
  .object({
    bg: z.string().regex(HEX_COLOR_RE),
    surface: z.string().regex(HEX_COLOR_RE),
    ink: z.string().regex(HEX_COLOR_RE),
    accent: z.string().regex(HEX_COLOR_RE),
    accent2: z.string().regex(HEX_COLOR_RE).optional(),
  })
  .strict();

const FontPairingSchema = z
  .object({
    display: z.string().min(1).max(80),
    body: z.string().min(1).max(80),
  })
  .strict();

const MotionSchema = z.enum(['still', 'soft', 'lively']);
const PresetSchema = z.enum([
  'playful',
  'romantic',
  'dry',
  'unhinged',
  'tender',
]);

const HeadingFontSchema = z.enum([
  'serif',
  'display',
  'sans',
  'mono',
  'script',
]);
const BodyFontSchema = z.enum(['sans', 'serif', 'mono']);
const TypographySchema = z
  .object({
    heading: HeadingFontSchema,
    body: BodyFontSchema,
  })
  .strict();
const DensitySchema = z.enum(['compact', 'cozy', 'breathable']);
const ShapeSchema = z.enum(['sharp', 'soft', 'pillowy']);
const MoodSchema = z.enum(['minimal', 'rich', 'whimsical', 'editorial']);

const VoiceWarmthSchema = z.enum(['restrained', 'measured', 'warm', 'effusive']);
const VoiceHumorSchema = z.enum(['none', 'gentle', 'dry', 'sharp']);
const VoicePaceSchema = z.enum(['considered', 'natural', 'quick']);
const VoiceFormalitySchema = z.enum(['casual', 'neutral', 'formal']);
const VoiceEmojiSchema = z.enum(['none', 'rare', 'occasional', 'playful']);
const VoiceVocabularySchema = z.enum(['slangy', 'neutral', 'elevated']);
const VoiceLengthSchema = z.enum(['punchy', 'natural', 'fuller']);
const VoiceSchema = z
  .object({
    warmth: VoiceWarmthSchema.optional(),
    humor: VoiceHumorSchema.optional(),
    pace: VoicePaceSchema.optional(),
    formality: VoiceFormalitySchema.optional(),
    emoji: VoiceEmojiSchema.optional(),
    vocabulary: VoiceVocabularySchema.optional(),
    length: VoiceLengthSchema.optional(),
  })
  .strict();

export const VibeInputSchema = z
  .object({
    preset: PresetSchema.optional(),
    tone: z.string().min(1).max(280).optional(),
    palette: PaletteSchema.optional(),
    mood_words: z.array(z.string().min(1).max(60)).max(20).optional(),
    motion: MotionSchema.optional(),
    font_pairing: FontPairingSchema.optional(),
    typography: TypographySchema.optional(),
    density: DensitySchema.optional(),
    shape: ShapeSchema.optional(),
    mood: MoodSchema.optional(),
    voice: VoiceSchema.optional(),
  })
  .strict();
type Input = z.infer<typeof VibeInputSchema>;

export type StoredPalette = z.infer<typeof PaletteSchema>;
export type StoredFontPairing = z.infer<typeof FontPairingSchema>;
export type StoredTypography = z.infer<typeof TypographySchema>;
export type StoredVoice = z.infer<typeof VoiceSchema>;
export type StoredVibe = {
  preset?: z.infer<typeof PresetSchema>;
  tone?: string;
  palette?: StoredPalette;
  mood_words?: string[];
  motion?: z.infer<typeof MotionSchema>;
  font_pairing?: StoredFontPairing;
  typography?: StoredTypography;
  density?: z.infer<typeof DensitySchema>;
  shape?: z.infer<typeof ShapeSchema>;
  mood?: z.infer<typeof MoodSchema>;
  voice?: StoredVoice;
};

export const VIBE_PRESETS: Record<z.infer<typeof PresetSchema>, StoredVibe> = {
  playful: {
    preset: 'playful',
    tone: 'breezy, winking, a little silly — like passing notes in class',
    palette: {
      bg: '#FFF7EC',
      surface: '#FFE9D3',
      ink: '#1F1A17',
      accent: '#FF6B6B',
      accent2: '#4ECDC4',
    },
    mood_words: ['breezy', 'mischievous', 'sun-warmed'],
    motion: 'lively',
    font_pairing: { display: 'Fraunces', body: 'Inter' },
    typography: { heading: 'script', body: 'sans' },
    density: 'breathable',
    shape: 'pillowy',
    mood: 'whimsical',
  },
  romantic: {
    preset: 'romantic',
    tone: 'tender, candle-lit, unhurried — handwritten without the cursive',
    palette: {
      bg: '#FBF3F0',
      surface: '#F2DDD7',
      ink: '#2A1B1E',
      accent: '#B23A48',
      accent2: '#E0A899',
    },
    mood_words: ['tender', 'slow', 'lamplit'],
    motion: 'soft',
    font_pairing: { display: 'Cormorant Garamond', body: 'Inter' },
    typography: { heading: 'serif', body: 'serif' },
    density: 'cozy',
    shape: 'soft',
    mood: 'editorial',
  },
  dry: {
    preset: 'dry',
    tone: 'deadpan, well-read, never-explains-the-joke',
    palette: {
      bg: '#F6F4EF',
      surface: '#E8E3D7',
      ink: '#16161A',
      accent: '#3A3A3C',
      accent2: '#8C7A5B',
    },
    mood_words: ['deadpan', 'tweedy', 'measured'],
    motion: 'still',
    font_pairing: { display: 'Times Now', body: 'IBM Plex Sans' },
    typography: { heading: 'serif', body: 'sans' },
    density: 'compact',
    shape: 'sharp',
    mood: 'minimal',
  },
  unhinged: {
    preset: 'unhinged',
    tone: 'gremlin-energy, all caps where appropriate, refuses to be embarrassed',
    palette: {
      bg: '#0E0E12',
      surface: '#1A1A22',
      ink: '#F8F8F2',
      accent: '#FF3CAC',
      accent2: '#7CFC00',
    },
    mood_words: ['feral', 'neon', 'unserious'],
    motion: 'lively',
    font_pairing: { display: 'Space Grotesk', body: 'Space Mono' },
    typography: { heading: 'mono', body: 'mono' },
    density: 'compact',
    shape: 'sharp',
    mood: 'rich',
  },
  tender: {
    preset: 'tender',
    tone: 'quiet, careful, says the thing out loud',
    palette: {
      bg: '#F4F1EC',
      surface: '#E6E2DA',
      ink: '#23201D',
      accent: '#6C8EAD',
      accent2: '#D3B88C',
    },
    mood_words: ['soft', 'honest', 'steady'],
    motion: 'soft',
    font_pairing: { display: 'Newsreader', body: 'Inter' },
    typography: { heading: 'serif', body: 'sans' },
    density: 'cozy',
    shape: 'soft',
    mood: 'minimal',
  },
};

interface Output {
  ok: true;
  vibe: StoredVibe;
}

registerTool<Input, Output>({
  name: 'set_vibe',
  description:
    "REPLACE the entire visual + tonal vibe of the Peek. Use this once at the start when you have a clear read on what the page should feel like. After this, use update_vibe to merge new signals (hero palette extraction, card drift, etc). Pass a preset and/or override individual fields — provided fields win over the preset; absent fields fall back to the preset. The style-engine fields (typography, density, shape, mood) shape the page's LOOK. The voice sub-object shapes how YOU talk to the curator — match register to the curator's writing style and the occasion's gravity.",
  input_schema: {
    type: 'object',
    properties: {
      preset: {
        type: 'string',
        enum: ['playful', 'romantic', 'dry', 'unhinged', 'tender'],
        description:
          'Starting-point vibe. Provided fields override the preset values.',
      },
      tone: {
        type: 'string',
        description: 'One-line description of the voice/mood.',
      },
      palette: {
        type: 'object',
        properties: {
          bg: { type: 'string', description: 'Page background hex.' },
          surface: { type: 'string', description: 'Card surface hex.' },
          ink: { type: 'string', description: 'Primary text hex.' },
          accent: { type: 'string', description: 'Primary accent hex.' },
          accent2: { type: 'string', description: 'Secondary accent hex.' },
        },
        required: ['bg', 'surface', 'ink', 'accent'],
      },
      mood_words: {
        type: 'array',
        items: { type: 'string' },
        description: 'Short adjective list, 3-6 items.',
      },
      motion: {
        type: 'string',
        enum: ['still', 'soft', 'lively'],
      },
      font_pairing: {
        type: 'object',
        properties: {
          display: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['display', 'body'],
      },
      typography: {
        type: 'object',
        description:
          'Curated heading + body font family. heading: serif (Playfair Display — elegant, traditional), display (Fraunces — characterful), sans (Inter — clean, neutral), mono (DM Mono — technical), script (Caveat — playful, handwritten). body: sans (Inter) / serif (Cormorant — refined) / mono. Match to recipient + occasion.',
        properties: {
          heading: {
            type: 'string',
            enum: ['serif', 'display', 'sans', 'mono', 'script'],
          },
          body: {
            type: 'string',
            enum: ['sans', 'serif', 'mono'],
          },
        },
        required: ['heading', 'body'],
      },
      density: {
        type: 'string',
        enum: ['compact', 'cozy', 'breathable'],
        description:
          'Spacing scale. compact = tight, info-dense. cozy = default. breathable = generous, airy.',
      },
      shape: {
        type: 'string',
        enum: ['sharp', 'soft', 'pillowy'],
        description:
          'Border radius. sharp = 4px (editorial). soft = 12px (default). pillowy = 24px (whimsical).',
      },
      mood: {
        type: 'string',
        enum: ['minimal', 'rich', 'whimsical', 'editorial'],
        description:
          'High-level visual register. minimal = restrained. rich = saturated, layered. whimsical = playful. editorial = magazine-like.',
      },
      voice: {
        type: 'object',
        description:
          "How YOU (Peek) talk to the curator. Set this on turn 1 or 2 by reading: curator's own writing style (mirror them), recipient age + relationship, occasion gravity. Bachelorette pulls humor=sharp + emoji=playful + pace=quick. Memorial pulls humor=none + warmth=measured + length=fuller + emoji=none. 6yo birthday pulls humor=gentle + emoji=occasional + pace=quick. Corporate farewell pulls humor=dry + emoji=rare + length=natural. Reserved 40-something professional pulls warmth=measured + vocabulary=neutral + emoji=none. All sub-fields optional.",
        properties: {
          warmth: {
            type: 'string',
            enum: ['restrained', 'measured', 'warm', 'effusive'],
            description:
              'Emotional temperature. restrained for memorial/professional, warm default, effusive for close-friend birthday.',
          },
          humor: {
            type: 'string',
            enum: ['none', 'gentle', 'dry', 'sharp'],
            description:
              'none for memorial/grief, gentle for kids and tender moments, dry for grown-up sentimentality, sharp for bachelorette/chops-busting between close friends.',
          },
          pace: {
            type: 'string',
            enum: ['considered', 'natural', 'quick'],
            description:
              'considered = slower, weighted (memorials, milestones). natural = default. quick = quippy, fast back-and-forth.',
          },
          formality: {
            type: 'string',
            enum: ['casual', 'neutral', 'formal'],
            description:
              'casual = texting-a-friend. neutral = default. formal = writing-a-card (rare; usually only for professional or formal-occasion contexts).',
          },
          emoji: {
            type: 'string',
            enum: ['none', 'rare', 'occasional', 'playful'],
            description:
              'Default rare-or-none. none for memorial/grief or reserved-professional curators. occasional for warm peer-to-peer. playful only when the curator themselves uses emoji liberally.',
          },
          vocabulary: {
            type: 'string',
            enum: ['slangy', 'neutral', 'elevated'],
            description:
              'slangy = current/gen-z/text-speak (bachelorette, college-age). neutral = default. elevated = literary/considered (memorial, milestone reflections).',
          },
          length: {
            type: 'string',
            enum: ['punchy', 'natural', 'fuller'],
            description:
              'punchy = one-liners, snappy. natural = default 1-3 sentences. fuller = paragraph when the moment calls for it (memorial reflections, milestone toasts).',
          },
        },
      },
    },
    required: [],
  },
  handler: async (input, ctx): Promise<Output> => {
    const parsed = VibeInputSchema.parse(input);
    const base: StoredVibe = parsed.preset ? VIBE_PRESETS[parsed.preset] : {};
    const next: StoredVibe = {
      ...base,
      ...(parsed.preset !== undefined ? { preset: parsed.preset } : {}),
      ...(parsed.tone !== undefined ? { tone: parsed.tone } : {}),
      ...(parsed.palette !== undefined ? { palette: parsed.palette } : {}),
      ...(parsed.mood_words !== undefined
        ? { mood_words: parsed.mood_words }
        : {}),
      ...(parsed.motion !== undefined ? { motion: parsed.motion } : {}),
      ...(parsed.font_pairing !== undefined
        ? { font_pairing: parsed.font_pairing }
        : {}),
      ...(parsed.typography !== undefined
        ? { typography: parsed.typography }
        : {}),
      ...(parsed.density !== undefined ? { density: parsed.density } : {}),
      ...(parsed.shape !== undefined ? { shape: parsed.shape } : {}),
      ...(parsed.mood !== undefined ? { mood: parsed.mood } : {}),
      ...(parsed.voice !== undefined ? { voice: parsed.voice } : {}),
    };
    await db
      .update(peeks)
      .set({
        vibe: next,
        updatedAt: new Date(),
      })
      .where(eq(peeks.id, ctx.peekId));

    trackFireAndForget({
      name: 'vibe_evolved',
      peekId: ctx.peekId,
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      payload: { source: 'set_vibe', patch: { ...parsed } },
    });

    return { ok: true, vibe: next };
  },
});
