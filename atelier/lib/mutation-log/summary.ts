/**
 * `summarize(verb, subject, toolInput, toolOutput)` → the human diff-mark line
 * shown in the depth-layer mutation pane, e.g. "Peek added "Wool Throw" to The
 * Drop" (curator-tools spec §6). Lives in dispatch, NOT in tool handlers, so
 * handlers stay thin. Every branch is defensive: a malformed tool payload
 * degrades to a generic-but-true sentence rather than throwing inside the log
 * write (which must never break a successful mutation).
 */
import type { MutationSubject, MutationVerb } from './types';

type Bag = Record<string, unknown>;

const s = (v: unknown): string | undefined =>
  typeof v === 'string' && v.length > 0 ? v : undefined;
const n = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;
const obj = (v: unknown): Bag | undefined =>
  v != null && typeof v === 'object' && !Array.isArray(v) ? (v as Bag) : undefined;
const arr = (v: unknown): unknown[] | undefined => (Array.isArray(v) ? v : undefined);

function dollars(cents: number): string {
  const d = cents / 100;
  return d % 1 === 0 ? `$${d}` : `$${d.toFixed(2)}`;
}

function cardTitle(subject: MutationSubject, input: Bag, output: Bag): string | undefined {
  const beforeCard = obj(obj(output['before'])?.['card']);
  return (
    s(subject.titleSnapshot) ??
    s(input['title']) ??
    s(output['title']) ??
    s(beforeCard?.['title'])
  );
}

function groupTitle(input: Bag, output: Bag): string | undefined {
  return (
    s(input['group_title']) ??
    s(output['group_title']) ??
    s(input['into']) ??
    s(output['group_title_snapshot'])
  );
}

type Summarizer = (subject: MutationSubject, input: Bag, output: Bag) => string;

