/**
 * In-app SSR proof route for the slug renderer.
 * ==============================================
 *
 * `/renderer-proof/princess` | `/bachelor` | `/luxe` | `/all`
 *
 * Renders the SAME example peek (hero + "The Drop" ×3 + "The Kit" ×2) through
 * the REAL `SlugRenderer` + grammar pipeline inside the actual Next app, so the
 * range is inspectable in-product (not just the standalone HTML in
 * scripts/proof-out). This is a dev/proof surface — not linked in nav, not on
 * the recipient path. It proves mount (b)/(a) parity: same renderer, server-
 * rendered, zero flash.
 */

import { notFound } from 'next/navigation';
import { SlugRenderer } from '@/components/renderer/slug-renderer';
import { buildPeekContent, fromGeneration } from '@/components/renderer/page-state';
import {
  PROOF_VIBES,
  type ProofVibeKey,
  examplePeek,
  exampleCards,
  exampleVariantGroups,
} from '@/lib/vibe/grammar/fixtures';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return [...Object.keys(PROOF_VIBES), 'all'].map((vibe) => ({ vibe }));
}

export default async function RendererProofPage({
  params,
}: {
  params: Promise<{ vibe: string }>;
}) {
  const { vibe } = await params;
  const content = buildPeekContent({
    peek: examplePeek,
    cards: exampleCards,
    variantGroups: exampleVariantGroups,
  });

  const keys: ProofVibeKey[] =
    vibe === 'all'
      ? (Object.keys(PROOF_VIBES) as ProofVibeKey[])
      : (PROOF_VIBES as Record<string, unknown>)[vibe]
        ? [vibe as ProofVibeKey]
        : [];

  if (keys.length === 0) notFound();

  return (
    <>
      {keys.map((key) => {
        const page = fromGeneration(PROOF_VIBES[key].output, content);
        return <SlugRenderer key={key} page={page} data-mount="proof" />;
      })}
    </>
  );
}
