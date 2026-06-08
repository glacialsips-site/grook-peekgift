import { z } from "zod";
import { ok, err } from "neverthrow";
import type { Result } from "neverthrow";
import { coreError, type CoreError } from "../result";
import { validatePeekIR } from "../document/schema";
import type { PeekIR, Concept, MediaSlot, Section, VariantGroup, Card } from "../document/contract";
import type { PeekEvent } from "./events";
import { apply } from "./apply";
import type { Command } from "./schema";
import {
  Inputs,
  deepMerge,
  filterCssVars,
  toMediaSlot,
  buildCard,
  normalizeSectionData,
} from "./inputs";

export interface DecideCtx {
  newId: (prefix: string) => string;
}

export function counterCtx(start = 0): DecideCtx {
  let n = start;
  return { newId: (p) => `${p}_${(++n).toString(36)}` };
}

export function defaultCtx(): DecideCtx {
  let n = 0;
  return {
    newId: (p) => {
      n = (n + 1) % 0xffff;
      const t = Date.now().toString(36).slice(-6);
      return `${p}_${t}${n.toString(36).padStart(3, "0")}`;
    },
  };
}

const zfail = (name: string, e: z.ZodError): Result<PeekEvent[], CoreError> =>
  err(coreError("VALIDATION", `${name}: ${z.prettifyError(e)}`));
const inv = (msg: string): Result<PeekEvent[], CoreError> => err(coreError("INVARIANT", msg));
const missing = (msg: string): Result<PeekEvent[], CoreError> => err(coreError("NOT_FOUND", msg));

