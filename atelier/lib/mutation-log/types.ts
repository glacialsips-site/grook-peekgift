/**
 * Canonical mutation-log domain types. Pure type + const only (zero runtime
 * imports) so both the Drizzle schema (`db/schema/peek-mutation-log.ts`) and the
 * edge-safe helpers can consume it without dragging in `pg-core` or `node:`.
 *
 * Source of truth: curator-tools spec §6 (`_packets/LIEUTENANT/_research/
 * curator-tools/REPORT.md`). The 21 verbs below are exactly the spec's
 * `MutationVerb` enum. The 22nd canonical tool, `get_page_summary` (F1), is
 * read-only inquiry — it mutates nothing and therefore produces NO log entry,
 * so it is deliberately absent here.
 */

export type MutationVerb =
  | 'add_card'
  | 'add_card_variants'
  | 'update_card'
  | 'remove_card'
  | 'reorder_cards'
  | 'set_card_rules'
  | 'add_card_group'
  | 'set_recipient'
  | 'set_recipient_profile'
  | 'set_note'
  | 'set_spend_caps'
  | 'set_vibe_from_occasion'
  | 'adjust_palette'
  | 'swap_typography'
  | 'set_mood'
  | 'set_voice'
  | 'regenerate_vibe'
  | 'set_hero_image'
  | 'generate_hero_image'
  | 'mark_ready_to_publish'
  | 'set_publish_meta';

export type SubjectKind =
  | 'page'
  | 'card'
  | 'group'
  | 'vibe'
  | 'hero'
  | 'note'
  | 'recipient';

export type ChipColor = 'add' | 'edit' | 'remove' | 'reorder' | 'vibe';

export interface MutationSubject {
  kind: SubjectKind;
  /** null for singleton subjects (page/vibe/hero/note/recipient). */
  id?: string | null;
  /** card/group display title at mutation time; survives later renames. */
  titleSnapshot?: string | null;
}

/**
 * An inverse mutation descriptor consumed by the BUILD UI undo handler
 * (BRIEF 06). `verb` is an intentionally loose string — some inverse verbs are
 * undo PRIMITIVES that are not curator tools (`remove_card_group`, `set_vibe`).
 * See `inverse.ts` for the full vocabulary.
 */
export interface MutationInverse {
  verb: string;
  input: Record<string, unknown>;
}

/**
 * Per-verb metadata derived once. `subjectKind` and `chipColor` are a pure
 * function of the verb, so dispatch never has to supply them by hand. The
 * `Record<MutationVerb, …>` type makes the compiler reject any missing verb.
 */
export const VERB_META: Record<
  MutationVerb,
  { subjectKind: SubjectKind; chipColor: ChipColor }
> = {
  add_card: { subjectKind: 'card', chipColor: 'add' },
  add_card_variants: { subjectKind: 'card', chipColor: 'add' },
  update_card: { subjectKind: 'card', chipColor: 'edit' },
  remove_card: { subjectKind: 'card', chipColor: 'remove' },
  reorder_cards: { subjectKind: 'card', chipColor: 'reorder' },
  set_card_rules: { subjectKind: 'card', chipColor: 'edit' },
  add_card_group: { subjectKind: 'group', chipColor: 'add' },
  set_recipient: { subjectKind: 'recipient', chipColor: 'edit' },
  set_recipient_profile: { subjectKind: 'recipient', chipColor: 'edit' },
  set_note: { subjectKind: 'note', chipColor: 'edit' },
  set_spend_caps: { subjectKind: 'recipient', chipColor: 'edit' },
  set_vibe_from_occasion: { subjectKind: 'vibe', chipColor: 'vibe' },
  adjust_palette: { subjectKind: 'vibe', chipColor: 'vibe' },
  swap_typography: { subjectKind: 'vibe', chipColor: 'vibe' },
  set_mood: { subjectKind: 'vibe', chipColor: 'vibe' },
  set_voice: { subjectKind: 'vibe', chipColor: 'vibe' },
  regenerate_vibe: { subjectKind: 'vibe', chipColor: 'vibe' },
  set_hero_image: { subjectKind: 'hero', chipColor: 'edit' },
  generate_hero_image: { subjectKind: 'hero', chipColor: 'edit' },
  mark_ready_to_publish: { subjectKind: 'page', chipColor: 'edit' },
  set_publish_meta: { subjectKind: 'page', chipColor: 'edit' },
};

export const MUTATION_VERBS = Object.keys(VERB_META) as MutationVerb[];

export function isMutationVerb(v: string): v is MutationVerb {
  return Object.prototype.hasOwnProperty.call(VERB_META, v);
}

export function subjectKindFor(verb: MutationVerb): SubjectKind {
  return VERB_META[verb].subjectKind;
}

export function chipColorFor(verb: MutationVerb): ChipColor {
  return VERB_META[verb].chipColor;
}

/**
 * One ordered mutation-log row, camelCase domain shape. Mirrors
 * `peek_v2.peek_mutation_log` (see `db/schema/peek-mutation-log.ts`).
 * `emittedAt` is an ISO string (the edge write path serializes via Supabase
 * REST, which is JSON/ISO, not a `Date`).
 */
export interface MutationLogEntry {
  id: string;
  peekId: string;
  turnId: string;
  emittedAt: string;
  verb: MutationVerb;
  subjectKind: SubjectKind;
  subjectId: string | null;
  subjectTitleSnapshot: string | null;
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown>;
  changedIds: string[];
  summary: string;
  chipColor: ChipColor | null;
  inverse: MutationInverse | null;
  scrapeCostCents: number | null;
  imageGenCostCents: number | null;
  llmInputTokens: number | null;
  llmOutputTokens: number | null;
}
