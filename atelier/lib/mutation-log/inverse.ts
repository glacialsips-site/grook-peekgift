/**
 * `inverseOf(verb, toolInput, toolOutput)` → the mutation that undoes this one,
 * or `null` when it cannot be cleanly undone. Consumed by the BUILD UI undo
 * handler (BRIEF 06): on "no, go back" it pops the most recent log entry and
 * applies `inverse` as a fresh forward mutation (which itself logs a new entry —
 * undo is never a non-event; see spec §4).
 *
 * CONTRACT WITH THE DISPATCH WRAPPER (BRIEF 04) — load-bearing:
 *   • Undoable edits/removes record prior state under `toolOutput.before`.
 *       - update_card        → before = { ...patchedFields' prior values }
 *       - set_card_rules     → before = { lock, taunt }            (prior)
 *       - remove_card        → before = { card: <full prior Card> }
 *       - reorder_cards      → before = { card_ids: <prior order> }
 *       - set_recipient      → before = { recipient_name, relationship, occasion,
 *           giver_names, budget_cents }  (FULL prior — the forward op NULLs any
 *           omitted relationship/occasion, so a partial `before` would not restore)
 *       - set_recipient_profile → before = { profile: <FULL prior profile> }
 *           (forward PRESERVES omitted keys and overwrites provided ones — it never
 *           clears — so undo must REPLACE the whole profile, hence `_replace: true`)
 *       - set_note           → before = { note_md: <prior | null> }
 *       - set_spend_caps     → before = { ...prior caps }
 *       - ALL vibe verbs     → before = { vibe: <FULL prior Vibe doc> }
 *       - set/generate hero  → before = { image_url, source }      (prior, may be null)
 *       - set_publish_meta   → before = { slug, expires_at }       (prior)
 *   • Creates expose their new ids on `toolOutput`: `id` / `card_id` for one,
 *     `card_ids: string[]` for batches, `id`/`group_id` for a group.
 *
 * INVERSE VERB VOCABULARY (what BRIEF 06's applier must understand):
 *   curator tools reused as-is: remove_card, add_card, update_card,
 *     set_card_rules, reorder_cards, set_recipient, set_recipient_profile,
 *     set_note, set_spend_caps, set_hero_image, set_publish_meta,
 *     mark_ready_to_publish.
 *   undo-only primitives (NOT curator tools): `remove_card_group`,
 *     `set_vibe` (full-doc vibe restore).
 *   input flags: `_replace: true` (profile — replace the whole profile, do NOT
 *     merge; the forward op preserves omitted keys so a merge would leave
 *     newly-added ones behind), `_status_reset: 'draft'` (revert ready→draft).
 */
import type { MutationInverse, MutationVerb } from './types';

type Bag = Record<string, unknown>;

const s = (v: unknown): string | undefined =>
  typeof v === 'string' && v.length > 0 ? v : undefined;
const obj = (v: unknown): Bag | undefined =>
  v != null && typeof v === 'object' && !Array.isArray(v) ? (v as Bag) : undefined;
const arr = (v: unknown): unknown[] | undefined => (Array.isArray(v) ? v : undefined);

const before = (output: Bag): Bag => obj(output['before']) ?? {};

function createdCardIds(output: Bag): string[] {
  const list = arr(output['card_ids']);
  if (list) return list.filter((x): x is string => typeof x === 'string');
  const one = s(output['id']) ?? s(output['card_id']);
  return one ? [one] : [];
}

type Inverter = (input: Bag, output: Bag) => MutationInverse | null;

const removeByIds: Inverter = (_input, output) => {
  const ids = createdCardIds(output);
  return ids.length ? { verb: 'remove_card', input: { card_ids: ids } } : null;
};

const restoreVibe: Inverter = (_input, output) => {
  const b = before(output);
  if (b['vibe'] === undefined) return null;
  return { verb: 'set_vibe', input: { vibe: b['vibe'] } };
};