function buildEvents(doc: PeekIR, cmd: Command, ctx: DecideCtx): Result<PeekEvent[], CoreError> {
  switch (cmd.type) {
    case "set_concept": {
      const p = Inputs.set_concept.safeParse(cmd.payload);
      if (!p.success) return zfail("set_concept", p.error);
      const concept: Concept = {
        oneLiner: p.data.oneLiner,
        boldMove: p.data.boldMove,
        voice: p.data.voice,
        emotionalCore: p.data.emotionalCore,
        ...(p.data.antiPattern !== undefined ? { antiPattern: p.data.antiPattern } : {}),
      };
      return ok([{ type: "concept_set", concept }]);
    }

    case "set_theme": {
      const p = Inputs.set_theme.safeParse(cmd.payload);
      if (!p.success) return zfail("set_theme", p.error);
      const { radius, cssVars, ...rest } = p.data;
      let theme = deepMerge(doc.peek.theme, rest);
      if (radius !== undefined) {
        const r = typeof radius === "number" ? { card: radius, pill: radius } : radius;
        theme = { ...theme, radius: { ...theme.radius, ...r } };
      }
      if (cssVars) {
        theme = { ...theme, cssVars: { ...(theme.cssVars ?? {}), ...filterCssVars(cssVars) } };
      }
      return ok([{ type: "theme_set", theme }]);
    }

    case "upsert_section": {
      const p = Inputs.upsert_section.safeParse(cmd.payload);
      if (!p.success) return zfail("upsert_section", p.error);
      const data = normalizeSectionData(p.data.data);
      const media = p.data.media ? toMediaSlot(p.data.media) : undefined;
      const existing = p.data.id ? doc.sections.find((s) => s.id === p.data.id) : undefined;
      if (existing) {
        const patched: Section = {
          ...existing,
          kind: p.data.kind,
          title: p.data.title ?? existing.title,
          data: { ...existing.data, ...data },
          media: media ?? existing.media,
        };
        return ok([{ type: "section_patched", id: existing.id, section: patched }]);
      }
      const section: Section = {
        id: p.data.id ?? ctx.newId("sec"),
        kind: p.data.kind,
        title: p.data.title,
        data,
        media,
      };
      const pos = p.data.position;
      const index =
        typeof pos === "number" && pos >= 0 && pos < doc.sections.length ? pos : doc.sections.length;
      return ok([{ type: "section_inserted", section, index }]);
    }

    case "remove_section": {
      const p = Inputs.remove_section.safeParse(cmd.payload);
      if (!p.success) return zfail("remove_section", p.error);
      if (!doc.sections.some((s) => s.id === p.data.id)) return missing(`no section with id ${p.data.id}`);
      return ok([{ type: "section_removed", id: p.data.id }]);
    }

    case "reorder_sections": {
      const p = Inputs.reorder_sections.safeParse(cmd.payload);
      if (!p.success) return zfail("reorder_sections", p.error);
      return ok([{ type: "sections_reordered", order: p.data.section_ids }]);
    }

    case "set_note": {
      const p = Inputs.set_note.safeParse(cmd.payload);
      if (!p.success) return zfail("set_note", p.error);
      const events: PeekEvent[] = [{ type: "note_set", note_md: p.data.note_md }];
      if (!doc.sections.some((s) => s.kind === "note")) {
        events.push({
          type: "section_inserted",
          section: { id: ctx.newId("sec"), kind: "note", data: {} },
          index: doc.sections.length,
        });
      }
      return ok(events);
    }

    case "add_card": {
      const p = Inputs.add_card.safeParse(cmd.payload);
      if (!p.success) return zfail("add_card", p.error);
      if (p.data.variant_group_id && !doc.variant_groups.some((g) => g.id === p.data.variant_group_id)) {
        return missing(`no variant_group with id ${p.data.variant_group_id}`);
      }
      if (typeof p.data.value_cents === "number" && p.data.value_cents < 0) {
        return inv("add_card: value_cents must be >= 0");
      }
      const card = buildCard(p.data, ctx.newId("card"), doc.cards.length);
      const events: PeekEvent[] = [{ type: "card_added", card }];
      if (!doc.sections.some((s) => s.kind === "giftgrid")) {
        events.push({
          type: "section_inserted",
          section: { id: ctx.newId("sec"), kind: "giftgrid", data: {} },
          index: doc.sections.length,
        });
      }
      return ok(events);
    }

    case "update_card": {
      const p = Inputs.update_card.safeParse(cmd.payload);
      if (!p.success) return zfail("update_card", p.error);
      const cur = doc.cards.find((c) => c.id === p.data.card_id);
      if (!cur) return missing(`no card with id ${p.data.card_id}`);
      if (typeof p.data.value_cents === "number" && p.data.value_cents < 0) {
        return inv("update_card: value_cents must be >= 0");
      }
      const { card_id, media, ...patch } = p.data;
      void card_id;
      const merged: Record<string, unknown> = { ...cur };
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) continue;
        merged[k] = v;
      }
      if (media !== undefined) merged.media = media ? toMediaSlot(media) : null;
      return ok([{ type: "card_updated", card: merged as unknown as Card }]);
    }

    case "set_card_rule": {
      const p = Inputs.set_card_rule.safeParse(cmd.payload);
      if (!p.success) return zfail("set_card_rule", p.error);
      const cur = doc.cards.find((c) => c.id === p.data.card_id);
      if (!cur) return missing(`no card with id ${p.data.card_id}`);
      const card: Card = { ...cur };
      if (typeof p.data.is_locked === "boolean") card.is_locked = p.data.is_locked;
      if (typeof p.data.reveal_value === "boolean") card.reveal_value = p.data.reveal_value;
      if (p.data.unlock_rule) {
        card.unlock_rule = {
          kind: p.data.unlock_rule.kind,
          beg_prompt: p.data.unlock_rule.beg_prompt,
          unlock_after: p.data.unlock_rule.unlock_after,
        };
        if (typeof p.data.is_locked !== "boolean") card.is_locked = true;
      }
      return ok([{ type: "card_rule_set", card }]);
    }

    case "remove_card": {
      const p = Inputs.remove_card.safeParse(cmd.payload);
      if (!p.success) return zfail("remove_card", p.error);
      if (!doc.cards.some((c) => c.id === p.data.card_id)) return missing(`no card with id ${p.data.card_id}`);
      return ok([{ type: "card_removed", id: p.data.card_id }]);
    }

    case "reorder_cards": {
      const p = Inputs.reorder_cards.safeParse(cmd.payload);
      if (!p.success) return zfail("reorder_cards", p.error);
      return ok([{ type: "cards_reordered", order: p.data.card_ids }]);
    }

    case "add_variant_group": {
      const p = Inputs.add_variant_group.safeParse(cmd.payload);
      if (!p.success) return zfail("add_variant_group", p.error);
      const group: VariantGroup = {
        id: ctx.newId("vg"),
        title: p.data.title,
        selection: p.data.selection,
      };
      return ok([{ type: "variant_group_added", group }]);
    }

    case "generate_hero_image": {
      const p = Inputs.generate_hero_image.safeParse(cmd.payload);
      if (!p.success) return zfail("generate_hero_image", p.error);
      const hero: MediaSlot = {
        url: null,
        source: "ai_generated",
        alt: p.data.prompt.slice(0, 140),
        directive: { op: "generate", prompt: p.data.prompt, aspect: p.data.aspect },
        status: "pending",
      };
      return ok([{ type: "hero_set", hero }]);
    }

    case "set_hero_media": {
      const p = Inputs.set_hero_media.safeParse(cmd.payload);
      if (!p.success) return zfail("set_hero_media", p.error);
      const hero: MediaSlot = {
        url: p.data.url ?? null,
        source: p.data.source ?? (p.data.url ? "external" : "pending"),
        alt: p.data.alt,
        directive: p.data.directive as MediaSlot["directive"],
        frame: p.data.frame,
      };
      return ok([{ type: "hero_set", hero }]);
    }

    case "mark_ready": {
      if (doc.peek.concept.oneLiner.trim() === "") return inv("mark_ready: the concept is empty");
      if (doc.cards.length < 1) return inv("mark_ready: a page needs at least one card");
      return ok([{ type: "ready_marked" }]);
    }

    default: {
      const _exhaustive: never = cmd;
      void _exhaustive;
      return err(coreError("VALIDATION", "unknown command"));
    }
  }
}

export function decide(
  doc: PeekIR,
  cmd: Command,
  ctx: DecideCtx = defaultCtx(),
): Result<PeekEvent[], CoreError> {
  return buildEvents(doc, cmd, ctx).andThen((events) => {
    const candidate = events.reduce((d, e) => apply(d, e), doc);
    const v = validatePeekIR(candidate);
    if (!v.ok) return err(coreError("INVARIANT", `command produced an invalid document: ${v.error}`));
    return ok(events);
  });
}

export function execute(
  doc: PeekIR,
  cmd: Command,
  ctx: DecideCtx = defaultCtx(),
): Result<{ events: PeekEvent[]; doc: PeekIR }, CoreError> {
  return decide(doc, cmd, ctx).map((events) => {
    const folded = events.reduce((d, e) => apply(d, e), doc);
    const v = validatePeekIR(folded);
    return { events, doc: v.ok ? v.value : folded };
  });
}
