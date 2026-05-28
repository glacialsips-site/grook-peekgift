/**
 * Normalized, addressable PAGE STATE — the renderer's input shape.
 * ================================================================
 *
 * Ported from prototypes/build-actor-ux/state.js (verdict #3: NORMALIZED,
 * ADDRESSABLE). Every section and every card has a stable string id. The
 * renderer is a pure function of this object. The build-pane's "scripted AI
 * edit" is an immutable patch that appends/replaces an entity by id and records
 * a `changed: Set<id>` so diff-mark can decorate exactly those nodes without
 * DOM diffing — that commit shape (`{state, changed, reason}`) is preserved
 * here for the build surface to consume later.
 *
 * This shape is DERIVED from the live DB schema (`peeks` + `cards` +
 * `variant_groups`) by `fromPeekData`, so faking nothing: the same normalized
 * state the build-pane will carry is what the published recipient page renders.
 */

import type { Card, Peek, VariantGroup } from '@/db/schema';
import type {
  PageComposition,
  ProductSetVariant,
  Section,
  Vibe,
} from '@/lib/vibe/grammar';
import {
  dbVibeToValidated,
  generateAndRepair,
  validatePageComposition,
} from '@/lib/vibe/grammar';

/** A card flattened for rendering (recipient-safe fields only). */
export interface RenderCard {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly imageUrl: string | null;
  readonly priceLabel: string | null; // formatted, e.g. "$88"
  readonly tag: string | null;
  readonly type: Card['type'];
}

/** Resolved content for the page (the "slots" reference into this). */
export interface PageContent {
  readonly title: string; // hero headline
  readonly subtitle: string | null; // hero sub
  readonly heroImageUrl: string | null;
  readonly noteMd: string | null; // the personal note
  readonly signature: string | null; // "— the crew"
  readonly cards: Readonly<Record<string, RenderCard>>;
  /** named product groupings → ordered card ids (e.g. "The Drop", "The Kit"). */
  readonly groups: ReadonlyArray<{
    readonly id: string;
    readonly title: string;
    readonly cardOrder: readonly string[];
  }>;
  /** flat fallback order of all cards (when no groups). */
  readonly cardOrder: readonly string[];
}

/** The complete renderable page: validated vibe + legal composition + content. */
export interface RenderablePage {
  readonly vibe: Vibe;
  readonly composition: PageComposition;
  readonly content: PageContent;
}

/** Pick a count-legal product-set presentation for a card group. */
function presentationForCount(n: number, preferred?: ProductSetVariant): ProductSetVariant {
  const order: ProductSetVariant[] =
    preferred && isLegalForCount(preferred, n)
      ? [preferred]
      : n === 1
        ? ['single-hero-product', 'editorial-full-bleed']
        : n <= 2
          ? ['editorial-full-bleed', 'list']
          : n <= 3
            ? ['tight-grid', 'horizontal-scroll', 'editorial-full-bleed']
            : ['tight-grid', 'collage-masonry', 'horizontal-scroll'];
  return order[0] ?? 'list';
}

function isLegalForCount(v: ProductSetVariant, n: number): boolean {
  const rules: Record<ProductSetVariant, [number, number]> = {
    'single-hero-product': [1, 1],
    'editorial-full-bleed': [1, 5],
    'tight-grid': [3, 12],
    'horizontal-scroll': [3, 12],
    'collage-masonry': [4, 12],
    list: [2, 20],
  };
  const [min, max] = rules[v];
  return n >= min && n <= max;
}

function formatPrice(card: Card): string | null {
  if (!card.revealValue || card.valueCents == null) return null;
  const dollars = card.valueCents / 100;
  return `$${dollars % 1 === 0 ? dollars.toFixed(0) : dollars.toFixed(2)}`;
}

/**
 * Build a `RenderablePage` from live DB rows. This is the production path the
 * `/g/[slug]` page uses. It:
 *   1. validates the DB vibe through the grammar (contrast-safe, branded);
 *   2. groups cards by `variant_group` (named sections like "The Drop");
 *   3. composes a legal section sequence (hero → groups as productSets → cta →
 *      footer) and runs it through `generateAndRepair` so R1–R8 hold.
 */
export function fromPeekData(input: {
  peek: Pick<
    Peek,
    'recipientName' | 'occasion' | 'heroImageUrl' | 'noteMd' | 'giverNames' | 'vibe'
  >;
  cards: readonly Card[];
  variantGroups?: readonly VariantGroup[];
}): RenderablePage {
  const vibe = dbVibeToValidated(input.peek.vibe);
  const content = buildPeekContent(input);
  const composition = composeSections(content, vibe);
  return { vibe, composition, content };
}

