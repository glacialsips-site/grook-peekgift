import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildMutationLogEntry,
  chipColorFor,
  decodeTime,
  entryToRow,
  inverseOf,
  isMutationVerb,
  MUTATION_VERBS,
  readMutationLogForPeek,
  recordMutation,
  rowToEntry,
  subjectKindFor,
  summarize,
  ulid,
  ulidAt,
  VERB_META,
  writeMutationLog,
  type MutationVerb,
} from '@/lib/mutation-log';

// In-memory fake of the schema-scoped Supabase edge client. JSON-clones on the
// way in/out to mimic the jsonb round-trip (drops `undefined`, key-order-agnostic).
const mock = vi.hoisted(() => {
  type Row = Record<string, any>;
  const store: Record<string, Row[]> = {};
  const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
  function builder(table: string) {
    const filters: { kind: 'eq' | 'gt'; col: string; val: any }[] = [];
    let orderCol: string | null = null;
    let orderAsc = true;
    let limitN = Infinity;
    const b: any = {
      insert(rows: Row | Row[]) {
        const list = Array.isArray(rows) ? rows : [rows];
        (store[table] ??= []).push(...list.map(clone));
        return Promise.resolve({ data: null, error: null });
      },
      select() {
        return b;
      },
      eq(col: string, val: any) {
        filters.push({ kind: 'eq', col, val });
        return b;
      },
      gt(col: string, val: any) {
        filters.push({ kind: 'gt', col, val });
        return b;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        orderCol = col;
        orderAsc = opts?.ascending ?? true;
        return b;
      },
      limit(n: number) {
        limitN = n;
        return b;
      },
      then(resolve: (v: any) => void) {
        let rows = (store[table] ?? []).slice();
        for (const f of filters) {
          rows = rows.filter((r) => (f.kind === 'eq' ? r[f.col] === f.val : r[f.col] > f.val));
        }
        if (orderCol) {
          const col = orderCol;
          rows.sort((x, y) => {
            const c = x[col] < y[col] ? -1 : x[col] > y[col] ? 1 : 0;
            return orderAsc ? c : -c;
          });
        }
        if (Number.isFinite(limitN)) rows = rows.slice(0, limitN);
        resolve({ data: clone(rows), error: null });
      },
    };
    return b;
  }
  return { store, getSupabaseEdge: () => ({ from: (t: string) => builder(t) }) };
});

vi.mock('@/lib/db-edge/client', () => ({
  getSupabaseEdge: mock.getSupabaseEdge,
  resetSupabaseEdge: () => {},
}));

beforeEach(() => {
  for (const k of Object.keys(mock.store)) delete mock.store[k];
});

// One representative fixture per verb, each carrying the `toolOutput.before` /
// created-id metadata the dispatch contract promises, so every inverse is
// non-null. Record<MutationVerb,…> forces coverage of all verbs at compile time.
type Fixture = {
  subjectId?: string;
  subjectTitleSnapshot?: string;
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown>;
  expectInverseVerb: string | null;
};

