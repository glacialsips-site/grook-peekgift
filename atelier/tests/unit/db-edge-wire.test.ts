import { describe, expect, it } from 'vitest';
import { DEFAULT_VIBE } from '@/lib/vibe/defaults';
import {
  rowsToState,
  rowToWirePeek,
  rowToWireCard,
  PEEK_COLUMNS,
  CARD_COLUMNS,
} from '@/lib/db-edge/wire';
import type { SpineCardRow, SpinePeekRow } from '@/lib/db-edge/wire';

describe('db-edge wire re-export surface', () => {
  it('exposes the column constants as non-empty strings with expected columns', () => {
    expect(typeof PEEK_COLUMNS).toBe('string');
    expect(PEEK_COLUMNS.length).toBeGreaterThan(0);
    expect(PEEK_COLUMNS).toContain('recipient_name');
    expect(PEEK_COLUMNS).toContain('note_md');
    expect(PEEK_COLUMNS).toContain('giver_names');
    expect(PEEK_COLUMNS).toContain('hero_image_url');

    expect(typeof CARD_COLUMNS).toBe('string');
    expect(CARD_COLUMNS.length).toBeGreaterThan(0);
    expect(CARD_COLUMNS).toContain('value_cents');
    expect(CARD_COLUMNS).toContain('image_url');
    expect(CARD_COLUMNS).toContain('reveal_value');
    expect(CARD_COLUMNS).toContain('is_taunt');
  });

  it('maps a snake_case peek row to the camelCase wire shape', () => {
    const row: SpinePeekRow = {
      id: 'p1',
      slug: 's1',
      recipient_name: 'Maya',
      occasion: '30th',
      hero_image_url: 'https://img.example/h.png',
      note_md: 'happy birthday',
      giver_names: ['the crew'],
      vibe: DEFAULT_VIBE,
      status: 'draft',
    };
    const wire = rowToWirePeek(row);
    expect(wire.recipientName).toBe('Maya');
    expect(wire.occasion).toBe('30th');
    expect(wire.heroImageUrl).toBe('https://img.example/h.png');
    expect(wire.noteMd).toBe('happy birthday');
    expect(wire.giverNames).toEqual(['the crew']);
  });

  it('maps null giver_names to an empty array', () => {
    const row: SpinePeekRow = {
      id: 'p1',
      slug: 's1',
      recipient_name: null,
      occasion: null,
      hero_image_url: null,
      note_md: null,
      giver_names: null,
      vibe: DEFAULT_VIBE,
      status: 'draft',
    };
    expect(rowToWirePeek(row).giverNames).toEqual([]);
  });

  it('maps a snake_case card row to the camelCase wire shape', () => {
    const row: SpineCardRow = {
      id: 'c1',
      position: 0,
      type: 'product',
      title: 'Wine',
      description: 'a nice red',
      image_url: 'https://img.example/c.png',
      value_cents: 4200,
      reveal_value: true,
      is_taunt: true,
      taunt_text: 'too cheap',
      variant_group_id: 'g1',
    };
    const wire = rowToWireCard(row);
    expect(wire.valueCents).toBe(4200);
    expect(wire.imageUrl).toBe('https://img.example/c.png');
    expect(wire.revealValue).toBe(true);
    expect(wire.isTaunt).toBe(true);
    expect(wire.tauntText).toBe('too cheap');
    expect(wire.variantGroupId).toBe('g1');
  });

  it('maps null reveal_value / is_taunt to false', () => {
    const row: SpineCardRow = {
      id: 'c1',
      position: 0,
      type: 'product',
      title: 'Mug',
      description: null,
      image_url: null,
      value_cents: null,
      reveal_value: null,
      is_taunt: null,
      taunt_text: null,
      variant_group_id: null,
    };
    const wire = rowToWireCard(row);
    expect(wire.revealValue).toBe(false);
    expect(wire.isTaunt).toBe(false);
    expect(wire.valueCents).toBeNull();
  });
});

describe('db-edge rowsToState (peek + cards)', () => {
  const peek: SpinePeekRow = {
    id: 'p1',
    slug: 's1',
    recipient_name: 'Maya',
    occasion: '30th',
    hero_image_url: null,
    note_md: 'hi',
    giver_names: ['the crew'],
    vibe: DEFAULT_VIBE,
    status: 'draft',
  };

  it('sorts cards by position regardless of input order', () => {
    const state = rowsToState(peek, [
      {
        id: 'c2',
        position: 1,
        type: 'product',
        title: 'Wine',
        description: null,
        image_url: null,
        value_cents: 4200,
        reveal_value: true,
        is_taunt: false,
        taunt_text: null,
        variant_group_id: null,
      },
      {
        id: 'c1',
        position: 0,
        type: 'product',
        title: 'Mug',
        description: null,
        image_url: null,
        value_cents: null,
        reveal_value: false,
        is_taunt: false,
        taunt_text: null,
        variant_group_id: null,
      },
    ]);
    expect(state.cards.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(state.peek.recipientName).toBe('Maya');
    expect(state.peek.giverNames).toEqual(['the crew']);
    // snake→camel surfaced through rowsToState
    expect(state.cards[0]?.valueCents).toBeNull();
    expect(state.cards[1]?.valueCents).toBe(4200);
    expect(state.cards[1]?.revealValue).toBe(true);
  });

  it('returns an empty cards array when the peek has no cards', () => {
    const state = rowsToState(peek, []);
    expect(state.cards).toEqual([]);
  });
});