const restoreHero: Inverter = (_input, output) => {
  const b = before(output);
  if (!('image_url' in b) && !('hero_image_url' in b)) return null;
  return {
    verb: 'set_hero_image',
    input: {
      image_url: b['image_url'] ?? b['hero_image_url'] ?? null,
      source: b['source'] ?? b['hero_image_source'] ?? null,
    },
  };
};

const INVERTERS: Record<MutationVerb, Inverter> = {
  add_card: removeByIds,
  add_card_variants: removeByIds,

  add_card_group: (_input, output) => {
    const groupId = s(output['id']) ?? s(output['group_id']);
    return groupId ? { verb: 'remove_card_group', input: { group_id: groupId } } : null;
  },

  update_card: (input, output) => {
    const cardId = s(input['card_id']) ?? s(output['id']) ?? s(output['card_id']);
    const prior = before(output);
    if (!cardId || Object.keys(prior).length === 0) return null;
    return { verb: 'update_card', input: { card_id: cardId, ...prior } };
  },

  set_card_rules: (input, output) => {
    const cardId = s(input['card_id']) ?? s(output['id']) ?? s(output['card_id']);
    const prior = before(output);
    if (!cardId || (prior['lock'] === undefined && prior['taunt'] === undefined)) return null;
    return {
      verb: 'set_card_rules',
      input: { card_id: cardId, lock: prior['lock'], taunt: prior['taunt'] },
    };
  },

  remove_card: (_input, output) => {
    const card = obj(before(output)['card']);
    return card ? { verb: 'add_card', input: { card } } : null;
  },

  reorder_cards: (input, output) => {
    const priorOrder = arr(before(output)['card_ids']);
    if (!priorOrder) return null;
    return { verb: 'reorder_cards', input: { scope: input['scope'], card_ids: priorOrder } };
  },

  set_recipient: (_input, output) => {
    const prior = before(output);
    return Object.keys(prior).length ? { verb: 'set_recipient', input: prior } : null;
  },

  set_recipient_profile: (_input, output) => {
    const profile = before(output)['profile'];
    if (profile === undefined) return null;
    return { verb: 'set_recipient_profile', input: { _replace: true, profile } };
  },

  set_note: (_input, output) => {
    const b = before(output);
    if (!('note_md' in b)) return null;
    return { verb: 'set_note', input: { note_md: b['note_md'] ?? null } };
  },

  set_spend_caps: (_input, output) => {
    const prior = before(output);
    return Object.keys(prior).length ? { verb: 'set_spend_caps', input: prior } : null;
  },

  set_vibe_from_occasion: restoreVibe,
  adjust_palette: restoreVibe,
  swap_typography: restoreVibe,
  set_mood: restoreVibe,
  set_voice: restoreVibe,
  regenerate_vibe: restoreVibe,

  set_hero_image: restoreHero,
  generate_hero_image: restoreHero,

  mark_ready_to_publish: (_input, output) => {
    const published =
      s(output['next_step']) === 'already_published' ||
      s(output['status']) === 'published' ||
      output['paid'] === true;
    // Crossed the payment boundary — refunds are human-in-loop, never auto-undo.
    if (published) return null;
    return { verb: 'mark_ready_to_publish', input: { _status_reset: 'draft' } };
  },

  set_publish_meta: (_input, output) => {
    const b = before(output);
    if (!('slug' in b) && !('expires_at' in b)) return null;
    return {
      verb: 'set_publish_meta',
      input: { slug: b['slug'] ?? null, expires_at: b['expires_at'] ?? null },
    };
  },
};

export function inverseOf(
  verb: MutationVerb,
  toolInput: Record<string, unknown>,
  toolOutput: Record<string, unknown>,
): MutationInverse | null {
  const fn = INVERTERS[verb];
  if (!fn) return null;
  try {
    return fn(toolInput ?? {}, toolOutput ?? {});
  } catch {
    return null;
  }
}