const FIXTURES: Record<MutationVerb, Fixture> = {
  add_card: {
    subjectId: 'card_1',
    subjectTitleSnapshot: 'Wool Throw',
    toolInput: { title: 'Wool Throw', group_title: 'The Drop' },
    toolOutput: { id: 'card_1', group_title: 'The Drop' },
    expectInverseVerb: 'remove_card',
  },
  add_card_variants: {
    toolInput: { cards: [{}, {}, {}], group_title: 'The Drop' },
    toolOutput: { card_ids: ['c1', 'c2', 'c3'], group_title: 'The Drop' },
    expectInverseVerb: 'remove_card',
  },
  add_card_group: {
    subjectId: 'grp_1',
    subjectTitleSnapshot: 'The Drop',
    toolInput: { title: 'The Drop', selection: 'pick_one' },
    toolOutput: { id: 'grp_1' },
    expectInverseVerb: 'remove_card_group',
  },
  update_card: {
    subjectId: 'card_1',
    subjectTitleSnapshot: 'Wool Throw',
    toolInput: { card_id: 'card_1', title: 'Cashmere Throw' },
    toolOutput: { id: 'card_1', before: { title: 'Wool Throw' } },
    expectInverseVerb: 'update_card',
  },
  remove_card: {
    subjectId: 'card_1',
    subjectTitleSnapshot: 'Wool Throw',
    toolInput: { card_id: 'card_1' },
    toolOutput: { before: { card: { id: 'card_1', title: 'Wool Throw', kind: 'retailer_product' } } },
    expectInverseVerb: 'add_card',
  },
  reorder_cards: {
    toolInput: { scope: { group: 'grp_1' }, card_ids: ['c2', 'c1'] },
    toolOutput: { before: { card_ids: ['c1', 'c2'] }, group_title: 'The Drop' },
    expectInverseVerb: 'reorder_cards',
  },
  set_card_rules: {
    subjectId: 'card_1',
    subjectTitleSnapshot: 'Concert Tix',
    toolInput: { card_id: 'card_1', lock: { kind: 'date_after', unlock_after: '2026-06-01' } },
    toolOutput: { before: { lock: { kind: 'none' }, taunt: { active: false } } },
    expectInverseVerb: 'set_card_rules',
  },
  set_recipient: {
    toolInput: { recipient_name: 'Maya', occasion: 'birthday' },
    toolOutput: { before: { recipient_name: null, occasion: null } },
    expectInverseVerb: 'set_recipient',
  },
  set_recipient_profile: {
    toolInput: { favorite_things: ['matcha'], allergies_or_no_gos: ['peanuts'] },
    toolOutput: { before: { profile: { favorite_things: [] } } },
    expectInverseVerb: 'set_recipient_profile',
  },
  set_note: {
    toolInput: { note_md: 'Happy birthday, you menace.' },
    toolOutput: { before: { note_md: null } },
    expectInverseVerb: 'set_note',
  },
  set_spend_caps: {
    toolInput: { recipient_hard_cap_cents: 15000 },
    toolOutput: { before: { recipient_hard_cap_cents: null } },
    expectInverseVerb: 'set_spend_caps',
  },
  set_vibe_from_occasion: {
    toolInput: { occasion: 'birthday' },
    toolOutput: { preset: 'playful', before: { vibe: { preset: 'tender' } } },
    expectInverseVerb: 'set_vibe',
  },
  adjust_palette: {
    toolInput: { key: 'warmer' },
    toolOutput: { before: { vibe: { palette: { bg: '#101010' } } } },
    expectInverseVerb: 'set_vibe',
  },
  swap_typography: {
    toolInput: { display_role: 'serif', body_role: 'sans' },
    toolOutput: { before: { vibe: { typography: { heading: 'sans', body: 'sans' } } } },
    expectInverseVerb: 'set_vibe',
  },
  set_mood: {
    toolInput: { mood: 'editorial' },
    toolOutput: { before: { vibe: { mood: 'minimal' } } },
    expectInverseVerb: 'set_vibe',
  },
  set_voice: {
    toolInput: { warmth: 'warm', humor: 'dry' },
    toolOutput: { before: { vibe: { voice: {} } } },
    expectInverseVerb: 'set_vibe',
  },
  regenerate_vibe: {
    toolInput: { direction: 'more luxe, less twee' },
    toolOutput: { before: { vibe: { preset: 'playful' } } },
    expectInverseVerb: 'set_vibe',
  },
  set_hero_image: {
    toolInput: { image_url: 'https://img/x.jpg', source: 'unsplash' },
    toolOutput: { before: { image_url: null, source: null } },
    expectInverseVerb: 'set_hero_image',
  },
  generate_hero_image: {
    toolInput: {},
    toolOutput: { image_url: 'https://fal/x.jpg', before: { image_url: null, source: null } },
    expectInverseVerb: 'set_hero_image',
  },
  mark_ready_to_publish: {
    toolInput: {},
    toolOutput: { next_step: 'paywall' },
    expectInverseVerb: 'mark_ready_to_publish',
  },
  set_publish_meta: {
    toolInput: { slug: 'maya-bday' },
    toolOutput: { before: { slug: null, expires_at: null } },
    expectInverseVerb: 'set_publish_meta',
  },
};

const PEEK_ID = '11111111-1111-1111-1111-111111111111';

function entryFor(verb: MutationVerb, overrides: Partial<{ id: string; emittedAt: string }> = {}) {
  const f = FIXTURES[verb];
  return buildMutationLogEntry({
    peekId: PEEK_ID,
    turnId: 'turn_1',
    verb,
    subjectId: f.subjectId ?? null,
    subjectTitleSnapshot: f.subjectTitleSnapshot ?? null,
    toolInput: f.toolInput,
    toolOutput: f.toolOutput,
    ...overrides,
  });
}

