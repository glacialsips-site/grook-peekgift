// ============================================================================
// peek.gift — THE PEEK CHAT BRAIN, tools + IR reducer
// ----------------------------------------------------------------------------
// Two things live here:
//   1. PEEK_STUDIO_TOOLS — the Anthropic `input_schema` definitions the model sees
//      (the canonical set from ir/INTERFACES.md §3). These are the SEAM the model
//      authors against; the schemas are intentionally permissive (the reducer does
//      the strict validation + IR bookkeeping, never the model).
//   2. reduceTool(ir, name, input, ctx) — the pure IR reducer per INTERFACES §3:
//        validate input  →  mutate IR  →  re-validatePeekIR  →  { ok, ir, result }
//      The SAME reducer runs in live mode (model calls the tool) and in the
//      deterministic stub (the route scripts tool calls), so the preview builds
//      identically with zero keys — mirrors the salvaged lib/peek/preview-driver
//      pattern, but on the frozen PeekIR spine.
//
// HARD RULES (PLAN.md §2 / INTERFACES §3):
//   • All side effects go through ports.* — NEVER a vendor SDK or raw SQL inline.
//       resolve_card        → ports.cardResolver.resolve
//       generate_hero_image → ports.image.generate
//       persistence         → ports.persistence (appendVersion, by the route)
//   • Re-validate the WHOLE IR after every mutation; reject (never persist/emit) if
//     the result is invalid.
//   • Sanitize before store/render: custom section html → sanitizeCustomHtml;
//     theme cssVars → sanitizeCssVars.
//   • ID / contiguous-position bookkeeping lives HERE, not in the model.
// ============================================================================

import { z } from 'zod';
import type Anthropic from '@anthropic-ai/sdk';

import type {
  Card,
  CardType,
  MediaSlot,
  PeekIR,
  Section,
  SectionKind,
  UnlockRule,
  VariantGroup,
  VariantSelection,
} from '@/lib/ir/contract';
import { validatePeekIR, sanitizeCustomHtml, sanitizeCssVars } from '@/lib/ir/schema';
import { ports } from '@/lib/ir/ports';
import type { CardData } from '@/lib/ir/ports';

// ─────────────────────────────────────────────────────────────────────────────
// Tool context + result (INTERFACES §3)
// ─────────────────────────────────────────────────────────────────────────────
export interface ToolContext {
  peekId: string;
  curatorId: string;
}

export type ToolResult =
  | { ok: true; ir: PeekIR; result?: unknown }
  | { ok: false; error: string };