const SUMMARIZERS: Record<MutationVerb, Summarizer> = {
  set_recipient: (_subject, input) => {
    const name = s(input['recipient_name']);
    const occasion = s(input['occasion']);
    const relationship = s(input['relationship']);
    if (name && occasion) return `Peek set up ${name}'s ${occasion}`;
    if (name) return `Peek set the recipient to ${name}`;
    if (occasion) return `Peek set the occasion to ${occasion}`;
    if (relationship) return `Peek noted the relationship: ${relationship}`;
    return 'Peek updated the recipient details';
  },

  set_recipient_profile: (_subject, input) => {
    const labels: string[] = [];
    if (arr(input['favorite_things'])?.length) labels.push('favorites');
    if (arr(input['current_obsessions'])?.length) labels.push('obsessions');
    if (arr(input['allergies_or_no_gos'])?.length) labels.push('no-gos');
    if (obj(input['sizes'])) labels.push('sizes');
    if (s(input['notes'])) labels.push('notes');
    return labels.length
      ? `Peek added recipient details: ${labels.join(', ')}`
      : 'Peek updated the recipient profile';
  },

  set_note: (_subject, _input, output) => {
    const had = s(obj(output['before'])?.['note_md']);
    return had ? 'Peek revised the personal note' : 'Peek wrote the personal note';
  },

  set_spend_caps: (_subject, input) => {
    const hard = n(input['recipient_hard_cap_cents']);
    const soft = n(input['recipient_soft_cap_cents']);
    if (hard != null) return `Peek set a spending cap of ${dollars(hard)}`;
    if (soft != null) return `Peek set a soft spending cap of ${dollars(soft)}`;
    return 'Peek set spending caps';
  },

  set_vibe_from_occasion: (_subject, input, output) => {
    const occasion = s(input['occasion']);
    const preset = s(output['preset']) ?? s(input['preset']);
    if (occasion && preset) return `Peek styled the page for ${occasion} (${preset})`;
    if (occasion) return `Peek styled the page for ${occasion}`;
    return 'Peek set the vibe';
  },

  adjust_palette: (_subject, input) => {
    const key = s(input['key']);
    return key ? `Peek shifted the palette toward ${key}` : 'Peek adjusted the color palette';
  },

  swap_typography: (_subject, input) => {
    const display = s(input['display_role']);
    const body = s(input['body_role']);
    if (display && body) return `Peek set the type to ${display} / ${body}`;
    if (display) return `Peek changed the display font to ${display}`;
    if (body) return `Peek changed the body font to ${body}`;
    return 'Peek changed the typography';
  },

  set_mood: (_subject, input) => {
    const mood = s(input['mood']);
    return mood ? `Peek set the mood to ${mood}` : 'Peek set the mood';
  },

  set_voice: (_subject, input) => {
    const traits = ['warmth', 'humor', 'pace', 'formality', 'vocabulary', 'length']
      .map((k) => s(input[k]))
      .filter((v): v is string => Boolean(v));
    return traits.length
      ? `Peek tuned the voice (${traits.join(', ')})`
      : 'Peek tuned the voice';
  },

  regenerate_vibe: (_subject, input) => {
    const direction = s(input['direction']);
    return direction ? `Peek regenerated the vibe — ${direction}` : 'Peek regenerated the vibe';
  },

  set_hero_image: () => 'Peek set the hero image',

  generate_hero_image: (_subject, _input, output) => {
    const got = s(output['image_url']);
    return got ? 'Peek generated the hero image' : 'Peek attempted a hero image (none returned)';
  },

  add_card_group: (_subject, input) => {
    const title = s(input['title']);
    return title ? `Peek created the "${title}" group` : 'Peek created a card group';
  },

  add_card: (subject, input, output) => {
    const title = cardTitle(subject, input, output);
    const group = groupTitle(input, output);
    const head = title ? `Peek added "${title}"` : 'Peek added a card';
    return group ? `${head} to ${group}` : head;
  },

  add_card_variants: (_subject, input, output) => {
    const count =
      arr(input['cards'])?.length ?? arr(output['card_ids'])?.length ?? n(input['count']);
    const group = groupTitle(input, output);
    const head = count ? `Peek added ${count} options` : 'Peek added card options';
    return group ? `${head} to ${group}` : head;
  },

  update_card: (subject, input, output) => {
    const title = cardTitle(subject, input, output);
    return title ? `Peek updated "${title}"` : 'Peek updated a card';
  },

  set_card_rules: (subject, input, output) => {
    const title = cardTitle(subject, input, output) ?? 'a card';
    const lockKind = s(obj(input['lock'])?.['kind']);
    const tauntActive = obj(input['taunt'])?.['active'] === true;
    if (lockKind && lockKind !== 'none') return `Peek locked "${title}" (${lockKind})`;
    if (tauntActive) return `Peek set a taunt on "${title}"`;
    return `Peek updated the rules on "${title}"`;
  },

  remove_card: (subject, input, output) => {
    const title = cardTitle(subject, input, output);
    return title ? `Peek removed "${title}"` : 'Peek removed a card';
  },

  reorder_cards: (_subject, input, output) => {
    const scope = obj(input['scope']);
    const isGroup = scope?.['group'] != null || s(input['group_id']) != null;
    const group = groupTitle(input, output);
    if (isGroup) return group ? `Peek reordered cards in ${group}` : 'Peek reordered cards in a group';
    return 'Peek reordered the cards';
  },

  mark_ready_to_publish: (_subject, _input, output) => {
    return s(output['next_step']) === 'already_published'
      ? 'Peek confirmed the peek is already live'
      : 'Peek marked the peek ready to publish';
  },

  set_publish_meta: (_subject, input) => {
    const slug = s(input['slug']);
    if (slug) return `Peek set the link to /${slug}`;
    if (s(input['expires_at'])) return 'Peek set an expiry on the peek';
    return 'Peek updated the publish settings';
  },
};

export function summarize(
  verb: MutationVerb,
  subject: MutationSubject,
  toolInput: Record<string, unknown>,
  toolOutput: Record<string, unknown>,
): string {
  const fn = SUMMARIZERS[verb];
  if (!fn) return 'Peek made a change';
  try {
    return fn(subject, toolInput ?? {}, toolOutput ?? {});
  } catch {
    return 'Peek made a change';
  }
}
