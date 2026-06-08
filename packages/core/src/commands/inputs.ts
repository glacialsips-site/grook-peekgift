import { z } from "zod";
import {
  CardTypeSchema,
  VariantSelectionSchema,
  SceneKindSchema,
  MotifKindSchema,
  FrameKindSchema,
  SectionKindSchema,
  AspectSchema,
  ImageSourceSchema,
  FontSpecSchema,
  MediaDirectiveSchema,
  UnlockRuleSchema,
} from "../document/schema";
import type { Card, CardType, MediaSlot, UnlockRule } from "../document/contract";

const zHex = z.string();

export const zMediaSlotInput = z
  .object({
    url: z.string().nullable().optional(),
    source: ImageSourceSchema.optional(),
    alt: z.string().optional(),
    directive: MediaDirectiveSchema.optional(),
    frame: FrameKindSchema.optional(),
    status: z.enum(["pending", "ready", "flagged"]).optional(),
  })
  .passthrough();

const zUnlockRuleInput = z
  .object({
    kind: z.enum(["beg", "date_after", "event"]),
    beg_prompt: z.string().optional(),
    unlock_after: z.string().optional(),
  })
  .passthrough();

export const Inputs = {
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
          display: FontSpecSchema.optional(),
          body: FontSpecSchema.optional(),
          accent: FontSpecSchema.optional(),
          scaleRatio: z.number().optional(),
          displayTracking: z.string().optional(),
          eyebrowTracking: z.string().optional(),
          displayCase: z.enum(["none", "upper"]).optional(),
        })
        .passthrough()
        .optional(),
      palette: z
        .object({
          mode: z.enum(["light", "dark"]).optional(),
          bg: zHex.optional(),
          surface: zHex.optional(),
          ink: zHex.optional(),
          muted: zHex.optional(),
          line: zHex.optional(),
          accent: zHex.optional(),
          accent2: zHex.optional(),
          glow: z.boolean().optional(),
          texture: z.boolean().optional(),
        })
        .passthrough()
        .optional(),
      scene: SceneKindSchema.optional(),
      motifs: z.array(MotifKindSchema).optional(),
      frame: FrameKindSchema.optional(),
      radius: z
        .union([
          z.number(),
          z.object({ card: z.number().optional(), pill: z.number().optional() }).passthrough(),
        ])
        .optional(),
      space: z
        .object({
          sectionY: z.number().optional(),
          gutter: z.number().optional(),
          stack: z.number().optional(),
        })
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
      loud: z
        .object({
          displayShadow: z.string().optional(),
          cardShadow: z
            .object({
              x: z.number(),
              y: z.number(),
              blur: z.number().optional(),
              spread: z.number().optional(),
              color: z.string().optional(),
            })
            .passthrough()
            .optional(),
          borderWeight: z.number().optional(),
          textureStrength: z.number().optional(),
        })
        .passthrough()
        .optional(),
      cssVars: z.record(z.string(), z.string()).optional(),
    })
    .passthrough(),

  upsert_section: z
    .object({
      id: z.string().optional(),
      kind: SectionKindSchema,
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
      type: CardTypeSchema,
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
      unlock_rule: zUnlockRuleInput.optional(),
      media: zMediaSlotInput.optional(),
    })
    .passthrough(),

  update_card: z
    .object({
      card_id: z.string(),
      type: CardTypeSchema.optional(),
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
      unlock_rule: zUnlockRuleInput.optional(),
      reveal_value: z.boolean().optional(),
    })
    .passthrough(),

  remove_card: z.object({ card_id: z.string() }).passthrough(),
  reorder_cards: z.object({ card_ids: z.array(z.string()) }).passthrough(),
  add_variant_group: z
    .object({ title: z.string(), selection: VariantSelectionSchema })
    .passthrough(),
  generate_hero_image: z
    .object({ prompt: z.string(), aspect: AspectSchema.optional() })
    .passthrough(),

  set_hero_media: z
    .object({
      url: z.string().optional(),
      source: ImageSourceSchema.optional(),
      directive: MediaDirectiveSchema.optional(),
      alt: z.string().optional(),
      frame: FrameKindSchema.optional(),
    })
    .passthrough(),

  mark_ready: z.object({}).passthrough(),
} as const;

export type AddCardInput = z.infer<typeof Inputs.add_card>;

export function repackPositions<T extends { position: number }>(arr: readonly T[]): T[] {
  return arr.map((x, i) => ({ ...x, position: i }));
}

export function reorderById<T extends { id: string }>(arr: readonly T[], ids: readonly string[]): T[] {
  const byId = new Map(arr.map((x) => [x.id, x]));
  const seen = new Set<string>();
  const out: T[] = [];
  for (const id of ids) {
    const x = byId.get(id);
    if (x && !seen.has(id)) {
      out.push(x);
      seen.add(id);
    }
  }
  for (const x of arr) if (!seen.has(x.id)) out.push(x);
  return out;
}

export function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === null || patch === undefined) return base;
  if (Array.isArray(patch)) return patch as unknown as T;
  if (typeof patch !== "object" || typeof base !== "object" || base === null) return patch as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    const cur = (base as Record<string, unknown>)[k];
    out[k] =
      cur && typeof cur === "object" && !Array.isArray(cur) && v && typeof v === "object" && !Array.isArray(v)
        ? deepMerge(cur, v)
        : v;
  }
  return out as T;
}

export function filterCssVars(vars?: Record<string, string>): Record<string, string> {
  if (!vars) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) {
    if (!k.startsWith("--peek-")) continue;
    if (typeof v !== "string") continue;
    const lo = v.toLowerCase();
    if (lo.includes("javascript:") || lo.includes("expression(") || lo.includes("</")) continue;
    out[k] = v;
  }
  return out;
}

export function toMediaSlot(m: z.infer<typeof zMediaSlotInput>): MediaSlot {
  return {
    url: m.url ?? null,
    source: m.source ?? (m.url ? "external" : "pending"),
    alt: m.alt,
    directive: m.directive as MediaSlot["directive"],
    frame: m.frame,
    status: m.status,
  };
}

export function normalizeSectionData(data?: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(data ?? {}) };
  if (out.media && typeof out.media === "object") {
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

export function buildCard(input: AddCardInput, id: string, position: number): Card {
  const media: MediaSlot | null = input.media
    ? {
        url: input.media.url ?? null,
        source: input.media.source ?? (input.media.url ? "external" : "pending"),
        alt: input.media.alt,
        directive: input.media.directive as MediaSlot["directive"],
        frame: input.media.frame,
        status: input.media.status,
      }
    : null;

  const unlock: UnlockRule | Record<string, never> = input.unlock_rule
    ? {
        kind: input.unlock_rule.kind,
        beg_prompt: input.unlock_rule.beg_prompt,
        unlock_after: input.unlock_rule.unlock_after,
      }
    : {};

  return {
    id,
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