/** Build the normalized `PageContent` from DB rows (no vibe / composition). */
export function buildPeekContent(input: {
  peek: Pick<
    Peek,
    'recipientName' | 'occasion' | 'heroImageUrl' | 'noteMd' | 'giverNames'
  >;
  cards: readonly Card[];
  variantGroups?: readonly VariantGroup[];
}): PageContent {
  const { peek } = input;
  const sortedCards = [...input.cards].sort((a, b) => a.position - b.position);
  const renderCards: Record<string, RenderCard> = {};
  for (const c of sortedCards) {
    renderCards[c.id] = {
      id: c.id,
      title: c.title,
      description: c.description,
      imageUrl: c.imageUrl,
      priceLabel: formatPrice(c),
      tag: c.isTaunt ? c.tauntText : null,
      type: c.type,
    };
  }

  // Group cards by variant group (preserving group order); ungrouped → a
  // trailing "More" group so every card is placed.
  const groups: { id: string; title: string; cardOrder: string[] }[] = [];
  const byGroup = new Map<string, string[]>();
  for (const c of sortedCards) {
    const key = c.variantGroupId ?? '__ungrouped__';
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(c.id);
  }
  const sortedGroups = [...(input.variantGroups ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  for (const g of sortedGroups) {
    const ids = byGroup.get(g.id);
    if (ids && ids.length) groups.push({ id: g.id, title: g.title, cardOrder: ids });
  }
  const ungrouped = byGroup.get('__ungrouped__');
  if (ungrouped && ungrouped.length) {
    groups.push({ id: '__ungrouped__', title: groups.length ? 'More' : 'The Gifts', cardOrder: ungrouped });
  }

  return {
    title: peek.recipientName
      ? `${peek.recipientName}${peek.occasion ? `’s ${peek.occasion}` : ''}`
      : (peek.occasion ?? 'A Peek for you'),
    subtitle: peek.occasion && peek.recipientName ? peek.occasion : null,
    heroImageUrl: peek.heroImageUrl,
    noteMd: peek.noteMd,
    signature: peek.giverNames?.length ? `— ${peek.giverNames.join(', ')}` : null,
    cards: renderCards,
    groups,
    cardOrder: sortedCards.map((c) => c.id),
  };
}

/**
 * Build a `RenderablePage` from a raw model `GenerationOutput` (the moat's
 * generation path) + already-resolved content. Runs `generateAndRepair` so the
 * vibe AND composition are validated/repaired (or SAFE_DEFAULT) before render —
 * this is the path the proof + future chat-loop use. `content` carries the
 * card data the section `cardRefs` point into.
 */
export function fromGeneration(
  rawOutput: unknown,
  content: PageContent,
): RenderablePage & { repairsApplied: number; usedSafeDefaultVibe: boolean } {
  const cardCount = content.cardOrder.length;
  const res = generateAndRepair(rawOutput, cardCount);
  const sections = res.page.ok
    ? res.page.value.sections
    : minimalLegalSections(content);
  return {
    vibe: res.vibe,
    composition: { vibe: res.vibe, sections },
    content,
    repairsApplied: res.repairsApplied.length,
    usedSafeDefaultVibe: res.usedSafeDefaultVibe,
  };
}

/**
 * Compose a legal page from content. Hero (focal) → optional story (the note)
 * → one productSet per card group (count-legal presentation) → cta → footer.
 * Runs through `generateAndRepair` so the output is guaranteed legal.
 */
export function composeSections(content: PageContent, vibe: Vibe): PageComposition {
  const sections: Section[] = [];

  // Hero — variant chosen from vibe imagery + presence of an image.
  const heroVariant = content.heroImageUrl
    ? vibe.imagery.treatment === 'full-bleed' || vibe.imagery.textOverImage
      ? 'full-bleed-image'
      : vibe.spatial.density === 'breathable'
        ? 'stacked-card'
        : 'split'
    : vibe.typography.displayRole === 'display'
      ? 'centered-type'
      : 'minimal-mark';
  sections.push({
    type: 'hero',
    variant: heroVariant,
    slots: {
      titleRef: 'title',
      subtitleRef: content.subtitle ? 'subtitle' : undefined,
      imageRef: content.heroImageUrl ? 'heroImage' : undefined,
    },
    emphasis: 'focal',
  });

  // Story — the note, if present.
  if (content.noteMd && content.noteMd.trim().length > 0) {
    const storyVariant =
      vibe.voice.length === 'punchy'
        ? 'banner'
        : vibe.typography.displayRole === 'serif'
          ? 'prose'
          : 'prose';
    sections.push({
      type: 'story',
      variant: storyVariant,
      slots: { bodyRef: 'noteMd' },
    });
  }

  // Product sets — one per group, with a label divider between groups.
  content.groups.forEach((g, i) => {
    if (i > 0) {
      sections.push({ type: 'divider', variant: 'label' });
    }
    sections.push({
      type: 'productSet',
      variant: presentationForCount(g.cardOrder.length),
      slots: { cardRefs: g.cardOrder, headingRef: `group:${g.id}` },
    });
  });

  // CTA.
  sections.push({
    type: 'cta',
    variant: vibe.spatial.density === 'compact' ? 'sticky-bar' : 'button-row',
    slots: { labelRef: 'cta:primary' },
  });

  // Footer.
  sections.push({
    type: 'footer',
    variant: content.signature ? 'signature' : 'minimal',
    slots: { signatureRef: content.signature ? 'signature' : undefined },
  });

  // Validate + repair the COMPOSITION only. The vibe is already validated
  // (its imported palette roles are preserved verbatim — we do NOT re-derive,
  // which would drop the curator's exact hex colors). R1–R8 + automaton +
  // card-count are enforced; unrepairable structure falls to a minimal page.
  const cardCount = content.cardOrder.length;
  const { result } = validatePageComposition({ vibe, sections }, cardCount);
  if (result.ok) {
    return { vibe, sections: result.value.sections };
  }
  return { vibe, sections: minimalLegalSections(content) };
}

/** A guaranteed-legal minimal composition (used when repair can't fix structure). */
function minimalLegalSections(content: PageContent): Section[] {
  const firstGroup = content.groups[0];
  const cardRefs = firstGroup ? firstGroup.cardOrder : content.cardOrder;
  return [
    {
      type: 'hero',
      variant: 'minimal-mark',
      slots: { titleRef: 'title' },
      emphasis: 'focal',
    },
    {
      type: 'productSet',
      variant: presentationForCount(cardRefs.length || 1),
      slots: { cardRefs: cardRefs.length ? cardRefs : [] },
    },
    { type: 'cta', variant: 'button-row', slots: { labelRef: 'cta:primary' } },
    { type: 'footer', variant: 'minimal', slots: {} },
  ];
}
