import { describe, expect, it } from 'vitest';
import { DEFAULT_VIBE } from '@/lib/vibe/defaults';
import { rowsToState } from '@/lib/spine/wire';
import { deriveSpinePage } from '@/lib/spine/derive';
import type { SpineState } from '@/lib/spine/types';

function emptyState(over: Partial<SpineState['peek']> = {}): SpineState {
  return {
    peek: {
      id: '00000000-0000-0000-0000-000000000001',
      slug: 'spine-test',
      recipientName: null,
      occasion: null,
      heroImageUrl: null,
      noteMd: null,
      giverNames: [],
      vibe: DEFAULT_VIBE,
      status: 'draft',
      ...over,
    },
    cards: [],
  };
}

describe('spine wire mapping', () => {
  it('maps snake_case rows to the camelCase wire shape and sorts cards by position', () => {
    const state = rowsToState(
      {
        id: 'p1',
        slug: 's1',
        recipient_name: 'Maya',
        occasion: '30th',
        hero_image_url: null,
        note_md: 'hi',
        giver_names: ['the crew'],
        vibe: DEFAULT_VIBE,
        status: 'draft',
      },
      [
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
      ],
    );
    expect(state.peek.recipientName).toBe('Maya');
    expect(state.peek.giverNames).toEqual(['the crew']);
    expect(state.cards.map((c) => c.id)).toEqual(['c1', 'c2']);
  });
});

describe('spine derive → renderable page', () => {
  it('produces a legal page for an empty draft (hero + cta + footer)', () => {
    const page = deriveSpinePage(emptyState());
    expect(page.content.title).toBe('A Peek for you');
    const types = page.composition.sections.map((s) => s.type);
    expect(types).toContain('hero');
    expect(types).toContain('cta');
    expect(types).toContain('footer');
  });

  it('renders recipient + cards through the grammar (productSet present, price formatted)', () => {
    const state = emptyState({ recipientName: 'Maya', occasion: '30th' });
    state.cards = [
      {
        id: 'c1',
        position: 0,
        type: 'product',
        title: 'Ceramic mug',
        description: 'hand-thrown',
        imageUrl: null,
        valueCents: 4200,
        revealValue: true,
        isTaunt: false,
        tauntText: null,
        variantGroupId: null,
      },
    ];
    const page = deriveSpinePage(state);
    expect(page.content.title).toContain('Maya');
    expect(page.composition.sections.map((s) => s.type)).toContain('productSet');
    expect(page.content.cards['c1']?.priceLabel).toBe('$42');
  });
});