describe('ulid', () => {
  it('is 26 chars of Crockford base32', () => {
    const id = ulid();
    expect(id).toHaveLength(26);
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it('is monotonic and lexically sortable across many calls', () => {
    const ids = Array.from({ length: 2000 }, () => ulid());
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('strictly increases within the same millisecond', () => {
    const a = ulid(1_700_000_000_000);
    const b = ulid(1_700_000_000_000);
    expect(b > a).toBe(true);
  });

  it('round-trips the timestamp via decodeTime (ulidAt honors the exact time)', () => {
    for (const t of [0, 1_700_000_000_000, 1_780_000_000_000]) {
      expect(decodeTime(ulidAt(t))).toBe(t);
    }
  });
});

describe('verb metadata', () => {
  it('covers exactly the 21 mutation verbs (get_page_summary excluded)', () => {
    expect(MUTATION_VERBS).toHaveLength(21);
    expect(MUTATION_VERBS).not.toContain('get_page_summary');
    expect(isMutationVerb('get_page_summary')).toBe(false);
    expect(isMutationVerb('add_card')).toBe(true);
  });

  it('maps subjectKind / chipColor by verb', () => {
    expect(subjectKindFor('add_card')).toBe('card');
    expect(subjectKindFor('add_card_group')).toBe('group');
    expect(subjectKindFor('set_note')).toBe('note');
    expect(subjectKindFor('set_mood')).toBe('vibe');
    expect(subjectKindFor('set_hero_image')).toBe('hero');
    expect(subjectKindFor('mark_ready_to_publish')).toBe('page');
    expect(subjectKindFor('set_recipient')).toBe('recipient');
    expect(chipColorFor('remove_card')).toBe('remove');
    expect(chipColorFor('reorder_cards')).toBe('reorder');
    expect(chipColorFor('adjust_palette')).toBe('vibe');
    expect(chipColorFor('add_card')).toBe('add');
    expect(chipColorFor('update_card')).toBe('edit');
  });
});

describe('summarize', () => {
  it('produces the spec example for add_card', () => {
    expect(summarize('add_card', { kind: 'card', titleSnapshot: 'Wool Throw' }, { group_title: 'The Drop' }, {})).toBe(
      'Peek added "Wool Throw" to The Drop',
    );
  });

  it('produces sensible summaries for representative verbs', () => {
    const cases: [MutationVerb, string][] = [
      ['set_recipient', "Peek set up Maya's birthday"],
      ['add_card_variants', 'Peek added 3 options to The Drop'],
      ['add_card_group', 'Peek created the "The Drop" group'],
      ['remove_card', 'Peek removed "Wool Throw"'],
      ['set_mood', 'Peek set the mood to editorial'],
      ['set_spend_caps', 'Peek set a spending cap of $150'],
      ['set_card_rules', 'Peek locked "Concert Tix" (date_after)'],
      ['reorder_cards', 'Peek reordered cards in The Drop'],
      ['set_publish_meta', 'Peek set the link to /maya-bday'],
      ['regenerate_vibe', 'Peek regenerated the vibe — more luxe, less twee'],
    ];
    for (const [verb, expected] of cases) {
      const f = FIXTURES[verb];
      const summary = summarize(
        verb,
        { kind: subjectKindFor(verb), id: f.subjectId ?? null, titleSnapshot: f.subjectTitleSnapshot ?? null },
        f.toolInput,
        f.toolOutput,
      );
      expect(summary).toBe(expected);
    }
  });

  it('never throws and always yields a non-empty string for every verb', () => {
    for (const verb of MUTATION_VERBS) {
      const summary = summarize(verb, { kind: subjectKindFor(verb) }, {}, {});
      expect(summary.length).toBeGreaterThan(0);
    }
  });
});

describe('inverseOf', () => {
  it('inverts every reversible verb with the expected inverse verb', () => {
    for (const verb of MUTATION_VERBS) {
      const f = FIXTURES[verb];
      const inv = inverseOf(verb, f.toolInput, f.toolOutput);
      expect(inv, `inverse of ${verb}`).not.toBeNull();
      expect(inv!.verb, `inverse verb of ${verb}`).toBe(f.expectInverseVerb);
    }
  });

  it('restores prior values precisely for key verbs', () => {
    expect(inverseOf('update_card', { card_id: 'card_1', title: 'New' }, { before: { title: 'Old' } })).toEqual({
      verb: 'update_card',
      input: { card_id: 'card_1', title: 'Old' },
    });
    expect(inverseOf('add_card_variants', {}, { card_ids: ['c1', 'c2', 'c3'] })).toEqual({
      verb: 'remove_card',
      input: { card_ids: ['c1', 'c2', 'c3'] },
    });
    expect(inverseOf('set_mood', { mood: 'rich' }, { before: { vibe: { mood: 'minimal' } } })).toEqual({
      verb: 'set_vibe',
      input: { vibe: { mood: 'minimal' } },
    });
    expect(
      inverseOf('set_recipient_profile', { favorite_things: ['x'] }, { before: { profile: { favorite_things: [] } } }),
    ).toEqual({ verb: 'set_recipient_profile', input: { _replace: true, profile: { favorite_things: [] } } });
  });

  it('returns null when the mutation crosses the payment boundary', () => {
    expect(inverseOf('mark_ready_to_publish', {}, { next_step: 'already_published' })).toBeNull();
    expect(inverseOf('mark_ready_to_publish', {}, { status: 'published' })).toBeNull();
    expect(inverseOf('mark_ready_to_publish', {}, { paid: true })).toBeNull();
  });

  it('returns null when prior state / created ids are missing', () => {
    expect(inverseOf('update_card', { card_id: 'x' }, {})).toBeNull();
    expect(inverseOf('remove_card', {}, {})).toBeNull();
    expect(inverseOf('add_card', {}, {})).toBeNull();
    expect(inverseOf('adjust_palette', {}, {})).toBeNull();
  });
});

describe('wire mappers', () => {
  it('round-trips entryToRow → rowToEntry for all 21 verbs', () => {
    for (const verb of MUTATION_VERBS) {
      const entry = entryFor(verb);
      expect(rowToEntry(entryToRow(entry)), `round-trip ${verb}`).toEqual(entry);
    }
  });
});

describe('writeMutationLog / readMutationLogForPeek', () => {
  it('persists and reads back an entry for all 21 verbs', async () => {
    for (const verb of MUTATION_VERBS) {
      for (const k of Object.keys(mock.store)) delete mock.store[k];
      const written = await recordMutation({
        peekId: PEEK_ID,
        turnId: 'turn_1',
        verb,
        subjectId: FIXTURES[verb].subjectId ?? null,
        subjectTitleSnapshot: FIXTURES[verb].subjectTitleSnapshot ?? null,
        toolInput: FIXTURES[verb].toolInput,
        toolOutput: FIXTURES[verb].toolOutput,
      });
      const back = await readMutationLogForPeek(PEEK_ID);
      expect(back, `read back ${verb}`).toHaveLength(1);
      expect(back[0]).toEqual(written);
    }
  });

  it('writeMutationLog targets the peek_mutation_log table', async () => {
    await writeMutationLog(entryFor('add_card'));
    expect(mock.store['peek_mutation_log']).toHaveLength(1);
    expect(mock.store['peek_mutation_log']![0]!['verb']).toBe('add_card');
  });

  it('returns results ordered chronologically by ulid', async () => {
    // Insert out of order; ulid order == time order.
    await writeMutationLog(entryFor('set_note', { id: ulidAt(3000) }));
    await writeMutationLog(entryFor('add_card', { id: ulidAt(1000) }));
    await writeMutationLog(entryFor('set_mood', { id: ulidAt(2000) }));
    const back = await readMutationLogForPeek(PEEK_ID);
    expect(back.map((e) => e.verb)).toEqual(['add_card', 'set_mood', 'set_note']);
  });

  it('respects the since cursor and the limit', async () => {
    const a = ulidAt(1000);
    const b = ulidAt(2000);
    const c = ulidAt(3000);
    await writeMutationLog(entryFor('add_card', { id: a }));
    await writeMutationLog(entryFor('set_mood', { id: b }));
    await writeMutationLog(entryFor('set_note', { id: c }));
    const afterA = await readMutationLogForPeek(PEEK_ID, { since: a });
    expect(afterA.map((e) => e.id)).toEqual([b, c]);
    const firstOnly = await readMutationLogForPeek(PEEK_ID, { limit: 1 });
    expect(firstOnly.map((e) => e.id)).toEqual([a]);
  });

  it('scopes reads by peek id', async () => {
    await writeMutationLog(entryFor('add_card'));
    const other = await readMutationLogForPeek('22222222-2222-2222-2222-222222222222');
    expect(other).toHaveLength(0);
  });
});
