import { z } from "zod";
import { ok, err } from "neverthrow";
import type { Result } from "neverthrow";
import { coreError, type CoreError } from "../result";
import { Inputs } from "./inputs";

// Command = a validated intent the chat emits. The discriminant is the top-level
// `type`; the tool input rides in `payload` (nested so a payload's own `type` field —
// theme's TypeSystem, a card's CardType — never collides with the discriminant).
export const COMMAND_TYPES = [
  "set_concept",
  "set_theme",
  "upsert_section",
  "remove_section",
  "reorder_sections",
  "set_note",
  "add_card",
  "update_card",
  "set_card_rule",
  "remove_card",
  "reorder_cards",
  "add_variant_group",
  "generate_hero_image",
  "set_hero_media",
  "mark_ready",
] as const;
export type CommandType = (typeof COMMAND_TYPES)[number];

export type Command =
  | { type: "set_concept"; payload: z.infer<typeof Inputs.set_concept> }
  | { type: "set_theme"; payload: z.infer<typeof Inputs.set_theme> }
  | { type: "upsert_section"; payload: z.infer<typeof Inputs.upsert_section> }
  | { type: "remove_section"; payload: z.infer<typeof Inputs.remove_section> }
  | { type: "reorder_sections"; payload: z.infer<typeof Inputs.reorder_sections> }
  | { type: "set_note"; payload: z.infer<typeof Inputs.set_note> }
  | { type: "add_card"; payload: z.infer<typeof Inputs.add_card> }
  | { type: "update_card"; payload: z.infer<typeof Inputs.update_card> }
  | { type: "set_card_rule"; payload: z.infer<typeof Inputs.set_card_rule> }
  | { type: "remove_card"; payload: z.infer<typeof Inputs.remove_card> }
  | { type: "reorder_cards"; payload: z.infer<typeof Inputs.reorder_cards> }
  | { type: "add_variant_group"; payload: z.infer<typeof Inputs.add_variant_group> }
  | { type: "generate_hero_image"; payload: z.infer<typeof Inputs.generate_hero_image> }
  | { type: "set_hero_media"; payload: z.infer<typeof Inputs.set_hero_media> }
  | { type: "mark_ready"; payload?: Record<string, never> };

const InputByType = Inputs as unknown as Record<CommandType, z.ZodType>;

function isCommandType(t: unknown): t is CommandType {
  return typeof t === "string" && (COMMAND_TYPES as readonly string[]).includes(t);
}

/** Validate an unknown `{ type, payload }` into a typed Command, or a typed error. */
export function parseCommand(raw: unknown): Result<Command, CoreError> {
  if (!raw || typeof raw !== "object") {
    return err(coreError("VALIDATION", "command must be an object"));
  }
  const type = (raw as { type?: unknown }).type;
  if (!isCommandType(type)) {
    return err(coreError("VALIDATION", `unknown command type: ${String(type)}`));
  }
  const payload = (raw as { payload?: unknown }).payload ?? {};
  const parsed = InputByType[type].safeParse(payload);
  if (!parsed.success) {
    return err(coreError("VALIDATION", `${type}: ${z.prettifyError(parsed.error)}`));
  }
  return ok({ type, payload: parsed.data } as Command);
}

/**
 * Map a chat tool call to a Command. `resolve_card` is intentionally NOT a core
 * command — it is app orchestration: resolve via ports.cardResolver, then issue an
 * `add_card` with the result.
 */
export function commandFromTool(name: string, input: unknown): Result<Command, CoreError> {
  if (name === "resolve_card") {
    return err(
      coreError(
        "VALIDATION",
        "resolve_card is orchestration: resolve via the cardResolver port, then issue add_card",
      ),
    );
  }
  return parseCommand({ type: name, payload: input });
}
