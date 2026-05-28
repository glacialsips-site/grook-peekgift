/**
 * THE SLUG RENDERER — the single canonical renderer (the moat).
 * =============================================================
 *
 * ONE renderer, multiple mounts:
 *   (a) live build-preview behind the chat (rendered into the preview pane),
 *   (b) the published recipient page (`/g/[slug]`),
 *   (c) the OG/share image basis (the same vibe + content; see opengraph-image).
 *
 * Pure RSC. The validated vibe's `--vibe-*` vars are computed SERVER-SIDE
 * (`vibeStyle`) and spread into the wrapper `style`, so the very first paint
 * already carries the correct theme — zero flash, no client hydration for
 * theming. The composition (a legal `PageComposition`) is mapped to section
 * primitives; each reads only `var(--vibe-*)`.
 *
 * The renderer makes ZERO legality decisions: it receives a branded `Vibe` and
 * a validated composition. All safety happened upstream in the grammar engine.
 */

import * as React from 'react';
import { vibeStyle } from '@/lib/vibe/grammar';
import type { RenderablePage } from './page-state';
import { RenderSection } from './sections';
import { s } from './styles';

export function SlugRenderer({
  page,
  'data-mount': mount,
}: {
  page: RenderablePage;
  /** Which mount this is (preview | recipient). For diagnostics/data-attr only. */
  'data-mount'?: string;
}) {
  const { vibe, composition, content } = page;
  return (
    <div
      className={s.page}
      style={vibeStyle(vibe)}
      data-vibe-key={vibe.palette.key}
      data-mount={mount}
    >
      {composition.sections.map((section, i) => (
        <RenderSection key={sectionKey(section, i)} section={section} content={content} />
      ))}
    </div>
  );
}

function sectionKey(
  section: RenderablePage['composition']['sections'][number],
  i: number,
): string {
  if (section.type === 'productSet') {
    return `${section.type}:${section.slots.headingRef ?? i}`;
  }
  return `${section.type}:${i}`;
}