// The canonical tool names (mirrors + extends the existing lib/peek-tools.ts).
export const PEEK_TOOL_NAMES = [
  'set_concept',
  'set_theme',
  'upsert_section',
  'remove_section',
  'reorder_sections',
  'set_note',
  'add_card',
  'update_card',
  'set_card_rule',
  'remove_card',
  'reorder_cards',
  'add_variant_group',
  'generate_hero_image',
  'set_hero_media',
  'resolve_card',
  'mark_ready',
] as const;
export type PeekToolName = (typeof PEEK_TOOL_NAMES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// 1. Anthropic tool schemas (what the model sees). Descriptions are prescriptive
//    about WHEN to call — recent Opus models reach for tools conservatively, so a
//    trigger condition in the description earns its keep.
// ─────────────────────────────────────────────────────────────────────────────
const ASPECTS = ['16:9', '4:3', '1:1', '9:16', '3:4'] as const;
const SCENE_KINDS = [
  'none', 'grain', 'rayfan', 'sunburst', 'starfield', 'gridfloor',
  'mirrorball', 'confetti', 'bubbles', 'halftone', 'blueprint', 'topo', 'mesh', 'scanlines',
] as const;
const MOTIF_KINDS = [
  'sparkle', 'star', 'crown', 'suit', 'leaf', 'zigzag', 'rule',
  'dots', 'sunburst', 'hanko', 'chrome', 'stamp',
] as const;
const FRAME_KINDS = [
  'plain', 'arch', 'locket', 'vinyl', 'porthole', 'polaroid', 'idcard', 'stamp', 'ticket',
] as const;
const SECTION_KINDS = [
  'hero', 'note', 'giftgrid', 'rail', 'lookbook', 'gallery', 'details', 'steps',
  'countdown', 'claim', 'tracklist', 'courses', 'tiers', 'stubs', 'flightplan', 'custom',
] as const;
const CARD_TYPES = ['product', 'activity', 'aspirational', 'digital'] as const;
const VARIANT_SELECTIONS = ['pick_one', 'pick_any', 'pick_all'] as const;
const IMAGE_SOURCES = ['user_upload', 'stock', 'ai_generated', 'external', 'pending'] as const;
const UNLOCK_KINDS = ['beg', 'date_after', 'event'] as const;

const fontSpecSchemaJSON = {
  type: 'object',
  description: 'A font: a real family name plus an optional loader hint.',
  properties: {
    family: { type: 'string', description: "e.g. 'Oswald', 'Fraunces', 'Space Grotesk'" },
    source: { type: 'string', enum: ['google', 'fontsource', 'self'] },
    weights: { type: 'array', items: { type: 'number' } },
    axis: { type: 'string', description: "raw css2 axis query, e.g. 'Fraunces:opsz,wght@9..144,400..700'" },
  },
  required: ['family'],
} as const;

const mediaSlotSchemaJSON = {
  type: 'object',
  description: 'A media slot. url:null + a directive lets the host fulfil the image later.',
  properties: {
    url: { type: ['string', 'null'], description: 'A real url, or null to leave a themed placeholder.' },
    source: { type: 'string', enum: IMAGE_SOURCES as unknown as string[] },
    alt: { type: 'string' },
    directive: {
      type: 'object',
      properties: {
        op: { type: 'string', enum: ['generate', 'search', 'edit', 'upscale', 'removeBg', 'relight'] },
        prompt: { type: 'string' },
        from: { type: 'string' },
        aspect: { type: 'string', enum: ASPECTS as unknown as string[] },
      },
      required: ['op'],
    },
    frame: { type: 'string', enum: FRAME_KINDS as unknown as string[] },
  },
} as const;

export const PEEK_STUDIO_TOOLS: Anthropic.Tool[] = [
  {
    name: 'set_concept',
    description:
      'Author the design CONCEPT — the anti-generic lock. Call this FIRST/EARLY, before theming. The oneLiner must be specific enough to EXCLUDE things ("dad\'s 60th as a hardware-store work order", not "fun birthday"). boldMove names the single signature gesture the page is about. Replaces the whole concept; call again to refine.',
    input_schema: {
      type: 'object',
      properties: {
        oneLiner: { type: 'string', description: 'The concept in one breath — must exclude other pages.' },
        boldMove: { type: 'string', description: 'The single signature gesture, named.' },
        voice: { type: 'string', description: '3-ish adjectives, e.g. "gruff, dry, secretly tender".' },
        emotionalCore: { type: 'string', description: 'The feeling, not the facts.' },
        antiPattern: { type: 'string', description: 'The generic version being refused.' },
      },
      required: ['oneLiner', 'boldMove', 'voice', 'emotionalCore'],
    },
  },
  {
    name: 'set_theme',
    description:
      'Set the THEME as data (deep-merges, so partial updates refine). You MUST vary type.display per concept — never a default Fraunces+Inter. Set palette (mode + bg/surface/ink/muted/line/accent[+accent2]), scene, motifs (keep to 1–4), frame, radius {card,pill}, space {sectionY,gutter,stack}, motion {intensity, easings}. cssVars are --peek-* only and sanitized.',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'object',
          properties: {
            display: fontSpecSchemaJSON,
            body: fontSpecSchemaJSON,
            accent: fontSpecSchemaJSON,
            scaleRatio: { type: 'number', description: 'Hierarchy drama, 1.25–1.6.' },
            displayTracking: { type: 'string' },
            eyebrowTracking: { type: 'string' },
            displayCase: { type: 'string', enum: ['none', 'upper'] },
          },
        },
        palette: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['light', 'dark'] },
            bg: { type: 'string' }, surface: { type: 'string' }, ink: { type: 'string' },
            muted: { type: 'string' }, line: { type: 'string' },
            accent: { type: 'string' }, accent2: { type: 'string' },
            glow: { type: 'boolean' }, texture: { type: 'boolean' },
          },
        },
        scene: { type: 'string', enum: SCENE_KINDS as unknown as string[] },
        motifs: { type: 'array', items: { type: 'string', enum: MOTIF_KINDS as unknown as string[] } },
        frame: { type: 'string', enum: FRAME_KINDS as unknown as string[] },
        radius: {
          type: 'object',
          properties: { card: { type: 'number' }, pill: { type: 'number' } },
        },
        space: {
          type: 'object',
          properties: { sectionY: { type: 'number' }, gutter: { type: 'number' }, stack: { type: 'number' } },
        },
        motion: {
          type: 'object',
          properties: {
            intensity: { type: 'number', description: '0..1; gate ambient loops on this.' },
            easePanel: { type: 'string' },
            easeSheet: { type: 'string' },
          },
        },
        cssVars: { type: 'object', description: 'Raw --peek-* custom properties; sanitized server-side.' },
      },
    },
  },
  {
    name: 'upsert_section',
    description:
      'Add or patch an ordered SECTION. If id matches an existing section it is patched; else a new one is inserted (at position, else appended). Use the right kind and pass kind-specific data. custom { html } carries themed markup for a wild signature move (sanitized on apply) — reach for it when no archetype fits, not by reflex.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Omit to insert new; pass an existing id to patch.' },
        kind: { type: 'string', enum: SECTION_KINDS as unknown as string[] },
        title: { type: 'string' },
        data: {
          type: 'object',
          description:
            'Kind-specific. hero:{eyebrow?,headline,dek?,ledger?:[k,v][],media?}; note:{title?,sub?}; giftgrid:{intro?}; gallery:{title?,images?:MediaSlot[]}; details:{rows:[label,value][]}; steps:{steps:[num,label][]}; countdown:{target:ISODate,label?,doneText?}; claim:{label?,capacity?,cta?}; custom:{html,_why?}.',
        },
        media: mediaSlotSchemaJSON,
        position: { type: 'number', description: 'Insert index for a new section; ignored when patching.' },
      },
      required: ['kind'],
    },
  },
  {
    name: 'remove_section',
    description: 'Drop the section with this id from the page.',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'reorder_sections',
    description: 'Reorder the page sections to match this list of ids (front to back).',
    input_schema: {
      type: 'object',
      properties: { section_ids: { type: 'array', items: { type: 'string' } } },
      required: ['section_ids'],
    },
  },
  {
    name: 'set_note',
    description:
      "Set the personal note the recipient reads (markdown). Polish the curator's voice — never rewrite from scratch. A note section renders it.",
    input_schema: {
      type: 'object',
      properties: { note_md: { type: 'string' } },
      required: ['note_md'],
    },
  },
  {
    name: 'add_card',
    description:
      'Add one gift CARD (auto id, appended). Pick the type: product / activity / aspirational / digital. value_cents is for subtotal math; value_display is the human string the recipient reads (ranges / "—" / "priceless"). reveal_value defaults false. For variant bundles, call add_variant_group first and pass variant_group_id. media is a slot the host can fulfil. Don\'t ask permission for a card they just described — add it.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: CARD_TYPES as unknown as string[] },
        title: { type: 'string' },
        description: { type: 'string' },
        source_url: { type: 'string', description: 'Where the curator found it — hidden from recipient.' },
        source_retailer: { type: 'string', description: 'Retailer — hidden from recipient.' },
        value_cents: { type: 'integer' },
        value_display: { type: 'string', description: 'Human price string (ranges / "—" / "priceless").' },
        reveal_value: { type: 'boolean' },
        variant_group_id: { type: 'string' },
        proposed_date: { type: 'string', description: 'ISO datetime (activity cards).' },
        location_hint: { type: 'string', description: 'Free text location (activity cards).' },
        is_taunt: { type: 'boolean', description: 'Decorative "HA, DENIED" card.' },
        taunt_text: { type: 'string' },
        is_locked: { type: 'boolean' },
        unlock_rule: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: UNLOCK_KINDS as unknown as string[] },
            beg_prompt: { type: 'string' },
            unlock_after: { type: 'string', description: 'ISO datetime (date_after).' },
          },
        },
        media: mediaSlotSchemaJSON,
      },
      required: ['type', 'title'],
    },
  },
  {
    name: 'update_card',
    description: 'Patch an existing card by id. Only provided fields change.',
    input_schema: {
      type: 'object',
      properties: {
        card_id: { type: 'string' },
        type: { type: 'string', enum: CARD_TYPES as unknown as string[] },
        title: { type: 'string' },
        description: { type: 'string' },
        source_url: { type: 'string' },
        source_retailer: { type: 'string' },
        value_cents: { type: 'integer' },
        value_display: { type: 'string' },
        reveal_value: { type: 'boolean' },
        variant_group_id: { type: ['string', 'null'] },
        proposed_date: { type: 'string' },
        location_hint: { type: 'string' },
        is_taunt: { type: 'boolean' },
        taunt_text: { type: 'string' },
        is_locked: { type: 'boolean' },
        media: mediaSlotSchemaJSON,
      },
      required: ['card_id'],
    },
  },
  {
    name: 'set_card_rule',
    description:
      'Set the lock / unlock / reveal mechanic on a card — the "beg / unlock / off-limits-but-funny" move. unlock_rule.kind is beg (with a beg_prompt), date_after (with unlock_after), or event.',
    input_schema: {
      type: 'object',
      properties: {
        card_id: { type: 'string' },
        is_locked: { type: 'boolean' },
        unlock_rule: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: UNLOCK_KINDS as unknown as string[] },
            beg_prompt: { type: 'string' },
            unlock_after: { type: 'string' },
          },
        },
        reveal_value: { type: 'boolean' },
      },
      required: ['card_id'],
    },
  },
  {
    name: 'remove_card',
    description: 'Delete a card by id; remaining card positions re-pack contiguously.',
    input_schema: {
      type: 'object',
      properties: { card_id: { type: 'string' } },
      required: ['card_id'],
    },
  },
  {
    name: 'reorder_cards',
    description: 'Set card display order to match this list of card ids.',
    input_schema: {
      type: 'object',
      properties: { card_ids: { type: 'array', items: { type: 'string' } } },
      required: ['card_ids'],
    },
  },
  {
    name: 'add_variant_group',
    description:
      'Create a "pick N of these" bundle and get back a variant_group_id. Then call add_card N times with that id. selection is pick_one / pick_any / pick_all.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        selection: { type: 'string', enum: VARIANT_SELECTIONS as unknown as string[] },
      },
      required: ['title', 'selection'],
    },
  },
  {
    name: 'generate_hero_image',
    description:
      'Generate a custom hero image from a VIVID, specific prompt that honors the concept (not "birthday gift" — describe scene, palette, medium, mood). Sets peek.hero to an ai_generated media slot. Returns the url + provider.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Vivid, specific visual prompt.' },
        aspect: { type: 'string', enum: ASPECTS as unknown as string[] },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'set_hero_media',
    description:
      'Set the hero media directly — when the curator pastes a url / uploads a photo, or to leave a pending directive. Sets peek.hero to a media slot.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        source: { type: 'string', enum: IMAGE_SOURCES as unknown as string[] },
        directive: {
          type: 'object',
          properties: {
            op: { type: 'string', enum: ['generate', 'search', 'edit', 'upscale', 'removeBg', 'relight'] },
            prompt: { type: 'string' },
            from: { type: 'string' },
            aspect: { type: 'string', enum: ASPECTS as unknown as string[] },
          },
          required: ['op'],
        },
        alt: { type: 'string' },
        frame: { type: 'string', enum: FRAME_KINDS as unknown as string[] },
      },
    },
  },
  {
    name: 'resolve_card',
    description:
      'Resolve a gift from a pasted URL OR a fuzzy description ("a barrel cactus under $40 shipped to 90210") into product data via the resolver cascade. Returns { card, via }; then call add_card with the result. Use this whenever a url appears or the curator describes a specific buyable thing you need details for.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The curator\'s fuzzy ask OR a pasted URL.' },
        constraints: {
          type: 'object',
          properties: {
            maxPriceCents: { type: 'integer' },
            shipTo: { type: 'string' },
            sizeHint: { type: 'string' },
          },
        },
        images: { type: 'array', items: { type: 'string' }, description: 'Reference photo urls/data (vision).' },
        screenshot: { type: 'string', description: 'A screenshot of a URL page (vision-assisted scrape).' },
      },
      required: ['text'],
    },
  },
  {
    name: 'mark_ready',
    description:
      'Flag the draft ready → triggers the paywall / publish step. Call when the curator says "done" / "ready" / "publish it".',
    input_schema: { type: 'object', properties: {} },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. Zod input schemas (the reducer's strict gate). Permissive enough to accept
//    what the model sends; strict on shape. We coerce/default in the mutators.
// ─────────────────────────────────────────────────────────────────────────────
const zHex = z.string();
const zAspect = z.enum(ASPECTS);
const zFrame = z.enum(FRAME_KINDS);
const zImageSource = z.enum(IMAGE_SOURCES);
const zCardType = z.enum(CARD_TYPES);
const zVariantSelection = z.enum(VARIANT_SELECTIONS);
const zUnlockKind = z.enum(UNLOCK_KINDS);

const zFontSpec = z
  .object({
    family: z.string(),
    source: z.enum(['google', 'fontsource', 'self']).optional(),
    weights: z.array(z.number()).optional(),
    axis: z.string().optional(),
  })
  .passthrough();

const zMediaDirective = z
  .object({
    op: z.enum(['generate', 'search', 'edit', 'upscale', 'removeBg', 'relight']),
    prompt: z.string().optional(),
    from: z.string().optional(),
    aspect: zAspect.optional(),
  })
  .passthrough();

const zMediaSlotInput = z
  .object({
    url: z.string().nullable().optional(),
    source: zImageSource.optional(),
    alt: z.string().optional(),
    directive: zMediaDirective.optional(),
    frame: zFrame.optional(),
    status: z.enum(['pending', 'ready', 'flagged']).optional(),
  })
  .passthrough();

const zUnlockRule = z
  .object({
    kind: zUnlockKind,
    beg_prompt: z.string().optional(),
    unlock_after: z.string().optional(),
  })
  .passthrough();

const Inputs = {
  set_concept: z
    .object({
      oneLiner: z.string(),
      boldMove: z.string(),
      voice: z.string(),
      emotionalCore: z.string(),
      antiPattern: z.string().optional(),
    })
    .passthrough(),

  set_theme: z
    .object({
      type: z
        .object({
          display: zFontSpec.optional(),
          body: zFontSpec.optional(),
          accent: zFontSpec.optional(),
          scaleRatio: z.number().optional(),
          displayTracking: z.string().optional(),
          eyebrowTracking: z.string().optional(),
          displayCase: z.enum(['none', 'upper']).optional(),
        })
        .passthrough()
        .optional(),
      palette: z
        .object({
          mode: z.enum(['light', 'dark']).optional(),
          bg: zHex.optional(), surface: zHex.optional(), ink: zHex.optional(),
          muted: zHex.optional(), line: zHex.optional(),
          accent: zHex.optional(), accent2: zHex.optional(),
          glow: z.boolean().optional(), texture: z.boolean().optional(),
        })
        .passthrough()
        .optional(),
      scene: z.enum(SCENE_KINDS).optional(),
      motifs: z.array(z.enum(MOTIF_KINDS)).optional(),
      frame: zFrame.optional(),
      radius: z
        .union([
          z.number(),
          z.object({ card: z.number().optional(), pill: z.number().optional() }).passthrough(),
        ])
        .optional(),
      space: z
        .object({ sectionY: z.number().optional(), gutter: z.number().optional(), stack: z.number().optional() })
        .passthrough()
        .optional(),
      motion: z
        .object({
          intensity: z.number().optional(),
          easePanel: z.string().optional(),
          easeSheet: z.string().optional(),
          reduceMotionOK: z.literal(true).optional(),
        })
        .passthrough()
        .optional(),
      cssVars: z.record(z.string(), z.string()).optional(),
    })
    .passthrough(),

  upsert_section: z
    .object({
      id: z.string().optional(),
      kind: z.enum(SECTION_KINDS),
      title: z.string().optional(),
      data: z.record(z.string(), z.unknown()).optional(),
      media: zMediaSlotInput.optional(),
      position: z.number().optional(),
    })
    .passthrough(),

  remove_section: z.object({ id: z.string() }).passthrough(),
  reorder_sections: z.object({ section_ids: z.array(z.string()) }).passthrough(),
  set_note: z.object({ note_md: z.string() }).passthrough(),

  add_card: z
    .object({
      type: zCardType,
      title: z.string(),
      description: z.string().optional(),
      source_url: z.string().optional(),
      source_retailer: z.string().optional(),
      value_cents: z.number().optional(),
      value_display: z.string().optional(),
      reveal_value: z.boolean().optional(),
      variant_group_id: z.string().optional(),
      proposed_date: z.string().optional(),
      location_hint: z.string().optional(),
      is_taunt: z.boolean().optional(),
      taunt_text: z.string().optional(),
      is_locked: z.boolean().optional(),
      unlock_rule: zUnlockRule.optional(),
      media: zMediaSlotInput.optional(),
    })
    .passthrough(),

  update_card: z
    .object({
      card_id: z.string(),
      type: zCardType.optional(),
      title: z.string().optional(),
      description: z.string().nullable().optional(),
      source_url: z.string().nullable().optional(),
      source_retailer: z.string().nullable().optional(),
      value_cents: z.number().nullable().optional(),
      value_display: z.string().nullable().optional(),
      reveal_value: z.boolean().optional(),
      variant_group_id: z.string().nullable().optional(),
      proposed_date: z.string().nullable().optional(),
      location_hint: z.string().nullable().optional(),
      is_taunt: z.boolean().optional(),
      taunt_text: z.string().nullable().optional(),
      is_locked: z.boolean().optional(),
      media: zMediaSlotInput.nullable().optional(),
    })
    .passthrough(),

  set_card_rule: z
    .object({
      card_id: z.string(),
      is_locked: z.boolean().optional(),
      unlock_rule: zUnlockRule.optional(),
      reveal_value: z.boolean().optional(),
    })
    .passthrough(),

  remove_card: z.object({ card_id: z.string() }).passthrough(),
  reorder_cards: z.object({ card_ids: z.array(z.string()) }).passthrough(),
  add_variant_group: z.object({ title: z.string(), selection: zVariantSelection }).passthrough(),
  generate_hero_image: z.object({ prompt: z.string(), aspect: zAspect.optional() }).passthrough(),

  set_hero_media: z
    .object({
      url: z.string().optional(),
      source: zImageSource.optional(),
      directive: zMediaDirective.optional(),
      alt: z.string().optional(),
      frame: zFrame.optional(),
    })
    .passthrough(),

  resolve_card: z
    .object({
      text: z.string(),
      constraints: z
        .object({
          maxPriceCents: z.number().optional(),
          shipTo: z.string().optional(),
          sizeHint: z.string().optional(),
        })
        .passthrough()
        .optional(),
      images: z.array(z.string()).optional(),
      screenshot: z.string().optional(),
    })
    .passthrough(),

  mark_ready: z.object({}).passthrough(),
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: deterministic-but-unique ids (no external clock dependency for the
//   stub path's determinism — ids are derived from kind + current length).
// ─────────────────────────────────────────────────────────────────────────────
let _seq = 0;
function uid(prefix: string): string {
  // Combines a short time slice with a process-monotonic counter so two cards
  // added in the same tick never collide, while staying readable.
  _seq = (_seq + 1) % 0xffff;
  const t = Date.now().toString(36).slice(-6);
  return `${prefix}_${t}${_seq.toString(36).padStart(3, '0')}`;
}

function repackPositions<T extends { position: number }>(arr: T[]): T[] {
  return arr.map((x, i) => ({ ...x, position: i }));
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === null || patch === undefined) return base;
  if (Array.isArray(patch)) return patch as unknown as T; // arrays REPLACE (e.g. motifs)
  if (typeof patch !== 'object' || typeof base !== 'object' || base === null) return patch as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    const cur = (base as Record<string, unknown>)[k];
    out[k] = cur && typeof cur === 'object' && !Array.isArray(cur) && v && typeof v === 'object' && !Array.isArray(v)
      ? deepMerge(cur, v)
      : v;
  }
  return out as T;
}

// Map a ports CardData (resolver/search output) → add_card-shaped input.
function cardDataToCardInput(d: CardData): z.input<typeof Inputs.add_card> {
  const media: z.input<typeof zMediaSlotInput> | undefined = d.image_url
    ? { url: d.image_url, source: 'external', alt: d.title }
    : undefined;
  return {
    type: 'product',
    title: d.title,
    description: d.description,
    source_url: d.source_url,
    source_retailer: d.retailer,
    value_cents: d.value_cents,
    value_display: d.value_display,
    media,
  };
}

// Build a fully-defaulted Card from add_card input (INTERFACES §3 defaults:
//   reveal_value=false, flags=false, unlock_rule={}, nullables→null).
function buildCard(input: z.infer<typeof Inputs.add_card>, position: number): Card {
  const media: MediaSlot | null = input.media
    ? {
        url: input.media.url ?? null,
        source: input.media.source ?? (input.media.url ? 'external' : 'pending'),
        alt: input.media.alt,
        directive: input.media.directive as MediaSlot['directive'],
        frame: input.media.frame,
        status: input.media.status,
      }
    : null;

  const unlock: UnlockRule | Record<string, never> = input.unlock_rule
    ? { kind: input.unlock_rule.kind, beg_prompt: input.unlock_rule.beg_prompt, unlock_after: input.unlock_rule.unlock_after }
    : {};

  return {
    id: uid('card'),
    variant_group_id: input.variant_group_id ?? null,
    position,
    type: input.type as CardType,
    title: input.title,
    description: input.description ?? null,
    media,
    source_url: input.source_url ?? null,
    source_retailer: input.source_retailer ?? null,
    value_cents: input.value_cents ?? null,
    value_display: input.value_display ?? null,
    reveal_value: input.reveal_value ?? false,
    is_taunt: input.is_taunt ?? false,
    taunt_text: input.taunt_text ?? null,
    is_locked: input.is_locked ?? false,
    unlock_rule: unlock,
    proposed_date: input.proposed_date ?? null,
    location_hint: input.location_hint ?? null,
    metadata: {},
  };
}

// Clone the IR shallowly-deep enough for a pure mutation (arrays + nested objects
// we touch are re-created; the renderer treats each snapshot as immutable anyway).
function cloneIR(ir: PeekIR): PeekIR {
  return {
    ...ir,
    peek: { ...ir.peek, concept: { ...ir.peek.concept }, theme: { ...ir.peek.theme } },
    sections: ir.sections.map((s) => ({ ...s, data: { ...s.data } })),
    variant_groups: ir.variant_groups.map((g) => ({ ...g })),
    cards: ir.cards.map((c) => ({ ...c })),
  };
}

const fail = (error: string): ToolResult => ({ ok: false, error });

// Re-validate the whole IR and return the parsed (defaults-filled) canonical form,
// or reject. NEVER return an invalid IR.
function finalize(ir: PeekIR, result?: unknown): ToolResult {
  const v = validatePeekIR(ir);
  if (!v.ok) return fail(`mutation produced an invalid IR: ${v.error}`);
  return { ok: true, ir: v.value, result };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. reduceTool — the pure reducer. validate → mutate → re-validate → result.
//    Side effects ONLY via ports.* (image gen, resolve). Persistence is the
//    route's job (it owns the ToolContext + ports.persistence call).
// ─────────────────────────────────────────────────────────────────────────────
export async function reduceTool(
  ir: PeekIR,
  name: string,
  input: unknown,
  ctx: ToolContext,
): Promise<ToolResult> {
  void ctx; // ctx (peekId/curatorId) is carried for ports that need it later; reducer is pure on the IR.

  switch (name as PeekToolName) {
    // ── concept ────────────────────────────────────────────────────────────
    case 'set_concept': {
      const p = Inputs.set_concept.safeParse(input);
      if (!p.success) return fail(`set_concept: ${z.prettifyError(p.error)}`);
      const next = cloneIR(ir);
      next.peek.concept = {
        oneLiner: p.data.oneLiner,
        boldMove: p.data.boldMove,
        voice: p.data.voice,
        emotionalCore: p.data.emotionalCore,
        antiPattern: p.data.antiPattern,
      };
      return finalize(next, { concept: next.peek.concept });
    }

    // ── theme ──────────────────────────────────────────────────────────────
    case 'set_theme': {
      const p = Inputs.set_theme.safeParse(input);
      if (!p.success) return fail(`set_theme: ${z.prettifyError(p.error)}`);
      const next = cloneIR(ir);
      const { cssVars, radius, ...rest } = p.data;
      let theme = deepMerge(next.peek.theme, rest);
      if (radius !== undefined) {
        const r = typeof radius === 'number' ? { card: radius, pill: radius } : radius;
        theme = { ...theme, radius: { ...theme.radius, ...r } };
      }
      if (cssVars) {
        theme = { ...theme, cssVars: { ...(theme.cssVars ?? {}), ...sanitizeCssVars(cssVars) } };
      }
      next.peek.theme = theme;
      return finalize(next, { theme: next.peek.theme });
    }

    // ── sections ─────────────────────────────────────────────────────────────
    case 'upsert_section': {
      const p = Inputs.upsert_section.safeParse(input);
      if (!p.success) return fail(`upsert_section: ${z.prettifyError(p.error)}`);
      const next = cloneIR(ir);
      const data = sanitizeSectionData(p.data.kind, p.data.data ?? {});
      const media = p.data.media ? toMediaSlot(p.data.media) : undefined;

      const existingIdx = p.data.id ? next.sections.findIndex((s) => s.id === p.data.id) : -1;
      if (existingIdx >= 0) {
        const cur = next.sections[existingIdx];
        const patched: Section = {
          ...cur,
          kind: p.data.kind as SectionKind,
          title: p.data.title ?? cur.title,
          data: { ...cur.data, ...data },
          media: media ?? cur.media,
        };
        next.sections[existingIdx] = patched;
        return finalize(next, { id: patched.id, patched: true });
      }

      const section: Section = {
        id: p.data.id ?? uid('sec'),
        kind: p.data.kind as SectionKind,
        title: p.data.title,
        data,
        media,
      };
      const pos = p.data.position;
      if (typeof pos === 'number' && pos >= 0 && pos < next.sections.length) {
        next.sections.splice(pos, 0, section);
      } else {
        next.sections.push(section);
      }
      return finalize(next, { id: section.id, inserted: true });
    }

    case 'remove_section': {
      const p = Inputs.remove_section.safeParse(input);
      if (!p.success) return fail(`remove_section: ${z.prettifyError(p.error)}`);
      const next = cloneIR(ir);
      const before = next.sections.length;
      next.sections = next.sections.filter((s) => s.id !== p.data.id);
      if (next.sections.length === before) return fail(`no section with id ${p.data.id}`);
      return finalize(next, { removed: p.data.id });
    }

    case 'reorder_sections': {
      const p = Inputs.reorder_sections.safeParse(input);
      if (!p.success) return fail(`reorder_sections: ${z.prettifyError(p.error)}`);
      const next = cloneIR(ir);
      next.sections = reorderById(next.sections, p.data.section_ids);
      return finalize(next, { order: next.sections.map((s) => s.id) });
    }

    // ── note ─────────────────────────────────────────────────────────────────
    case 'set_note': {
      const p = Inputs.set_note.safeParse(input);
      if (!p.success) return fail(`set_note: ${z.prettifyError(p.error)}`);
      const next = cloneIR(ir);
      next.peek.note_md = p.data.note_md;
      // Ensure a note section exists so the renderer surfaces it.
      if (!next.sections.some((s) => s.kind === 'note')) {
        next.sections.push({ id: uid('sec'), kind: 'note', data: {} });
      }
      return finalize(next, { note_set: true });
    }

    // ── cards ──────────────────────────────────────────────────────────────
    case 'add_card': {
      const p = Inputs.add_card.safeParse(input);
      if (!p.success) return fail(`add_card: ${z.prettifyError(p.error)}`);
      const next = cloneIR(ir);
      if (p.data.variant_group_id && !next.variant_groups.some((g) => g.id === p.data.variant_group_id)) {
        return fail(`add_card: no variant_group with id ${p.data.variant_group_id}`);
      }
      const card = buildCard(p.data, next.cards.length);
      next.cards.push(card);
      // Make sure a giftgrid section exists to render the cards.
      if (!next.sections.some((s) => s.kind === 'giftgrid')) {
        next.sections.push({ id: uid('sec'), kind: 'giftgrid', data: {} });
      }
      return finalize(next, { card_id: card.id, count: next.cards.length });
    }

    case 'update_card': {
      const p = Inputs.update_card.safeParse(input);
      if (!p.success) return fail(`update_card: ${z.prettifyError(p.error)}`);
      const next = cloneIR(ir);
      const idx = next.cards.findIndex((c) => c.id === p.data.card_id);
      if (idx < 0) return fail(`no card with id ${p.data.card_id}`);
      const cur = next.cards[idx];
      const { card_id, media, ...patch } = p.data;
      const merged = { ...cur } as unknown as Record<string, unknown>;
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) continue;
        merged[k] = v;
      }
      if (media !== undefined) merged.media = media ? toMediaSlot(media) : null;
      next.cards[idx] = merged as unknown as Card;
      return finalize(next, { card_id });
    }

    case 'set_card_rule': {
      const p = Inputs.set_card_rule.safeParse(input);
      if (!p.success) return fail(`set_card_rule: ${z.prettifyError(p.error)}`);
      const next = cloneIR(ir);
      const idx = next.cards.findIndex((c) => c.id === p.data.card_id);
      if (idx < 0) return fail(`no card with id ${p.data.card_id}`);
      const card = { ...next.cards[idx] };
      if (typeof p.data.is_locked === 'boolean') card.is_locked = p.data.is_locked;
      if (typeof p.data.reveal_value === 'boolean') card.reveal_value = p.data.reveal_value;
      if (p.data.unlock_rule) {
        card.unlock_rule = {
          kind: p.data.unlock_rule.kind,
          beg_prompt: p.data.unlock_rule.beg_prompt,
          unlock_after: p.data.unlock_rule.unlock_after,
        };
        // A real unlock rule implies the card is gated.
        if (typeof p.data.is_locked !== 'boolean') card.is_locked = true;
      }
      next.cards[idx] = card;
      return finalize(next, { card_id: card.id, locked: card.is_locked });
    }

    case 'remove_card': {
      const p = Inputs.remove_card.safeParse(input);
      if (!p.success) return fail(`remove_card: ${z.prettifyError(p.error)}`);
      const next = cloneIR(ir);
      const before = next.cards.length;
      next.cards = repackPositions(next.cards.filter((c) => c.id !== p.data.card_id));
      if (next.cards.length === before) return fail(`no card with id ${p.data.card_id}`);
      return finalize(next, { removed: p.data.card_id, count: next.cards.length });
    }

    case 'reorder_cards': {
      const p = Inputs.reorder_cards.safeParse(input);
      if (!p.success) return fail(`reorder_cards: ${z.prettifyError(p.error)}`);
      const next = cloneIR(ir);
      next.cards = repackPositions(reorderById(next.cards, p.data.card_ids));
      return finalize(next, { order: next.cards.map((c) => c.id) });
    }

    case 'add_variant_group': {
      const p = Inputs.add_variant_group.safeParse(input);
      if (!p.success) return fail(`add_variant_group: ${z.prettifyError(p.error)}`);
      const next = cloneIR(ir);
      const group: VariantGroup = {
        id: uid('vg'),
        title: p.data.title,
        selection: p.data.selection as VariantSelection,
      };
      next.variant_groups.push(group);
      return finalize(next, { variant_group_id: group.id });
    }

    // ── media (side-effecting via ports.image) ───────────────────────────────
    case 'generate_hero_image': {
      const p = Inputs.generate_hero_image.safeParse(input);
      if (!p.success) return fail(`generate_hero_image: ${z.prettifyError(p.error)}`);
      const gen = await ports.image.generate({ prompt: p.data.prompt, aspect: p.data.aspect });
      if (!gen.ok) return fail(`generate_hero_image: ${gen.error}`);
      const next = cloneIR(ir);
      next.peek.hero = {
        url: gen.url,
        source: 'ai_generated',
        alt: p.data.prompt.slice(0, 140),
        directive: { op: 'generate', prompt: p.data.prompt, aspect: p.data.aspect },
        status: 'ready',
      };
      return finalize(next, { url: gen.url, provider: gen.provider });
    }

    case 'set_hero_media': {
      const p = Inputs.set_hero_media.safeParse(input);
      if (!p.success) return fail(`set_hero_media: ${z.prettifyError(p.error)}`);
      const next = cloneIR(ir);
      const source = p.data.source ?? (p.data.url ? 'external' : 'pending');
      next.peek.hero = {
        url: p.data.url ?? null,
        source,
        alt: p.data.alt,
        directive: p.data.directive as MediaSlot['directive'],
        frame: p.data.frame,
      };
      return finalize(next, { hero_set: true });
    }

    // ── resolve (side-effecting via ports.cardResolver) ──────────────────────
    case 'resolve_card': {
      const p = Inputs.resolve_card.safeParse(input);
      if (!p.success) return fail(`resolve_card: ${z.prettifyError(p.error)}`);
      const r = await ports.cardResolver.resolve({
        text: p.data.text,
        constraints: p.data.constraints,
        images: p.data.images,
        screenshot: p.data.screenshot,
      });
      if (!r.ok) return fail(`resolve_card: ${r.error}`);
      // The reducer resolves AND applies — append the card so the preview moves
      // immediately. The model still learns the card id + via from the result.
      const next = cloneIR(ir);
      const cardInput = Inputs.add_card.parse(cardDataToCardInput(r.card));
      const card = buildCard(cardInput, next.cards.length);
      next.cards.push(card);
      if (!next.sections.some((s) => s.kind === 'giftgrid')) {
        next.sections.push({ id: uid('sec'), kind: 'giftgrid', data: {} });
      }
      return finalize(next, { card_id: card.id, via: r.via, card: r.card });
    }

    // ── lifecycle ────────────────────────────────────────────────────────────
    case 'mark_ready': {
      const parsed = Inputs.mark_ready.safeParse(input ?? {});
      if (!parsed.success) return fail(`mark_ready: ${z.prettifyError(parsed.error)}`);
      // No IR field beyond status intent — emits an event; the route handles the
      // paywall trigger. We return the unchanged (re-validated) IR.
      return finalize(cloneIR(ir), { ready: true, next_step: 'paywall' });
    }

    default:
      return fail(`unknown tool: ${name}`);
  }
}

// ── section/media helpers ──────────────────────────────────────────────────────
function toMediaSlot(m: z.infer<typeof zMediaSlotInput>): MediaSlot {
  return {
    url: m.url ?? null,
    source: m.source ?? (m.url ? 'external' : 'pending'),
    alt: m.alt,
    directive: m.directive as MediaSlot['directive'],
    frame: m.frame,
    status: m.status,
  };
}

// Sanitize section data per kind: custom.html → sanitizeCustomHtml; also sanitize
// any nested media slots in gallery images / hero media so url:null placeholders
// stay coherent. Unknown keys pass through (forward-compat).
function sanitizeSectionData(kind: SectionKind, data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...data };
  if (kind === 'custom' && typeof out.html === 'string') {
    out.html = sanitizeCustomHtml(out.html);
  }
  if (out.media && typeof out.media === 'object') {
    const m = zMediaSlotInput.safeParse(out.media);
    if (m.success) out.media = toMediaSlot(m.data);
  }
  if (Array.isArray(out.images)) {
    out.images = out.images.map((img) => {
      const m = zMediaSlotInput.safeParse(img);
      return m.success ? toMediaSlot(m.data) : img;
    });
  }
  return out;
}

// Reorder an array of {id} by an explicit id list; ids not in the list keep their
// relative order and are appended (never silently dropped).
function reorderById<T extends { id: string }>(arr: T[], ids: string[]): T[] {
  const byId = new Map(arr.map((x) => [x.id, x]));
  const seen = new Set<string>();
  const out: T[] = [];
  for (const id of ids) {
    const x = byId.get(id);
    if (x && !seen.has(id)) { out.push(x); seen.add(id); }
  }
  for (const x of arr) if (!seen.has(x.id)) out.push(x);
  return out;
}
